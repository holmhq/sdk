import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  createDiagnosticsSink,
  type HolmDiagnosticEvent,
  type OperationResponse,
  type WireValue,
} from "../../../src/core/index.js";
import { createFakeClock } from "../../../src/test/index.js";
import {
  createTransportCache,
  createTransportRequest,
  type TransportCacheInvalidationEvent,
  type TransportCachePartition,
  type TransportCachePolicy,
  type TransportCacheUpdateEvent,
} from "../../../src/transports/index.js";

const partition = Object.freeze({
  source: Object.freeze({ id: "runtime-a", surface: "test" as const }),
  callerFingerprint: "caller:v1:alpha",
}) satisfies TransportCachePartition;
const policy = Object.freeze({ ttlMs: 100, swrMs: 50 }) satisfies TransportCachePolicy;

function response(requestId: string, payload: WireValue): OperationResponse {
  return Object.freeze({ requestId, payload });
}

function request(url: string, headers: Readonly<Record<string, string>> = {}) {
  return createTransportRequest({ method: "GET", url, headers, responseMode: "json" });
}

async function flushBackground(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test("transport cache invalidates by tags prefixes and explicit mutation declarations", async () => {
  const fake = createFakeClock();
  const updates: TransportCacheUpdateEvent[] = [];
  const invalidations: TransportCacheInvalidationEvent[] = [];
  const diagnostics: HolmDiagnosticEvent[] = [];
  const cache = createTransportCache({
    clock: fake.clock,
    scheduler: fake.scheduler,
    maxEntries: 8,
    onUpdate: (event) => updates.push(event),
    onInvalidate: (event) => invalidations.push(event),
    diagnostics: createDiagnosticsSink((event) => {
      diagnostics.push(event);
    }),
  });

  await cache.getOrLoad(
    { partition, request: request("/api/reports/one"), policy, tags: ["reports", "app:1"] },
    async () => response("req-report-1", { item: "report-1" }),
  );
  await cache.getOrLoad(
    { partition, request: request("/api/reports/two"), policy, tags: ["reports", "app:2"] },
    async () => response("req-report-2", { item: "report-2" }),
  );
  await cache.getOrLoad(
    { partition, request: request("/api/users/one"), policy, tags: ["users"] },
    async () => response("req-user-1", { item: "user-1" }),
  );

  const tagged = cache.invalidate({ partition, tags: ["reports"] });

  assert.equal(tagged.removed, 2);
  assert.equal(cache.read({ partition, request: request("/api/reports/one") }), undefined);
  assert.deepEqual(cache.read({ partition, request: request("/api/users/one") })?.payload, { item: "user-1" });
  assert.equal(invalidations.at(-1)?.reason, "explicit");
  assert.equal(invalidations.at(-1)?.removed, 2);

  await cache.getOrLoad(
    { partition, request: request("/api/reports/three"), policy, tags: ["reports"] },
    async () => response("req-report-3", { item: "report-3" }),
  );
  const mutation = cache.invalidateForMutation({ partition, prefixes: ["/api/reports"], tags: ["users"] });

  assert.equal(mutation.removed, 2);
  assert.equal(cache.size, 0);
  assert.equal(updates.length, 4);
  assert.equal(diagnostics.some((event) => event.code === "transport_cache_update"), true);
  assert.equal(diagnostics.some((event) => event.code === "transport_cache_invalidate"), true);
  assert.equal(JSON.stringify(diagnostics).includes("secret"), false);
});

test("transport cache returns immutable public copies without exposing canonical state", async () => {
  const fake = createFakeClock();
  const cache = createTransportCache({ clock: fake.clock, scheduler: fake.scheduler, maxEntries: 4 });
  const loaderPayload = { nested: { label: "canonical" }, count: 1 };

  const first = await cache.getOrLoad(
    { partition, request: request("/api/immutable"), policy, tags: ["immutable"] },
    async () => response("req-immutable", loaderPayload),
  );
  loaderPayload.nested.label = "mutated after load";

  assert.throws(() => ((first.payload as { count: number }).count = 99), /read only|Cannot assign/);
  const second = await cache.getOrLoad(
    { partition, request: request("/api/immutable"), policy, tags: ["immutable"] },
    async () => response("req-immutable-2", { nested: { label: "wrong" }, count: 2 }),
  );

  assert.notEqual(first, second);
  assert.deepEqual(second.payload, { nested: { label: "canonical" }, count: 1 });
});

test("transport cache diagnostics observe background SWR errors with redacted request evidence", async () => {
  const fake = createFakeClock();
  const backgroundErrors: unknown[] = [];
  const diagnostics: HolmDiagnosticEvent[] = [];
  const cache = createTransportCache({
    clock: fake.clock,
    scheduler: fake.scheduler,
    maxEntries: 4,
    diagnostics: createDiagnosticsSink((event) => {
      diagnostics.push(event);
    }),
    onBackgroundError: (event) => backgroundErrors.push(event),
  });
  const sensitiveRequest = request("/api/secret", { authorization: "Bearer secret-token", "x-trace": "trace-1" });

  await cache.getOrLoad(
    { partition, request: sensitiveRequest, policy: { ttlMs: 1, swrMs: 100 }, tags: ["secret"] },
    async () => response("req-secret-1", { version: 1 }),
  );
  fake.advanceBy(2);
  assert.deepEqual(
    (await cache.getOrLoad(
      { partition, request: sensitiveRequest, policy: { ttlMs: 1, swrMs: 100 }, tags: ["secret"] },
      async () => {
        throw new Error("background secret-token failure");
      },
    )).payload,
    { version: 1 },
  );
  fake.scheduler.runDue();
  await flushBackground();

  const event = diagnostics.find((item) => item.code === "transport_cache_background_error");
  assert.equal(backgroundErrors.length, 1);
  assert.notEqual(event, undefined);
  assert.equal(event?.severity, "error");
  assert.equal(JSON.stringify(event).includes("secret-token"), false);
  assert.equal(JSON.stringify(event).includes("background secret-token failure"), false);
  assert.equal(JSON.stringify(event).includes("[redacted]"), true);
});

test("transport cache invalidation validation request keys and hook failures stay observable", async () => {
  const fake = createFakeClock();
  const diagnostics: HolmDiagnosticEvent[] = [];
  const keyedRequest = request("/api/keyed");
  const prefixRequest = request("/api/prefix/one");
  const cache = createTransportCache({
    clock: fake.clock,
    scheduler: fake.scheduler,
    maxEntries: 2,
    diagnostics: createDiagnosticsSink((event) => {
      diagnostics.push(event);
    }),
    onUpdate: () => {
      throw new Error("update hook token secret");
    },
    onInvalidate: () => {
      throw new Error("invalidate hook token secret");
    },
    onBackgroundError: () => {
      throw new Error("background hook token secret");
    },
  });

  await cache.getOrLoad(
    { partition, request: keyedRequest, policy, tags: [" keyed "] },
    async () => response("req-keyed", { item: "keyed" }),
  );
  await cache.getOrLoad(
    { partition, request: prefixRequest, policy: { ttlMs: 1, swrMs: 100 }, tags: ["prefix"] },
    async () => response("req-prefix", { item: "prefix" }),
  );

  const otherPartition = { ...partition, callerFingerprint: "caller:v1:other" };
  assert.equal(cache.invalidate({ partition: otherPartition, prefixes: ["/api/prefix"] }).removed, 0);
  assert.equal(cache.invalidate({ requests: [{ partition, request: keyedRequest }] }).removed, 1);
  assert.deepEqual(cache.read({ partition, request: prefixRequest })?.payload, { item: "prefix" });
  assert.throws(() => cache.invalidate({}), /requires/);
  assert.throws(() => cache.invalidate({ tags: [" "] }), /tag/);
  assert.throws(() => cache.invalidateForMutation({ prefixes: [" "] }), /prefix/);

  fake.advanceBy(2);
  await cache.getOrLoad(
    { partition, request: prefixRequest, policy: { ttlMs: 1, swrMs: 100 }, tags: ["prefix"] },
    async () => {
      throw new Error("background token secret");
    },
  );
  fake.scheduler.runDue();
  await flushBackground();

  assert.equal(diagnostics.some((event) => event.code === "transport_cache_update_hook_error"), true);
  assert.equal(diagnostics.some((event) => event.code === "transport_cache_invalidate_hook_error"), true);
  assert.equal(diagnostics.some((event) => event.code === "transport_cache_background_error_hook_error"), true);
  assert.equal(JSON.stringify(diagnostics).includes("token secret"), false);
});
