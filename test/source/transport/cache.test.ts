import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  createCallerPartitionedCacheKey,
  type OperationResponse,
  type WireValue,
} from "../../../src/core/index.js";
import { createFakeClock } from "../../../src/test/index.js";
import {
  canonicalTransportKey,
  createTransportCache,
  createTransportCacheKey,
  createTransportRequest,
  redactTransportRequest,
  type TransportCachePartition,
  type TransportCachePolicy,
} from "../../../src/transports/index.js";

const partition = Object.freeze({
  source: Object.freeze({ id: "runtime-a", surface: "test" as const }),
  callerFingerprint: "caller:v1:alpha",
}) satisfies TransportCachePartition;
const policy = Object.freeze({ ttlMs: 100, swrMs: 50 }) satisfies TransportCachePolicy;

function response(requestId: string, payload: WireValue): OperationResponse {
  return Object.freeze({ requestId, payload });
}

function request(url = "/api/reports", params: Readonly<Record<string, string>> = {}) {
  return createTransportRequest({ method: "GET", url, params, responseMode: "json" });
}

test("transport cache keys are deterministic, caller/source partitioned, and GET only", () => {
  const first = createTransportCacheKey({
    partition,
    request: request("/api/reports", { b: "two", a: "one" }),
  });
  const second = createTransportCacheKey({
    partition,
    request: request("/api/reports", { a: "one", b: "two" }),
  });
  const differentCaller = createTransportCacheKey({
    partition: { ...partition, callerFingerprint: "caller:v1:beta" },
    request: request("/api/reports", { a: "one", b: "two" }),
  });
  const differentSource = createTransportCacheKey({
    partition: { ...partition, source: { id: "runtime-b", surface: "test" } },
    request: request("/api/reports", { a: "one", b: "two" }),
  });

  assert.equal(first, second);
  assert.notEqual(first, differentCaller);
  assert.notEqual(first, differentSource);
  assert.equal(first.includes("authorization"), false);
  assert.throws(
    () => createTransportCacheKey({ partition, request: createTransportRequest({ method: "POST", url: "/api/reports" }) }),
    /GET/,
  );
  assert.throws(
    () =>
      createTransportCacheKey({
        partition,
        request: createTransportRequest({ method: "GET", url: "/api/reports", body: { mode: "json", value: {} } }),
      }),
    /body/,
  );
});

test("transport cache identity and diagnostics structurally protect sensitive URL, params, and headers", () => {
  const firstRequest = createTransportRequest({
    method: "GET",
    url: "/api/invitations/path-secret-a",
    params: { access: "query-secret-a", visible: "kept" },
    headers: { "x-holm-proof": "header-secret-a", "x-trace": "trace-1" },
    sensitive: { url: true, params: ["access"], headers: ["x-holm-proof"] },
  });
  const secondRequest = createTransportRequest({
    method: "GET",
    url: "/api/invitations/path-secret-b",
    params: { access: "query-secret-b", visible: "kept" },
    headers: { "x-holm-proof": "header-secret-b", "x-trace": "trace-1" },
    sensitive: { url: true, params: ["access"], headers: ["x-holm-proof"] },
  });
  const first = createTransportCacheKey({ partition, request: firstRequest });
  const second = createTransportCacheKey({ partition, request: secondRequest });
  const diagnostic = redactTransportRequest(firstRequest);
  const serialized = JSON.stringify({ first, canonical: canonicalTransportKey(firstRequest), diagnostic });

  assert.notEqual(first, second);
  assert.equal(serialized.includes("path-secret-a"), false);
  assert.equal(serialized.includes("query-secret-a"), false);
  assert.equal(serialized.includes("header-secret-a"), false);
  assert.equal(diagnostic.url, "[redacted]");
  assert.deepEqual(diagnostic.params, { access: "[redacted]", visible: "kept" });
  assert.deepEqual(diagnostic.headers, { "x-holm-proof": "[redacted]", "x-trace": "trace-1" });

  const opaqueCoreKey = createCallerPartitionedCacheKey({
    source: { id: "runtime-a" },
    callerFingerprint: "caller:v1:alpha",
    operation: { token: "core-operation-secret" },
  });
  assert.equal(opaqueCoreKey.includes("core-operation-secret"), false);
});

