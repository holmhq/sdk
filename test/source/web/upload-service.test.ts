import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createAppExtension } from "../../../src/app/index.js";
import { ProtocolError, createCancellationController, createHolm } from "../../../src/core/index.js";
import { TransportError, UploadError, type UploadProgressEvent } from "../../../src/transports/index.js";
import {
  createWebApp,
  createWebCaller,
  createWebUploadFile,
  createWebUploadService,
  webRuntime,
} from "../../../src/web/index.js";

test("web upload service uses resumable Fetch sessions and acknowledged progress", async () => {
  const calls: Array<{
    readonly method: string;
    readonly path: string;
    readonly body: RequestInit["body"];
    readonly credentials: RequestInit["credentials"];
  }> = [];
  const fixtureFetch: typeof fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    calls.push({
      method: init.method ?? "GET",
      path: `${url.pathname}${url.search}`,
      body: init.body,
      credentials: init.credentials,
    });
    if (url.pathname === "/api/uploads" && init.method === "POST") {
      return jsonResponse({ id: "upl_1", chunk_size: 2, next_offset: 0 });
    }
    if (url.pathname === "/api/uploads/upl_1/chunk") {
      const offset = Number(url.searchParams.get("offset"));
      const size = init.body instanceof Blob ? init.body.size : 0;
      return jsonResponse({ next_offset: offset + size });
    }
    if (url.pathname === "/api/uploads/upl_1/complete") {
      return jsonResponse({
        id: "upl_1",
        temp_ref: "tmp_1",
        name: "report.txt",
        mime_type: "text/plain",
        size_bytes: 3,
      });
    }
    if (url.pathname === "/api/upload") {
      const form = init.body as FormData;
      return jsonResponse({
        caption: form.get("caption"),
        handoff: JSON.parse(String(form.get("__holm_uploads"))),
      });
    }
    throw new Error(`Unexpected upload request: ${init.method} ${url.pathname}`);
  };
  const uploadService = createWebUploadService({
    baseUrl: "https://app.example.test/",
    fetch: fixtureFetch,
  });
  const holm = createHolm({
    runtime: webRuntime({ baseUrl: "https://app.example.test/", fetch: fixtureFetch }),
    caller: createWebCaller({ appId: "app_sales", origin: "https://app.example.test" }),
    extensions: [createAppExtension({ uploads: uploadService })] as const,
  });
  const progress: number[] = [];
  const file = createWebUploadFile({
    field: "file",
    name: "report.txt",
    type: "text/plain",
    blob: new Blob([Uint8Array.from([1, 2, 3])], { type: "text/plain" }),
  });

  const result = await holm.app.upload<{
    readonly caption: string;
    readonly handoff: { readonly file: { readonly upload_id: string; readonly size: number } };
  }>({
    path: "/api/upload",
    fields: [{ name: "caption", value: "Quarterly" }],
    files: [file],
    onProgress: (event: UploadProgressEvent) => progress.push(event.loaded),
  });

  assert.deepEqual(progress, [0, 2, 3]);
  assert.deepEqual(result, {
    caption: "Quarterly",
    handoff: {
      file: {
        upload_id: "upl_1",
        temp_ref: "tmp_1",
        name: "report.txt",
        type: "text/plain",
        size: 3,
      },
    },
  });
  assert.deepEqual(calls.map((call) => `${call.method} ${call.path}`), [
    "POST /api/uploads",
    "PUT /api/uploads/upl_1/chunk?offset=0",
    "PUT /api/uploads/upl_1/chunk?offset=2",
    "POST /api/uploads/upl_1/complete",
    "POST /api/upload",
  ]);
  assert.equal(calls.every((call) => call.credentials === "same-origin"), true);
  assert.equal(calls[1]?.body instanceof Blob, true);
  assert.equal(calls[2]?.body instanceof Blob, true);
  assert.equal(calls[4]?.body instanceof FormData, true);
  await holm.dispose();
});

test("web upload service isolates unavailable resumable routes behind multipart fallback", async () => {
  const calls: Array<{ readonly method: string; readonly path: string; readonly body: RequestInit["body"] }> = [];
  const fixtureFetch: typeof fetch = async (input, init = {}) => {
    const url = new URL(String(input), "https://app.example.test/");
    calls.push({ method: init.method ?? "GET", path: url.pathname, body: init.body });
    if (url.pathname === "/api/uploads") {
      return jsonResponse({ code: "missing" }, 404);
    }
    const form = init.body as FormData;
    const uploaded = form.get("file");
    return jsonResponse({
      caption: form.get("caption"),
      fileName: uploaded instanceof File ? uploaded.name : null,
      fileSize: uploaded instanceof Blob ? uploaded.size : null,
    });
  };
  const service = createWebUploadService({ fetch: fixtureFetch });
  const progress: number[] = [];
  const file = createWebUploadFile({
    field: "file",
    name: "fallback.txt",
    blob: new Blob(["fallback"], { type: "text/plain" }),
  });

  const result = await service.upload({
    path: "/api/import",
    fields: [{ name: "caption", value: "Fallback" }],
    files: [file],
    onProgress: (event: UploadProgressEvent) => progress.push(event.loaded),
  });

  assert.deepEqual(result, { caption: "Fallback", fileName: "fallback.txt", fileSize: 8 });
  assert.deepEqual(progress, [0, 8]);
  assert.equal(service.progressMode, "acknowledged-resumable+coarse-multipart-fallback");
  assert.deepEqual(calls.map((call) => `${call.method} ${call.path}`), [
    "POST /api/uploads",
    "POST /api/import",
  ]);
  assert.equal(calls[1]?.body instanceof FormData, true);
});

