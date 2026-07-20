import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  HOLM_ADMIN_HTTP_CAPABILITY,
  adminMethodDescriptors,
  adminOperationProtocol,
  createAdminClient,
  createAdminExtension,
  type AdminApi,
  type AdminMethodDescriptor,
  type AdminUploadService,
} from "../../../src/admin/index.js";
import {
  createHolm,
  createReadonlyBytes,
  createStaticCallerProvider,
} from "../../../src/core/index.js";
import { createFakeClock, createInMemoryRuntimeAdapter } from "../../../src/test/index.js";
import {
  createReadonlyBytesUploadSource,
  createUploadFile,
} from "../../../src/transports/index.js";
import { webRuntime } from "../../../src/web/index.js";

test("admin extension exposes audited namespaces through the explicit admin capability", async () => {
  const fake = createFakeClock(10);
  const runtime = createInMemoryRuntimeAdapter({
    clock: fake.clock,
    scheduler: fake.scheduler,
    offers: [{
      id: HOLM_ADMIN_HTTP_CAPABILITY.id,
      origin: "runtime",
      version: { major: 1, minor: 0 },
    }],
  });
  const holm = createHolm({
    runtime,
    caller: createStaticCallerProvider({
      surface: "cli",
      principal: { kind: "operator", id: "operator_1" },
    }),
    extensions: [createAdminExtension({ requestId: (sequence) => `admin-test-${sequence}` })] as const,
  });

  await holm.admin.system.health();
  await holm.admin.apps.get({ path: { id: "app sales" } });
  await holm.admin.webhooks.create({ body: { name: "audit", endpoint: "https://hooks.example.test" } });

  assert.deepEqual(
    runtime.requests.map((request) => ({
      requestId: request.requestId,
      capability: request.capability.id,
      operation: request.operation,
      payload: {
        method: (request.payload as { readonly method: string }).method,
        url: (request.payload as { readonly url: string }).url,
        ...((request.payload as { readonly body?: unknown }).body === undefined
          ? {}
          : { body: (request.payload as { readonly body: unknown }).body }),
      },
    })),
    [
      {
        requestId: "admin-test-1",
        capability: "holm.http.admin",
        operation: "request",
        payload: { method: "GET", url: "/api/system/health" },
      },
      {
        requestId: "admin-test-2",
        capability: "holm.http.admin",
        operation: "request",
        payload: { method: "GET", url: "/api/apps/app%20sales" },
      },
      {
        requestId: "admin-test-3",
        capability: "holm.http.admin",
        operation: "request",
        payload: {
          body: { mode: "json", value: { endpoint: "https://hooks.example.test", name: "audit" } },
          method: "POST",
          url: "/api/webhooks",
        },
      },
    ],
  );
  await holm.dispose();
});

test("createAdminClient composes one explicit runtime and operator caller without ambient auth", async () => {
  const fixture = createAdminFixture();
  const client = createAdminClient({
    runtime: fixture.runtime,
    caller: createStaticCallerProvider({ surface: "cli", principal: { kind: "operator", id: "operator_2" } }),
  });

  await client.admin.system.status();
  assert.equal(fixture.runtime.requests[0]?.caller.principal.kind, "operator");
  await client.dispose();
});