test("transport cache serves fresh immutable copies and partitions by caller and runtime source", async () => {
  const fake = createFakeClock();
  const cache = createTransportCache({ clock: fake.clock, scheduler: fake.scheduler, maxEntries: 4 });
  let loads = 0;
  const load = async () => response(`req-${loads + 1}`, { count: (loads += 1), nested: { label: "fresh" } });

  const first = await cache.getOrLoad({ partition, request: request(), policy }, load);
  const second = await cache.getOrLoad({ partition, request: request(), policy }, load);
  const callerSplit = await cache.getOrLoad(
    { partition: { ...partition, callerFingerprint: "caller:v1:beta" }, request: request(), policy },
    load,
  );
  const sourceSplit = await cache.getOrLoad(
    { partition: { ...partition, source: { id: "runtime-b", surface: "test" } }, request: request(), policy },
    load,
  );

  assert.equal(loads, 3);
  assert.notEqual(first, second);
  assert.deepEqual(second.payload, { count: 1, nested: { label: "fresh" } });
  assert.deepEqual(callerSplit.payload, { count: 2, nested: { label: "fresh" } });
  assert.deepEqual(sourceSplit.payload, { count: 3, nested: { label: "fresh" } });
  assert.equal(Object.isFrozen(second.payload), true);
  assert.throws(() => ((second.payload as { count: number }).count = 99), /read only|Cannot assign/);
});

test("transport cache deduplicates in-flight loads and evicts least-recently-used entries", async () => {
  const fake = createFakeClock();
  const cache = createTransportCache({ clock: fake.clock, scheduler: fake.scheduler, maxEntries: 2 });
  let resolveFirst: ((value: OperationResponse) => void) | undefined;
  let loads = 0;
  const pending = new Promise<OperationResponse>((resolve) => {
    resolveFirst = resolve;
  });
  const firstLoad = () => {
    loads += 1;
    return pending;
  };

  const first = cache.getOrLoad({ partition, request: request("/api/a"), policy }, firstLoad);
  const second = cache.getOrLoad({ partition, request: request("/api/a"), policy }, firstLoad);
  assert.equal(loads, 1);
  resolveFirst?.(response("req-a", { item: "a" }));
  assert.deepEqual((await Promise.all([first, second])).map((item) => item.payload), [{ item: "a" }, { item: "a" }]);

  await cache.getOrLoad({ partition, request: request("/api/b"), policy }, async () => response("req-b", { item: "b" }));
  await cache.getOrLoad({ partition, request: request("/api/a"), policy }, async () => response("req-a2", { item: "a2" }));
  await cache.getOrLoad({ partition, request: request("/api/c"), policy }, async () => response("req-c", { item: "c" }));
  const reloadedB = await cache.getOrLoad(
    { partition, request: request("/api/b"), policy },
    async () => response("req-b2", { item: "b2" }),
  );
  const cachedC = await cache.getOrLoad(
    { partition, request: request("/api/c"), policy },
    async () => response("req-c2", { item: "c2" }),
  );
  const reloadedA = await cache.getOrLoad(
    { partition, request: request("/api/a"), policy },
    async () => response("req-a3", { item: "a3" }),
  );

  assert.deepEqual(reloadedB.payload, { item: "b2" });
  assert.deepEqual(cachedC.payload, { item: "c" });
  assert.deepEqual(reloadedA.payload, { item: "a3" });
});

test("transport cache applies TTL and SWR with observable background refresh failures", async () => {
  const fake = createFakeClock();
  const backgroundErrors: unknown[] = [];
  const cache = createTransportCache({
    clock: fake.clock,
    scheduler: fake.scheduler,
    maxEntries: 3,
    onBackgroundError: (event) => backgroundErrors.push(event.error),
  });
  let loads = 0;
  const load = async () => response(`req-${loads + 1}`, { version: (loads += 1) });

  assert.deepEqual((await cache.getOrLoad({ partition, request: request(), policy }, load)).payload, { version: 1 });
  fake.advanceBy(101);
  assert.deepEqual((await cache.getOrLoad({ partition, request: request(), policy }, load)).payload, { version: 1 });
  fake.scheduler.runDue();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual((await cache.getOrLoad({ partition, request: request(), policy }, load)).payload, { version: 2 });

  fake.advanceBy(101);
  assert.deepEqual(
    (await cache.getOrLoad({ partition, request: request(), policy }, async () => {
      throw new Error("background failed");
    })).payload,
    { version: 2 },
  );
  fake.scheduler.runDue();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(backgroundErrors.length, 1);

  fake.advanceBy(51);
  assert.deepEqual((await cache.getOrLoad({ partition, request: request(), policy }, load)).payload, { version: 3 });
});

