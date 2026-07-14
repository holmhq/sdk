import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  CancelledError,
  createCancellationController,
  createReadonlyBytes,
  isReadonlyBytes,
} from "../../../src/core/index.js";
import {
  UploadError,
  composeResumableUpload,
  createReadonlyBytesUploadSource,
  createUploadFile,
  redactUploadChunk,
  redactUploadRequest,
  type ResumableUploadAdapter,
  type UploadChunk,
  type UploadCompletion,
  type UploadSession,
} from "../../../src/transports/index.js";
import { createNodeUploadFile } from "../../../src/node/index.js";
import { createWebUploadFile, createWebUploadSource, type WebUploadBlobLike } from "../../../src/web/index.js";

const uploadSourceCommit = "11ceae0d88e9c800eb77916e3244fbd231ad81bb";

test("upload composition reports acknowledged resumable progress and emits binary-safe diagnostics", async () => {
  const progress: Array<{ readonly loaded: number; readonly total: number; readonly percent: number }> = [];
  const chunkOffsets: number[] = [];
  let retried = false;
  const file = createUploadFile({
    field: "file",
    name: "hello.txt",
    type: "text/plain",
    source: createReadonlyBytesUploadSource(createReadonlyBytes([104, 101, 108, 108, 111])),
  });
  const request = {
    path: "/api/upload",
    fields: [{ name: "caption", value: "secret-caption" }],
    files: [file],
    onProgress: (event: { readonly loaded: number; readonly total: number; readonly percent: number }) => {
      progress.push(event);
    },
  };
  const adapter: ResumableUploadAdapter<{ readonly ok: true; readonly handoff: unknown }> = {
    async createSession(inputFile): Promise<UploadSession> {
      assert.equal(inputFile.name, "hello.txt");
      return { id: "upl_1", chunkSize: 2, receivedBytes: 0, nextOffset: 0 };
    },
    async uploadChunk(input): Promise<{ readonly nextOffset: number }> {
      chunkOffsets.push(input.offset);
      assert.equal(input.session.id, "upl_1");
      assert.equal(input.chunk.byteLength, input.chunk.body.byteLength);
      if (isReadonlyBytes(input.chunk.body)) {
        const copied = input.chunk.body.toUint8Array();
        copied[0] = 0;
      }
      if (input.offset === 2 && !retried) {
        retried = true;
        throw new Error("transient chunk failure containing hello should not enter diagnostics");
      }
      return { nextOffset: input.offset + input.chunk.byteLength };
    },
    async fetchStatus(): Promise<{ readonly nextOffset: number }> {
      return { nextOffset: 4 };
    },
    async completeSession(): Promise<UploadCompletion> {
      return { id: "upl_1", tempRef: "temp_1", name: "hello.txt", type: "text/plain", size: 5 };
    },
    async finalize(input) {
      assert.equal(input.path, "/api/upload");
      assert.deepEqual(input.fields, [{ name: "caption", value: "secret-caption" }]);
      const handoffFile = input.handoff.file;
      assert.ok(handoffFile);
      assert.equal(handoffFile.upload_id, "upl_1");
      assert.equal(handoffFile.temp_ref, "temp_1");
      assert.equal(handoffFile.size, 5);
      return { ok: true, handoff: input.handoff };
    },
  };

  const result = await composeResumableUpload(request, adapter);
  const diagnostic = redactUploadRequest(request);

  assert.deepEqual(result, {
    ok: true,
    handoff: {
      file: {
        upload_id: "upl_1",
        temp_ref: "temp_1",
        name: "hello.txt",
        type: "text/plain",
        size: 5,
      },
    },
  });
  assert.deepEqual(progress.map((event) => event.loaded), [0, 2, 4, 5]);
  assert.deepEqual(progress.map((event) => event.percent), [0, 40, 80, 100]);
  assert.deepEqual(chunkOffsets, [0, 2, 4]);
  assert.equal(JSON.stringify(diagnostic).includes("secret-caption"), false);
  assert.equal(JSON.stringify(diagnostic).includes("aGVsbG8="), false);
  assert.deepEqual(diagnostic.files, [{ field: "file", name: "hello.txt", type: "text/plain", size: 5 }]);
});