test("web admin transport requires an explicit operator caller and preserves server authorization", async () => {
  const requests: Array<{ readonly url: string; readonly method: string }> = [];
  const runtimeOptions = {
    baseUrl: "https://admin.example.test/",
    cache: false as const,
    fetch: async (input: string | URL | Request, init: RequestInit = {}) => {
      requests.push({ url: String(input), method: init.method ?? "GET" });
      return new Response(JSON.stringify({ data: { healthy: true } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  };
  const operator = createHolm({
    runtime: webRuntime(runtimeOptions),
    caller: createStaticCallerProvider({ surface: "web", principal: { kind: "operator", id: "operator_1" } }),
    extensions: [createAdminExtension()] as const,
  });

  assert.deepEqual(await operator.admin.system.health(), { healthy: true });
  assert.deepEqual(requests, [{ url: "https://admin.example.test/api/system/health", method: "GET" }]);
  await operator.dispose();

  const member = createHolm({
    runtime: webRuntime(runtimeOptions),
    caller: createStaticCallerProvider({ surface: "web", principal: { kind: "member", id: "member_1" } }),
    extensions: [createAdminExtension()] as const,
  });
  await assert.rejects(
    () => member.admin.system.health(),
    /explicit operator caller context/,
  );
  await member.dispose();
});

test("generated admin inventory provides all 216 methods plus command, upload, binary, and URL behavior", async () => {
  const fake = createFakeClock(20);
  const runtime = createInMemoryRuntimeAdapter({
    clock: fake.clock,
    scheduler: fake.scheduler,
    offers: [{
      id: HOLM_ADMIN_HTTP_CAPABILITY.id,
      origin: "runtime",
      version: { major: 1, minor: 0 },
    }],
  });
  runtime.setHandler("holm.http.admin:request", (request) => {
    const payload = request.payload as {
      readonly url?: string;
      readonly params?: Readonly<Record<string, unknown>>;
    };
    if (payload.url?.includes("/attachment")) {
      const selector = payload.params?.attachment;
      const disposition = selector === 2
        ? "attachment; filename*=UTF-8''encoded%20receipt.txt"
        : selector === 3
          ? "attachment; filename*=UTF-8''bad%ZZ.txt"
          : "attachment; filename=receipt.txt";
      return {
        requestId: request.requestId,
        payload: createReadonlyBytes([1, 2, 3]),
        ...(selector === 4
          ? {}
          : {
              metadata: {
                status: 200,
                headers: {
                  "content-disposition": disposition,
                  "content-type": "text/plain",
                },
              },
            }),
      };
    }
    return { requestId: request.requestId, payload: request.payload };
  });
  const uploads: string[] = [];
  const file = createUploadFile({
    field: "file",
    name: "fixture.bin",
    source: createReadonlyBytesUploadSource(createReadonlyBytes([9])),
  });
  const holm = createHolm({
    runtime,
    caller: createStaticCallerProvider({ surface: "cli", principal: { kind: "operator" } }),
    extensions: [createAdminExtension({
      uploads: {
        upload(request) {
          uploads.push(request.path);
          return { upload_id: "upl_fixture", path: request.path };
        },
      },
    })] as const,
  });

  for (const generatedDescriptor of adminMethodDescriptors) {
    const descriptor: AdminMethodDescriptor = generatedDescriptor;
    assert.equal(typeof getMethod(holm.admin, descriptor.name), "function", descriptor.name);
    const path = pathValues(descriptor);
    const firstRoute = descriptor.routes[0];
    const input = {
      ...(Object.keys(path).length === 0 ? {} : { path }),
      ...(descriptor.command === undefined &&
        (firstRoute?.method === "POST" || firstRoute?.method === "PUT" || firstRoute?.method === "PATCH")
        ? { body: { fixture: descriptor.name } }
        : {}),
      ...(descriptor.command === undefined
        ? {}
        : descriptor.name === "system.cmd"
          ? { command: "fixture", args: ["run"] }
          : { args: ["fixture"] }),
      ...(descriptor.kind === "upload" || descriptor.kind === "composite-upload"
        ? { upload: { files: [file] } }
        : {}),
    };
    if (descriptor.kind === "url") {
      assert.match(holm.admin.invoke(generatedDescriptor.name, input) as string, /^\//);
    } else {
      await holm.admin.invoke(generatedDescriptor.name, input);
    }
  }

  const attachment = await holm.admin.email.receiptAttachment({
    path: { id: "receipt_1" },
    params: { attachment: 1 },
  });
  assert.deepEqual(attachment, {
    filename: "receipt.txt",
    content_type: "text/plain",
    data: createReadonlyBytes([1, 2, 3]),
  });
  assert.equal((await holm.admin.email.receiptAttachment<{ readonly filename: string }>({
    path: { id: "receipt_2" },
    params: { attachment: 2 },
  })).filename, "encoded receipt.txt");
  assert.equal((await holm.admin.email.receiptAttachment<{ readonly filename: string }>({
    path: { id: "receipt_3" },
    params: { attachment: 3 },
  })).filename, "bad%ZZ.txt");
  assert.deepEqual(await holm.admin.email.receiptAttachment({
    path: { id: "receipt_4" },
    params: { attachment: 4 },
  }), {
    filename: "",
    content_type: "",
    data: createReadonlyBytes([1, 2, 3]),
  });
  assert.equal(uploads.includes("/api/deploy"), true);
  assert.equal(uploads.includes("/auth/members/uploads"), true);
  assert.equal(uploads.includes("/api/apps/value%20id/links/import"), true);
  assert.equal(holm.admin.logs.streamUrl({ params: { follow: true, lines: 10 } }), "/api/system/logs/stream?follow=true&lines=10");
  assert.equal(adminOperationProtocol, "holm.sdk.admin-operation/1");
  assert.equal(holm.admin.methodNames.length, 216);
  assert.equal(holm.admin.describe("apps.get").routes[0]?.path, "/api/apps/{id}");
  assert.equal(Object.isFrozen(holm.admin), true);
  await holm.dispose();
});

test("admin methods fail closed for malformed routes, commands, uploads, and operation inputs", async () => {
  const withoutUploads = createAdminFixture();
  const upload = { files: [] };

  await assert.rejects(
    withoutUploads.holm.admin.deploy.upload({ upload }),
    /explicit upload service/,
  );
  await assert.rejects(
    async () => withoutUploads.holm.admin.invoke("system.cmd", {}),
    /system\.cmd command/,
  );
  await assert.rejects(
    async () => withoutUploads.holm.admin.invoke("system.cmd", { command: "peer", body: { unsafe: true } }),
    /command\/args rather than body/,
  );
  await assert.rejects(
    async () => withoutUploads.holm.admin.invoke("peer.list", { args: [""] }),
    /args\[0\]/,
  );
  assert.throws(
    () => withoutUploads.holm.admin.invoke("apps.get", {}),
    /requires path value/,
  );
  assert.throws(
    () => withoutUploads.holm.admin.invoke("apps.get", { path: { id: Number.NaN } }),
    /must be finite/,
  );
  assert.throws(
    () => withoutUploads.holm.admin.invoke("members.list", { route: "GET /missing" }),
    /does not map to authority route/,
  );
  assert.throws(
    () => withoutUploads.holm.admin.invoke("apps.list", [] as never),
    /plain object/,
  );
  assert.throws(
    () => withoutUploads.holm.admin.describe("missing.method" as never),
    /Unknown admin method/,
  );
  assert.equal(withoutUploads.holm.admin.logs.streamUrl({ params: { empty: null } }), "/api/system/logs/stream");
  await withoutUploads.holm.admin.apps.get({ path: { id: 42 } });
  await withoutUploads.holm.admin.members.list({ route: "GET /auth/members" });
  await withoutUploads.holm.admin.apps.list({ timeoutMs: 25 });
  await withoutUploads.holm.admin.apps.list({ timeoutMs: 25, control: { timeoutMs: 5 } });
  assert.equal(withoutUploads.runtime.controls.at(-2)?.timeoutMs, 25);
  assert.equal(withoutUploads.runtime.controls.at(-1)?.timeoutMs, 5);
  await withoutUploads.holm.dispose();

  const missingUpload = createAdminFixture({ upload: () => ({ upload_id: "upl_1" }) });
  await assert.rejects(
    async () => missingUpload.holm.admin.invoke("deploy.upload", {}),
    /input\.upload is required/,
  );
  await missingUpload.holm.dispose();

  const malformedUpload = createAdminFixture({ upload: () => ({}) });
  await assert.rejects(
    malformedUpload.holm.admin.members.createNativeWithPicture({ upload, body: {} }),
    /upload_id/,
  );
  await malformedUpload.holm.dispose();

  const validUpload = createAdminFixture({ upload: () => ({ upload_id: "upl_1" }) });
  await assert.rejects(
    validUpload.holm.admin.members.createNativeWithPicture({ upload, body: createReadonlyBytes([1]) }),
    /member create body must be an object/,
  );
  await assert.rejects(
    validUpload.holm.admin.members.createNativeWithPicture({
      upload,
      body: { persona: createReadonlyBytes([1]) },
    }),
    /member create persona must be an object/,
  );
  await validUpload.holm.dispose();
});

function createAdminFixture(uploads?: AdminUploadService) {
  const fake = createFakeClock(30);
  const runtime = createInMemoryRuntimeAdapter({
    clock: fake.clock,
    scheduler: fake.scheduler,
    offers: [{
      id: HOLM_ADMIN_HTTP_CAPABILITY.id,
      origin: "runtime",
      version: { major: 1, minor: 0 },
    }],
  });
  const holm = createHolm({
    runtime,
    caller: createStaticCallerProvider({ surface: "cli", principal: { kind: "operator" } }),
    extensions: [createAdminExtension(uploads === undefined ? {} : { uploads })] as const,
  });
  return { holm, runtime };
}

function getMethod(admin: AdminApi, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) =>
    typeof value === "object" && value !== null
      ? (value as Readonly<Record<string, unknown>>)[key]
      : undefined, admin);
}

function pathValues(descriptor: AdminMethodDescriptor): Readonly<Record<string, string>> {
  const values: Record<string, string> = {};
  for (const route of descriptor.routes) {
    for (const match of route.path.matchAll(/\{([A-Za-z0-9_]+)(?:\.\.\.)?\}/g)) {
      const name = match[1] as string;
      values[name] = name === "path" ? "folder/file.txt" : `value ${name}`;
    }
  }
  return values;
}