test("transport cache read delete clear metadata and validation paths stay deterministic", async () => {
  const fake = createFakeClock();
  const cache = createTransportCache({ clock: fake.clock, scheduler: fake.scheduler, maxEntries: 2 });
  const primary = request("/api/read");
  const other = request("/api/other");

  assert.equal(cache.size, 0);
  assert.equal(cache.read({ partition, request: primary }), undefined);
  assert.equal(cache.delete({ partition, request: other }), false);
  await cache.getOrLoad(
    { partition, request: primary, policy },
    async () => ({ requestId: "req-read", payload: { ok: true }, metadata: { status: 200 } }),
  );

  assert.equal(cache.size, 1);
  assert.deepEqual(cache.read({ partition, request: primary }), {
    requestId: "req-read",
    payload: { ok: true },
    metadata: { status: 200 },
  });
  assert.equal(cache.delete({ partition, request: primary }), true);
  assert.equal(cache.read({ partition, request: primary }), undefined);
  await cache.getOrLoad(
    { partition, request: primary, policy: { ttlMs: 100 } },
    async () => response("req-default-swr", { ok: "default-swr" }),
  );
  cache.clear();
  assert.equal(cache.size, 0);

  assert.equal(
    createCallerPartitionedCacheKey({ source: { id: "runtime-a" }, callerFingerprint: "caller:v1:alpha", operation: ["x"] })
      .startsWith("cache:v1:"),
    true,
  );
  assert.throws(
    () => createTransportCacheKey({ partition: { ...partition, source: { id: " " } }, request: primary }),
    /source id/,
  );
  assert.throws(
    () => createTransportCacheKey({ partition: { ...partition, callerFingerprint: " " }, request: primary }),
    /caller fingerprint/,
  );
  assert.throws(
    () => createCallerPartitionedCacheKey({ source: { id: "runtime-a" }, callerFingerprint: "caller", namespace: " ", operation: null }),
    /namespace/,
  );
  await assert.rejects(
    () => cache.getOrLoad({ partition, request: primary, policy }, () => ({ requestId: " ", payload: null })),
    /requestId/,
  );
  await assert.rejects(
    () => cache.getOrLoad({ partition, request: primary, policy }, () => {
      throw new Error("sync loader failure");
    }),
    /sync loader failure/,
  );
});

test("transport cache suppresses duplicate stale refresh scheduling", async () => {
  const fake = createFakeClock();
  const backgroundErrors: unknown[] = [];
  const cache = createTransportCache({
    clock: fake.clock,
    scheduler: fake.scheduler,
    maxEntries: 2,
    onBackgroundError: (event) => backgroundErrors.push(event.error),
  });
  let resolveReload: ((response: OperationResponse) => void) | undefined;
  await cache.getOrLoad(
    { partition, request: request("/api/stale"), policy: { ttlMs: 1, swrMs: 100 } },
    async () => response("req-stale", { version: 1 }),
  );
  fake.advanceBy(2);

  const reload = cache.getOrLoad(
    { partition, request: request("/api/stale"), policy: { ttlMs: 1, swrMs: 100, mode: "reload" } },
    () => new Promise<OperationResponse>((resolve) => {
      resolveReload = resolve;
    }),
  );
  assert.deepEqual(
    (await cache.getOrLoad(
      { partition, request: request("/api/stale"), policy: { ttlMs: 1, swrMs: 100 } },
      async () => response("req-should-not-schedule", { version: 99 }),
    )).payload,
    { version: 1 },
  );
  assert.equal(fake.pending(), 0);
  resolveReload?.(response("req-reload", { version: 2 }));
  assert.deepEqual((await reload).payload, { version: 2 });

  fake.advanceBy(2);
  await cache.getOrLoad(
    { partition, request: request("/api/stale"), policy: { ttlMs: 1, swrMs: 100 } },
    async () => response("req-background", { version: 3 }),
  );
  await cache.getOrLoad(
    { partition, request: request("/api/stale"), policy: { ttlMs: 1, swrMs: 100 } },
    async () => response("req-duplicate-background", { version: 4 }),
  );
  assert.equal(fake.pending(), 1);
  fake.scheduler.runDue();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(backgroundErrors.length, 0);
});