test("upload composition maps duplicate fields and caller aborts into typed failures", async () => {
  const source = createReadonlyBytesUploadSource([1, 2, 3]);
  const duplicate = createUploadFile({ field: "file", name: "one.bin", source });
  const conflict = createUploadFile({ field: "file", name: "two.bin", source });
  const inertAdapter: ResumableUploadAdapter = {
    async createSession(): Promise<UploadSession> {
      throw new Error("should not create sessions for invalid uploads");
    },
    async uploadChunk(): Promise<{ readonly nextOffset: number }> {
      throw new Error("should not upload chunks for invalid uploads");
    },
    async completeSession(): Promise<UploadCompletion> {
      throw new Error("should not complete invalid uploads");
    },
  };

  await assert.rejects(
    () => composeResumableUpload({ path: "/api/upload", files: [duplicate, conflict] }, inertAdapter),
    (error: unknown) => error instanceof UploadError && error.code === "upload_field_conflict",
  );

  const controller = createCancellationController();
  const abortingAdapter: ResumableUploadAdapter = {
    async createSession(): Promise<UploadSession> {
      return { id: "upl_abort", chunkSize: 2 };
    },
    async uploadChunk(): Promise<{ readonly nextOffset: number }> {
      controller.cancel("caller aborted");
      throw new Error("native abort");
    },
    async completeSession(): Promise<UploadCompletion> {
      throw new Error("should not complete aborted uploads");
    },
  };

  await assert.rejects(
    () => composeResumableUpload({ path: "/api/upload", files: [duplicate], signal: controller.signal }, abortingAdapter),
    (error: unknown) => error instanceof CancelledError && error.code === "operation_cancelled",
  );
});

test("upload web and node helper adapters are structural and avoid core ambient types", async () => {
  const blobSlices: Array<readonly [number, number, string | undefined]> = [];
  const blobLike: WebUploadBlobLike = {
    size: 5,
    type: "text/plain",
    slice(start, end, type) {
      blobSlices.push([start, end, type]);
      return { size: end - start, type: type ?? "text/plain" };
    },
  };

  const webFile = createWebUploadFile({ field: "asset", blob: blobLike, name: "web.txt" });
  const webChunk = await webFile.source.slice(1, 3);
  const nodeFile = createNodeUploadFile({ field: "asset", name: "node.bin", bytes: [7, 8, 9] });
  const nodeChunk: UploadChunk = await nodeFile.source.slice(0, 2);

  assert.equal(webFile.size, 5);
  assert.deepEqual(blobSlices, [[1, 3, "application/octet-stream"]]);
  assert.equal(webChunk.byteLength, 2);
  assert.equal(webChunk.body.size, 2);
  assert.equal(nodeFile.size, 3);
  assert.equal(isReadonlyBytes(nodeChunk.body), true);
  assert.equal(nodeChunk.byteLength, 2);
});

test("upload composition covers no-finalize handoff defaults and redacted chunk metadata", async () => {
  const file = createUploadFile({
    field: "asset",
    name: "asset.bin",
    source: createReadonlyBytesUploadSource([10, 11, 12]),
  });
  const adapter: ResumableUploadAdapter = {
    createSession() {
      return { id: "upl_default", receivedBytes: 1 };
    },
    uploadChunk(input) {
      assert.deepEqual(redactUploadChunk(input.chunk), { byteLength: 2 });
      return { receivedBytes: input.offset + input.chunk.byteLength };
    },
    completeSession() {
      return {};
    },
  };

  const handoff = await composeResumableUpload({ path: "/api/upload", files: [file] }, adapter);

  assert.deepEqual(handoff, {
    asset: {
      upload_id: "upl_default",
      name: "asset.bin",
      type: "application/octet-stream",
      size: 3,
    },
  });
});

test("upload composition exposes unavailable and stalled adapter failures without unsafe fallback", async () => {
  const file = createUploadFile({ field: "file", name: "file.bin", source: createReadonlyBytesUploadSource([1, 2]) });

  await assert.rejects(
    () => composeResumableUpload({ path: "/api/upload", files: [file] }, {
      createSession: () => ({ unavailable: true }),
      uploadChunk: () => ({ nextOffset: 2 }),
      completeSession: () => ({}),
    }),
    (error: unknown) => error instanceof UploadError && error.code === "upload_unavailable",
  );

  const directFailure = new Error("direct chunk failure");
  await assert.rejects(
    () => composeResumableUpload({ path: "/api/upload", files: [file] }, {
      createSession: () => ({ id: "upl_direct", chunkSize: 1 }),
      uploadChunk: () => {
        throw directFailure;
      },
      completeSession: () => ({}),
    }),
    directFailure,
  );

  const stalledFailure = new Error("stalled chunk failure");
  await assert.rejects(
    () => composeResumableUpload({ path: "/api/upload", files: [file] }, {
      createSession: () => ({ id: "upl_stalled", chunkSize: 1 }),
      uploadChunk: () => {
        throw stalledFailure;
      },
      fetchStatus: () => ({ nextOffset: 0 }),
      completeSession: () => ({}),
    }),
    stalledFailure,
  );
});

