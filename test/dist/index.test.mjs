import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  canonicalEncodeWireValue,
  createCallerFingerprint,
  createCapabilityRegistry,
  createCoreEnvironment,
  createDiagnosticsSink,
  createExtensionLifecycle,
  createHolm,
  createStaticCallerProvider,
  createReadonlyBytes,
  CapabilityVersionError,
  HolmError,
  TimeoutError,
  runtimeEnvelopeProtocol,
  serializeHolmError,
} from "../../dist/index.js";
import {
  applyTransportAuth,
  createTransportCache,
  createTransportCacheKey,
  createTransportRequest,
  composeResumableUpload,
  createReadonlyBytesUploadSource,
  createUploadFile,
  decodeTransportResponse,
  redactAuthenticatedTransport,
  redactUploadRequest,
} from "../../dist/transports/index.js";
import { createNodeTokenAuth, createNodeUploadFile } from "../../dist/node/index.js";
import { createWebSessionAuth, createWebUploadFile } from "../../dist/web/index.js";
import { createFakeClock, createInMemoryRuntimeAdapter } from "../../dist/test/index.js";

test("generated ESM artifact exposes the S01 core fixture", () => {
  assert.equal(createCoreEnvironment(), "core");
});

test("generated ESM artifact exposes S04 wire values and errors", () => {
  const encoded = canonicalEncodeWireValue({
    bytes: createReadonlyBytes([1, 2, 3]),
    ok: true,
  });
  const error = new HolmError({
    kind: "serialization",
    code: "invalid_wire_value",
    message: "Invalid wire value",
    details: { token: "secret" },
  });

  assert.equal(encoded, '{"bytes":{"$holm":"bytes","base64":"AQID"},"ok":true}');
  assert.equal(serializeHolmError(error).details.token, "[redacted]");
});

test("generated ESM artifact exposes S05 capability negotiation", () => {
  const registry = createCapabilityRegistry([
    { id: "com.example.reports", origin: "runtime", version: { major: 1, minor: 0 } },
    { id: "com.example.reports", origin: "runtime", version: { major: 1, minor: 2 } },
  ]);

  assert.equal(registry.require({ id: "com.example.reports", major: 1, minMinor: 1 }).version.minor, 2);
  assert.throws(
    () => registry.require({ id: "com.example.reports", major: 2 }),
    CapabilityVersionError,
  );
});

test("generated ESM artifact exposes S06 runtime invocation caller helpers", async () => {
  const caller = createStaticCallerProvider({ surface: "test", principal: { kind: "anonymous" } });
  const first = await caller.current();
  const second = await caller.current();

  assert.equal(runtimeEnvelopeProtocol, "holm.sdk.runtime/1");
  assert.equal(createCallerFingerprint(first), createCallerFingerprint(second));
  assert.notEqual(first, second);
});

test("generated ESM artifact exposes S07 extension lifecycle", async () => {
  const effects = [];
  const lifecycle = createExtensionLifecycle(
    [
      {
        id: "com.example.reports",
        namespace: "reports",
        version: { major: 1, minor: 0 },
        setup() {
          return {
            api: { list: () => ["ready"] },
            start: () => {
              effects.push("start");
            },
            dispose: () => {
              effects.push("dispose");
            },
          };
        },
      },
    ],
    { capabilities: createCapabilityRegistry([]) },
  );

  assert.equal(Object.isFrozen(lifecycle.namespaces.reports), true);
  await lifecycle.start();
  await lifecycle.dispose();
  assert.deepEqual(effects, ["start", "dispose"]);
});

test("generated ESM artifact exposes S09 transport auth and error contracts", async () => {
  const request = createTransportRequest({
    method: "POST",
    url: "/api/reports",
    body: { mode: "json", value: { ok: true } },
    responseMode: "json",
  });
  const nodeAuth = createNodeTokenAuth({ token: "dist-secret" });
  const webAuth = createWebSessionAuth({ credentials: "include" });
  const authenticated = await applyTransportAuth(request, nodeAuth);
  const webAuthenticated = await applyTransportAuth(request, webAuth);
  const decoded = decodeTransportResponse({
    requestId: "req-dist-transport",
    status: 200,
    body: '{"ok":true}',
    responseMode: "json",
  });

  assert.equal(authenticated.request.headers.authorization, "Bearer dist-secret");
  assert.equal(JSON.stringify(redactAuthenticatedTransport(authenticated)).includes("dist-secret"), false);
  assert.equal(webAuthenticated.privateProof.credentials, "include");
  assert.deepEqual(decoded.payload, { ok: true });
});