test("transport cache delete and clear fence pending refreshes and loads", async () => {
  const fake = createFakeClock();
  const cache = createTransportCache({ clock: fake.clock, scheduler: fake.scheduler, maxEntries: 3 });

  await cache.getOrLoad(
    { partition, request: request("/api/clear"), policy: { ttlMs: 1, swrMs: 100 } },
    async () => response("req-clear-1", { version: 1 }),
  );
  fake.advanceBy(2);
  assert.deepEqual(
    (await cache.getOrLoad(
      { partition, request: request("/api/clear"), policy: { ttlMs: 1, swrMs: 100 } },
      async () => response("req-clear-2", { version: 2 }),
    )).payload,
    { version: 1 },
  );
  assert.equal(fake.pending(), 1);
  cache.clear();
  assert.equal(fake.pending(), 0);
  fake.scheduler.runDue();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(cache.read({ partition, request: request("/api/clear") }), undefined);

  let resolveDeleteRefresh: ((value: OperationResponse) => void) | undefined;
  await cache.getOrLoad(
    { partition, request: request("/api/delete-refresh"), policy: { ttlMs: 1, swrMs: 100 } },
    async () => response("req-delete-refresh-1", { version: 1 }),
  );
  fake.advanceBy(2);
  await cache.getOrLoad(
    { partition, request: request("/api/delete-refresh"), policy: { ttlMs: 1, swrMs: 100 } },
    () => new Promise<OperationResponse>((resolve) => {
      resolveDeleteRefresh = resolve;
    }),
  );
  fake.scheduler.runDue();
  assert.equal(cache.delete({ partition, request: request("/api/delete-refresh") }), true);
  resolveDeleteRefresh?.(response("req-delete-refresh-2", { version: 2 }));
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(cache.read({ partition, request: request("/api/delete-refresh") }), undefined);

  let resolveInflight: ((value: OperationResponse) => void) | undefined;
  const oldLoad = cache.getOrLoad(
    { partition, request: request("/api/inflight"), policy },
    () => new Promise<OperationResponse>((resolve) => {
      resolveInflight = resolve;
    }),
  );
  assert.equal(cache.delete({ partition, request: request("/api/inflight") }), false);
  resolveInflight?.(response("req-inflight-old", { version: "old" }));
  assert.deepEqual((await oldLoad).payload, { version: "old" });
  assert.equal(cache.read({ partition, request: request("/api/inflight") }), undefined);
  assert.deepEqual(
    (await cache.getOrLoad(
      { partition, request: request("/api/inflight"), policy },
      async () => response("req-inflight-new", { version: "new" }),
    )).payload,
    { version: "new" },
  );
});

test("transport cache per-request policies bypass or refresh without new instances", async () => {
  const fake = createFakeClock();
  const cache = createTransportCache({ clock: fake.clock, scheduler: fake.scheduler, maxEntries: 2 });
  let loads = 0;
  const load = async () => response(`req-${loads + 1}`, { version: (loads += 1) });

  assert.deepEqual((await cache.getOrLoad({ partition, request: request(), policy }, load)).payload, { version: 1 });
  assert.deepEqual(
    (await cache.getOrLoad({ partition, request: request(), policy: { ...policy, mode: "no-store" } }, load)).payload,
    { version: 2 },
  );
  assert.deepEqual((await cache.getOrLoad({ partition, request: request(), policy }, load)).payload, { version: 1 });
  assert.deepEqual(
    (await cache.getOrLoad({ partition, request: request(), policy: { ...policy, mode: "reload" } }, load)).payload,
    { version: 3 },
  );
  assert.deepEqual((await cache.getOrLoad({ partition, request: request(), policy }, load)).payload, { version: 3 });

  assert.throws(
    () => createTransportCache({ clock: fake.clock, scheduler: fake.scheduler, maxEntries: 0 }),
    /maxEntries/,
  );
  await assert.rejects(
    () => cache.getOrLoad({ partition, request: request(), policy: { ttlMs: -1 } }, load),
    /ttlMs/,
  );
  await assert.rejects(
    () => cache.getOrLoad({ partition, request: request(), policy: { ttlMs: 1, swrMs: -1 } }, load),
    /swrMs/,
  );
  await assert.rejects(
    () => cache.getOrLoad({ partition, request: request(), policy: { ttlMs: 1, mode: "forever" as never } }, load),
    /Unknown transport cache mode/,
  );
});
