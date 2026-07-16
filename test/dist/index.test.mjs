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
  CancelledError,
  CapabilityVersionError,
  HolmError,
  ProtocolError,
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
import {
  HOLM_APP_HTTP_CAPABILITY,
  WEB_HTTP_REQUEST_OPERATION,
  createWebSessionAuth,
  createWebUploadFile,
  webRuntime,
} from "../../dist/web/index.js";
import { createFakeClock, createInMemoryRuntimeAdapter } from "../../dist/test/index.js";
import {
  createDerivedResource,
  createMutationResource,
  createQueryResource,
  createRealtimeReconcileHook,
  createResourceController,
  createResourceHistory,
  REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY,
} from "../../dist/state/index.js";

function deferred() {
  let resolve;
  const promise = new Promise((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

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

test("generated ESM artifact exposes the Issue 007 web Fetch runtime", async () => {
  const calls = [];
  const runtime = webRuntime({
    baseUrl: "https://app.example.test/",
    fetch: async (input, init) => {
      calls.push({ input: String(input), init });
      return new Response('{"data":{"member":{"id":"member_dist"}}}', {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });
  const holm = createHolm({
    runtime,
    caller: createStaticCallerProvider({ surface: "web", principal: { kind: "browser-session" } }),
  });

  const response = await holm.invoke({
    capability: HOLM_APP_HTTP_CAPABILITY,
    operation: WEB_HTTP_REQUEST_OPERATION,
    payload: createTransportRequest({ method: "GET", url: "/api/me" }),
    requestId: "req-dist-web",
  });

  assert.deepEqual(response.payload, { member: { id: "member_dist" } });
  assert.equal(calls[0].input, "https://app.example.test/api/me");
  assert.equal(calls[0].init.credentials, "same-origin");
  await holm.dispose();
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

test("generated ESM artifact exposes S14 state query refresh and reset", async () => {
  let caller = { surface: "test", principal: { kind: "member", id: "alpha" } };
  const listeners = new Set();
  const query = createQueryResource({
    key: ["dist-query"],
    source: { id: "runtime-a", surface: "test" },
    caller: {
      current: () => caller,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    load: (context) => ({ owner: context.caller.principal.id, source: context.source.id }),
  });

  assert.deepEqual((await query.refresh()).data, { owner: "alpha", source: "runtime-a" });
  const stale = query.markStale();
  caller = { surface: "test", principal: { kind: "member", id: "beta" } };
  for (const listener of listeners) listener();
  const reset = query.getSnapshot();
  assert.equal(stale.stale, true);
  assert.equal(reset.phase, "loading");
  assert.equal("data" in reset, false);
  assert.deepEqual((await query.currentLoad()).data, { owner: "beta", source: "runtime-a" });
  assert.deepEqual((await query.reset({ source: { id: "runtime-b", surface: "test" } }).phase), "loading");
  assert.deepEqual((await query.currentLoad()).data, { owner: "beta", source: "runtime-b" });
});

test("generated ESM artifact exposes S16 derived resources and realtime reconcile hooks", async () => {
  const left = createResourceController();
  const right = createResourceController();
  left.setReady({ count: 1 });
  right.setReady({ count: 2 });
  const derived = createDerivedResource({
    dependencies: [left.resource, right.resource],
    derive: ([leftSnapshot, rightSnapshot]) => ({
      total: leftSnapshot.data.count + rightSnapshot.data.count,
    }),
  });
  const history = createResourceHistory(derived, { id: "dist-derived" });
  left.setReady({ count: 4 });

  const capabilities = createCapabilityRegistry([
    { id: REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY.id, version: { major: 1, minor: 0 }, origin: "runtime" },
  ]);
  const query = createQueryResource({
    key: ["dist-realtime"],
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    load: () => ({ version: 1, labels: ["load"] }),
  });
  const hook = createRealtimeReconcileHook({ query, capabilities });
  const reconciled = hook.handle({ kind: "reconcile", data: { version: 2, labels: ["event"] } });
  const invalidated = hook.handle({ kind: "invalidate", reason: "dist-broadcast" });

  assert.deepEqual(derived.getSnapshot().data, { total: 6 });
  assert.equal(history.getEntries().length, 1);
  assert.equal(hook.durable, false);
  assert.equal(hook.supports.privateChannels, false);
  assert.deepEqual(reconciled.data, { version: 2, labels: ["event"] });
  assert.equal(invalidated.stale, true);
});

test("generated ESM artifact exposes S15 state mutation optimistic invalidation", async () => {
  const invalidations = [];
  const mutation = createMutationResource({
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    optimistic: (payload) => ({ version: 0, label: payload.label }),
    execute: () => ({ version: 1, label: "server" }),
    invalidates: [{ tags: ["dist-mutation"] }],
    onInvalidate: (event) => invalidations.push(event),
  });

  const ready = await mutation.execute({ label: "draft" });

  assert.equal(ready.phase, "ready");
  assert.deepEqual(ready.data, { version: 1, label: "server" });
  assert.deepEqual(invalidations[0].invalidations, [{ tags: ["dist-mutation"] }]);

  const invalidationStarted = deferred();
  const invalidation = deferred();
  const cancellable = createMutationResource({
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    execute: () => ({ version: 2, label: "server" }),
    invalidates: [{ tags: ["dist-mutation"] }],
    onInvalidate: () => {
      invalidationStarted.resolve();
      return invalidation.promise;
    },
  });
  const pending = cancellable.execute({ label: "reset" });
  await invalidationStarted.promise;
  assert.equal(cancellable.reset().phase, "idle");
  invalidation.resolve();
  await assert.rejects(pending, CancelledError);
  assert.equal(cancellable.getSnapshot().phase, "idle");
});

test("generated ESM artifact exposes S13 state resource lifecycle", () => {
  const diagnostics = [];
  const controller = createResourceController({
    clock: { now: () => 77 },
    diagnostics: createDiagnosticsSink((event) => diagnostics.push(event)),
  });
  const phases = [];
  const unsubscribe = controller.resource.subscribe(() => {
    phases.push(controller.resource.getSnapshot().phase);
  });

  const source = { count: 1, labels: ["dist"] };
  const ready = controller.setReady(source);
  source.labels.push("mutated");
  controller.resource.subscribe(() => {
    throw new Error("dist secret should be redacted");
  });
  controller.setLoading({ refreshing: true, stale: true });
  controller.resource.dispose();
  unsubscribe();

  assert.equal(ready.phase, "ready");
  assert.equal(ready.updatedAt, 77);
  assert.deepEqual(ready.data, { count: 1, labels: ["dist"] });
  assert.equal(Object.isFrozen(ready.data.labels), true);
  assert.deepEqual(phases, ["ready", "loading", "disposed"]);
  assert.equal(controller.resource.getSnapshot().phase, "disposed");
  assert.equal(diagnostics[0].code, "state_resource_listener_error");
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

  runtime.setHandler("com.example.reports:mismatch", () => ({
    requestId: "req-dist-other",
    payload: { crossed: true },
  }));
  await assert.rejects(
    () =>
      holm.invoke({
        capability: { id: "com.example.reports", major: 1 },
        operation: "mismatch",
        payload: null,
        requestId: "req-dist-expected",
      }),
    (error) => error instanceof ProtocolError && error.code === "runtime_response_mismatch",
  );
  await holm.dispose();
});