test("web upload service resumes acknowledged chunks and supports explicit bearer auth", async () => {
  const methods: string[] = [];
  const authorization: string[] = [];
  let firstChunk = true;
  const fixtureFetch: typeof fetch = async (input, init = {}) => {
    const url = new URL(String(input), "https://app.example.test/");
    methods.push(`${init.method} ${url.pathname}${url.search}`);
    authorization.push(new Headers(init.headers).get("authorization") ?? "");
    if (url.pathname === "/api/uploads") {
      return jsonResponse({ id: "upl_resume", chunkSize: 2, receivedBytes: 0 });
    }
    if (url.pathname.endsWith("/chunk") && firstChunk) {
      firstChunk = false;
      throw new Error("connection interrupted");
    }
    if (url.pathname === "/api/uploads/upl_resume" && init.method === "GET") {
      return jsonResponse({ received_bytes: 2 });
    }
    if (url.pathname.endsWith("/chunk")) {
      return jsonResponse({ receivedBytes: 3 });
    }
    if (url.pathname.endsWith("/complete")) {
      return jsonResponse({
        uploadId: "upl_resume",
        tempRef: "tmp_resume",
        name: "resume.bin",
        mimeType: "application/octet-stream",
        sizeBytes: 3,
      });
    }
    return new Response(null, { status: 204 });
  };
  const service = createWebUploadService({
    fetch: fixtureFetch,
    auth: { current: () => ({ kind: "bearer", scheme: "Token", token: "upload-secret" }) },
  });
  const progress: number[] = [];
  const result = await service.upload({
    path: "/api/finalize",
    files: [createWebUploadFile({
      field: "file",
      name: "resume.bin",
      blob: new Blob([Uint8Array.from([1, 2, 3])]),
    })],
    onProgress: (event: UploadProgressEvent) => progress.push(event.loaded),
  });

  assert.equal(result, null);
  assert.deepEqual(progress, [0, 2, 3]);
  assert.deepEqual(methods, [
    "POST /api/uploads",
    "PUT /api/uploads/upl_resume/chunk?offset=0",
    "GET /api/uploads/upl_resume",
    "PUT /api/uploads/upl_resume/chunk?offset=2",
    "POST /api/uploads/upl_resume/complete",
    "POST /api/finalize",
  ]);
  assert.equal(authorization.every((value) => value === "Token upload-secret"), true);
});

test("web link imports invalidate cached link reads for the same app client", async () => {
  let listCalls = 0;
  const fixtureFetch: typeof fetch = async (input, init = {}) => {
    const url = new URL(String(input), "https://app.example.test/");
    if (url.pathname === "/api/apps/app_sales/links" && init.method === "GET") {
      listCalls += 1;
      return jsonResponse({ items: [`list-${listCalls}`] });
    }
    if (url.pathname === "/api/uploads") {
      return jsonResponse({ code: "missing" }, 404);
    }
    if (url.pathname === "/api/apps/app_sales/links/import") {
      return jsonResponse({ imported: true });
    }
    throw new Error(`Unexpected request: ${init.method} ${url.pathname}`);
  };
  const app = createWebApp({
    runtime: { baseUrl: "https://app.example.test/", fetch: fixtureFetch },
    navigation: false,
  });
  const file = createWebUploadFile({
    field: "file",
    name: "import.txt",
    blob: new Blob(["import"], { type: "text/plain" }),
  });

  assert.deepEqual(await app.app.links.list("app_sales"), { items: ["list-1"] });
  assert.deepEqual(await app.app.links.import("app_sales", { files: [file] }), { imported: true });
  assert.deepEqual(await app.app.links.list("app_sales"), { items: ["list-2"] });
  assert.equal(listCalls, 2);
  await app.dispose();
});