test("upload composition validates source shape offsets and request metadata", async () => {
  const validSource = createReadonlyBytesUploadSource([1, 2, 3]);

  assert.throws(() => createReadonlyBytesUploadSource([256]), /bytes/);
  assert.throws(() => validSource.slice(2, 1), /slice end/);
  assert.throws(() => createUploadFile({ field: " ", name: "x", source: validSource }), /upload field/);
  assert.throws(() => createUploadFile({ field: "x", name: " ", source: validSource }), /file name/);
  assert.throws(() => createUploadFile({ field: "x", name: "x", type: " ", source: validSource }), /content type/);
  assert.throws(() => redactUploadRequest({ path: " ", files: [] }), /path/);

  const badChunkFile = createUploadFile({
    field: "bad",
    name: "bad.bin",
    source: Object.freeze({
      byteLength: 2,
      slice: () => Object.freeze({ byteLength: 1, body: Object.freeze({ byteLength: 2 }) }),
    }),
  });
  await assert.rejects(
    () => composeResumableUpload({ path: "/api/upload", files: [badChunkFile] }, {
      createSession: () => ({ id: "upl_bad", chunkSize: 2 }),
      uploadChunk: () => ({ nextOffset: 2 }),
      completeSession: () => ({}),
    }),
    (error: unknown) => error instanceof UploadError && error.code === "upload_invalid_chunk",
  );

  await assert.rejects(
    () => composeResumableUpload({ path: "/api/upload", files: [createUploadFile({ field: "a", name: "a.bin", source: validSource })] }, {
      createSession: () => ({ id: "upl_offset", nextOffset: 4 }),
      uploadChunk: () => ({ nextOffset: 4 }),
      completeSession: () => ({}),
    }),
    (error: unknown) => error instanceof UploadError && error.code === "upload_invalid_offset",
  );

  await assert.rejects(
    () => composeResumableUpload({ path: "/api/upload", files: [createUploadFile({ field: "a", name: "a.bin", source: validSource })] }, {
      createSession: () => ({ id: "upl_chunk", chunkSize: 0 }),
      uploadChunk: () => ({ nextOffset: 1 }),
      completeSession: () => ({}),
    }),
    (error: unknown) => error instanceof UploadError && error.code === "upload_invalid_chunk_size",
  );
});

test("upload web helpers validate structural blob defaults and bounds", async () => {
  const zeroBlob: WebUploadBlobLike = {
    size: 0,
    slice: () => ({ size: 0 }),
  };
  const defaultFile = createWebUploadFile({ field: "file", blob: zeroBlob });

  assert.equal(defaultFile.name, "blob");
  assert.equal(defaultFile.type, "application/octet-stream");
  assert.throws(() => createWebUploadSource({ size: -1, slice: () => ({ size: 0 }) }), /size/);
  assert.throws(() => createWebUploadSource(zeroBlob, " "), /content type/);
  assert.throws(() => createWebUploadFile({ field: "file", blob: zeroBlob, type: " " }), /content type/);

  const source = createWebUploadSource({
    size: 3,
    type: "text/plain",
    slice: (start, end) => ({ size: end - start }),
  }, "text/plain");

  assert.throws(() => source.slice(4, 4), /exceeds/);
  assert.throws(() => source.slice(2, 1), /end/);
  assert.equal((await source.slice(0, 1)).body.type, "text/plain");
});

test("upload migration ledger pins Issue 005 behavior to Holm source without secrets", async () => {
  const ledger = await readFile("koder/evidence/001_issue005_transport_uploads/INDEX.md", "utf8");

  assert.match(ledger, new RegExp(uploadSourceCommit));
  assert.match(ledger, /packages\/holm-sdk\/client\.js/);
  assert.match(ledger, /adopted: resumable upload sessions/i);
  assert.match(ledger, /redesigned: DOM and XMLHttpRequest progress/i);
  assert.match(ledger, /deferred: app\/admin wrapper route migration/i);
  assert.equal(/holm_pat_upload\.[A-Za-z0-9_.-]+/.test(ledger), false);
});