test("generated ESM artifact exposes S12 upload seam helpers", async () => {
  const progress = [];
  const file = createUploadFile({
    field: "file",
    name: "dist.txt",
    type: "text/plain",
    source: createReadonlyBytesUploadSource(createReadonlyBytes([1, 2, 3])),
  });
  const adapter = {
    createSession() {
      return { id: "upl_dist", chunkSize: 2 };
    },
    uploadChunk(input) {
      return { nextOffset: input.offset + input.chunk.byteLength };
    },
    completeSession() {
      return { id: "upl_dist", tempRef: "tmp_dist", name: "dist.txt", type: "text/plain", size: 3 };
    },
  };
  const handoff = await composeResumableUpload(
    { path: "/api/upload", files: [file], onProgress: (event) => progress.push(event.loaded) },
    adapter,
  );
  const nodeUpload = createNodeUploadFile({ field: "node", name: "node.bin", bytes: [4, 5] });
  const webUpload = createWebUploadFile({
    field: "web",
    name: "web.bin",
    blob: { size: 2, type: "application/octet-stream", slice: (start, end, type) => ({ size: end - start, type }) },
  });

  assert.equal(handoff.file.upload_id, "upl_dist");
  assert.deepEqual(progress, [0, 2, 3]);
  assert.equal(redactUploadRequest({ path: "/api/upload", fields: [{ name: "caption", value: "secret" }], files: [file] }).fields[0].value, "[redacted]");
  assert.equal(nodeUpload.size, 2);
  assert.equal(webUpload.size, 2);
});

test("generated ESM artifact exposes S11 cache invalidation and diagnostics", async () => {
  const fake = createFakeClock();
  const diagnostics = [];
  const cache = createTransportCache({
    clock: fake.clock,
    scheduler: fake.scheduler,
    maxEntries: 2,
    diagnostics: createDiagnosticsSink((event) => {
      diagnostics.push(event);
    }),
  });
  const request = createTransportRequest({ method: "GET", url: "/api/cache", responseMode: "json" });
  const partition = { source: { id: "runtime-test", surface: "test" }, callerFingerprint: "caller:v1:dist" };
  let loads = 0;

  const key = createTransportCacheKey({ partition, request });
  const first = await cache.getOrLoad(
    { partition, request, policy: { ttlMs: 100, swrMs: 25 }, tags: ["dist"] },
    () => ({ requestId: "req-cache", payload: { loads: (loads += 1) } }),
  );
  const second = await cache.getOrLoad(
    { partition, request, policy: { ttlMs: 100, swrMs: 25 }, tags: ["dist"] },
    () => ({ requestId: "req-cache-2", payload: { loads: (loads += 1) } }),
  );
  const invalidated = cache.invalidateForMutation({ partition, tags: ["dist"] });

  assert.equal(key.startsWith("cache:v1:"), true);
  assert.deepEqual(first.payload, { loads: 1 });
  assert.deepEqual(second.payload, { loads: 1 });
  assert.equal(invalidated.removed, 1);
  assert.equal(diagnostics.some((event) => event.code === "transport_cache_update"), true);
  assert.equal(diagnostics.some((event) => event.code === "transport_cache_invalidate"), true);
});

test("generated ESM artifact exposes S08 createHolm lifecycle fakes", async () => {
  const fake = createFakeClock(7);
  const runtime = createInMemoryRuntimeAdapter({
    clock: fake.clock,
    scheduler: fake.scheduler,
    offers: [{ id: "com.example.reports", origin: "runtime", version: { major: 1, minor: 0 } }],
  });
  const holm = createHolm({
    runtime,
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
  });

  await holm.start();
  const response = await holm.invoke({
    capability: { id: "com.example.reports", major: 1 },
    operation: "list",
    payload: { ok: true },
    requestId: "req-dist",
  });

  assert.equal(holm.lifecycle.state, "ready");
  assert.deepEqual(response.payload, { ok: true });
  assert.equal(runtime.requests[0].caller.startedAt, 7);
  assert.equal(new TimeoutError({ timeoutMs: 1 }).code, "operation_timeout");
});