test("web upload service validates configuration, cancellation, blobs, and Holm responses", async () => {
  assert.throws(() => createWebUploadService({ baseUrl: "relative" }), /baseUrl/);

  let crossOriginAuthCalls = 0;
  let crossOriginFetchCalls = 0;
  const crossOrigin = createWebUploadService({
    baseUrl: "https://app.example.test/",
    auth: {
      current() {
        crossOriginAuthCalls += 1;
        return { kind: "bearer", scheme: "Bearer", token: "upload-cross-origin-secret" };
      },
    },
    fetch: async () => {
      crossOriginFetchCalls += 1;
      return jsonResponse({ unexpected: true });
    },
  });
  await assert.rejects(
    () => crossOrigin.upload({
      path: "https://evil.example/import",
      files: [createWebUploadFile({ field: "file", blob: new Blob(["x"]) })],
    }),
    (error: unknown) => error instanceof ProtocolError && error.code === "web_cross_origin_request",
  );
  assert.equal(crossOriginAuthCalls, 0);
  assert.equal(crossOriginFetchCalls, 0);

  const locationDescriptor = Object.getOwnPropertyDescriptor(globalThis, "location");
  try {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { href: "https://app.example.test/root/" },
    });
    const mixedOrigin = createWebUploadService({
      auth: {
        current() {
          crossOriginAuthCalls += 1;
          return { kind: "bearer", scheme: "Bearer", token: "mixed-secret" };
        },
      },
      fetch: async () => {
        crossOriginFetchCalls += 1;
        return jsonResponse({ unexpected: true });
      },
    });
    await assert.rejects(
      () => mixedOrigin.upload({
        path: "/\\evil.example/import",
        files: [createWebUploadFile({ field: "file", blob: new Blob(["x"]) })],
      }),
      (error: unknown) => error instanceof ProtocolError && error.code === "web_cross_origin_request",
    );
  } finally {
    if (locationDescriptor === undefined) {
      Reflect.deleteProperty(globalThis, "location");
    } else {
      Object.defineProperty(globalThis, "location", locationDescriptor);
    }
  }
  assert.equal(crossOriginAuthCalls, 0);
  assert.equal(crossOriginFetchCalls, 0);

  const fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  try {
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: undefined, writable: true });
    assert.throws(() => createWebUploadService(), /Fetch implementation/);
  } finally {
    if (fetchDescriptor === undefined) {
      Reflect.deleteProperty(globalThis, "fetch");
    } else {
      Object.defineProperty(globalThis, "fetch", fetchDescriptor);
    }
  }

  const cancellation = createCancellationController();
  cancellation.cancel("cancelled-before-upload");
  let cancelledFetches = 0;
  const cancelled = createWebUploadService({
    fetch: async () => {
      cancelledFetches += 1;
      return jsonResponse({});
    },
  });
  await assert.rejects(
    () => cancelled.upload({
      path: "/api/upload",
      files: [createWebUploadFile({ field: "file", blob: new Blob(["x"]) })],
      signal: cancellation.signal,
    }),
    /cancelled/i,
  );
  assert.equal(cancelledFetches, 0);

  const invalidSession = createWebUploadService({ fetch: async () => jsonResponse({ id: "", chunk_size: -1 }) });
  await assert.rejects(
    () => invalidSession.upload({
      path: "/api/upload",
      files: [createWebUploadFile({ field: "file", blob: new Blob(["x"]) })],
    }),
    (error: unknown) => error instanceof UploadError && error.code === "invalid_web_upload_response",
  );

  const invalidNumber = createWebUploadService({ fetch: async () => jsonResponse({ id: "upl_bad", chunk_size: -1 }) });
  await assert.rejects(
    () => invalidNumber.upload({
      path: "/api/upload",
      files: [createWebUploadFile({ field: "file", blob: new Blob(["x"]) })],
    }),
    (error: unknown) => error instanceof UploadError && error.code === "invalid_web_upload_response",
  );
  const invalidShape = createWebUploadService({ fetch: async () => jsonResponse("not-an-object") });
  await assert.rejects(
    () => invalidShape.upload({
      path: "/api/upload",
      files: [createWebUploadFile({ field: "file", blob: new Blob(["x"]) })],
    }),
    (error: unknown) => error instanceof UploadError && error.code === "invalid_web_upload_response",
  );

  const structuralBlob = createWebUploadFile({
    field: "file",
    blob: {
      size: 1,
      type: "application/octet-stream",
      slice: () => ({ size: 1, type: "application/octet-stream" }),
    },
  });
  const blobRequired = createWebUploadService({
    fetch: async (input) => {
      const path = new URL(String(input), "https://app.example.test/").pathname;
      return path === "/api/uploads"
        ? jsonResponse({ id: "upl_blob", chunk_size: 1 })
        : jsonResponse({ next_offset: 1 });
    },
  });
  await assert.rejects(
    () => blobRequired.upload({ path: "/api/upload", files: [structuralBlob] }),
    (error: unknown) => error instanceof UploadError && error.code === "web_upload_blob_required",
  );

  const authFailure = createWebUploadService({
    auth: { current: () => { throw new Error("auth secret"); } },
    fetch: async () => jsonResponse({}),
  });
  await assert.rejects(
    () => authFailure.upload({
      path: "/api/upload",
      files: [createWebUploadFile({ field: "file", blob: new Blob(["x"]) })],
    }),
    (error: unknown) => error instanceof TransportError && !JSON.stringify(error.toJSON()).includes("auth secret"),
  );

  const unavailableButForbidden = createWebUploadService({
    fetch: async () => jsonResponse({ error: "denied" }, 500),
  });
  await assert.rejects(
    () => unavailableButForbidden.upload({
      path: "/api/upload",
      files: [createWebUploadFile({ field: "file", blob: new Blob(["x"]) })],
    }),
    (error: unknown) => !(error instanceof UploadError),
  );
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
