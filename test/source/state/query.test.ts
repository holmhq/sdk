import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  CancelledError,
  createCancellationController,
  createDiagnosticsSink,
  HolmError,
  LifecycleError,
  type CancellationSignal,
} from "../../../src/core/index.js";
import { createFakeClock } from "../../../src/test/index.js";
import {
  createQueryResource,
  type QueryLoadContext,
  type ResourceSnapshot,
} from "../../../src/state/index.js";

interface ReportData {
  readonly version: number;
  readonly labels: readonly string[];
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

function assertHasData(snapshot: ResourceSnapshot<ReportData>): asserts snapshot is ResourceSnapshot<ReportData> & {
  readonly data: NonNullable<ResourceSnapshot<ReportData>["data"]>;
} {
  assert.notEqual(snapshot.data, undefined);
}

async function flushQueryWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test("state query resources load, refresh with stale data, and retain data on errors", async () => {
  const fake = createFakeClock(10);
  const loads: QueryLoadContext[] = [];
  const results: Deferred<ReportData>[] = [];
  const query = createQueryResource<ReportData>({
    key: ["reports", { page: 1 }],
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "member", id: "alpha" } }) },
    clock: fake.clock,
    load(context) {
      loads.push(context);
      const next = deferred<ReportData>();
      results.push(next);
      return next.promise;
    },
  });

  const initial = query.refresh();
  assert.equal(query.getSnapshot().phase, "loading");
  assert.equal(query.getSnapshot().stale, false);
  assert.equal(query.getSnapshot().refreshing, false);
  assert.equal("data" in query.getSnapshot(), false);
  await flushQueryWork();
  assert.equal(loads.length, 1);
  assert.deepEqual(loads[0]?.key, ["reports", { page: 1 }]);
  assert.equal(loads[0]?.source.id, "runtime-a");
  assert.equal(loads[0]?.callerFingerprint.startsWith("caller:v1:"), true);
  assert.equal(loads[0]?.cacheKey.includes("alpha"), false);

  fake.advanceBy(5);
  const firstPayload = { version: 1, labels: ["initial"] };
  results[0]?.resolve(firstPayload);
  const ready = await initial;
  firstPayload.labels.push("mutated");
  assert.equal(ready.phase, "ready");
  assert.equal(ready.updatedAt, 15);
  assertHasData(ready);
  assert.deepEqual(ready.data, { version: 1, labels: ["initial"] });
  assert.equal(Object.isFrozen(ready.data.labels), true);

  const stale = query.markStale();
  assert.equal(stale.phase, "ready");
  assert.equal(stale.stale, true);
  assertHasData(stale);
  assert.deepEqual(stale.data, { version: 1, labels: ["initial"] });

  const refresh = query.refresh();
  const refreshing = query.getSnapshot();
  assert.equal(refreshing.phase, "loading");
  assert.equal(refreshing.stale, true);
  assert.equal(refreshing.refreshing, true);
  assertHasData(refreshing);
  assert.deepEqual(refreshing.data, { version: 1, labels: ["initial"] });
  await flushQueryWork();
  fake.advanceBy(5);
  results[1]?.resolve({ version: 2, labels: ["refreshed"] });
  assert.deepEqual((await refresh).data, { version: 2, labels: ["refreshed"] });

  const error = new HolmError({ kind: "remote", code: "report_failed", message: "Report failed." });
  const failed = query.refresh();
  await flushQueryWork();
  results[2]?.reject(error);
  const errored = await failed;
  assert.equal(errored.phase, "error");
  assert.equal(errored.error, error);
  assert.equal(errored.stale, true);
  assert.equal(errored.refreshing, false);
  assertHasData(errored);
  assert.deepEqual(errored.data, { version: 2, labels: ["refreshed"] });
});

test("state query resources validate reset, replacement, cancellation, and disposal branches", async () => {
  assert.throws(
    () =>
      createQueryResource<ReportData>({
        key: "reports" as never,
        source: { id: "runtime-a", surface: "test" },
        caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
        load: () => ({ version: 0, labels: [] }),
      }),
    /tuple/,
  );

  let currentCaller = { surface: "test" as const, principal: { kind: "member" as const, id: "alpha" } };
  const callerListeners: Array<() => void> = [];
  const contexts: QueryLoadContext[] = [];
  const firstLoad = deferred<ReportData>();
  const query = createQueryResource<ReportData>({
    id: "query-branches",
    key: ["branches"],
    source: { id: "runtime-a", surface: "test" },
    caller: {
      current: () => currentCaller,
      subscribe(listener) {
        callerListeners.push(listener);
        return () => undefined;
      },
    },
    diagnostics: createDiagnosticsSink(() => undefined),
    copy: (value) => ({ version: value.version, labels: [...value.labels] }),
    load(context) {
      contexts.push(context);
      if (contexts.length === 1) {
        return firstLoad.promise;
      }
      if (contexts.length === 2) {
        throw new Error("plain loader failure");
      }
      return { version: contexts.length, labels: [context.caller.principal.kind] };
    },
  });

  assert.equal((await query.currentLoad()).phase, "idle");
  const first = query.refresh({ reason: "first" });
  await flushQueryWork();
  assert.equal(contexts[0]?.reason, "first");

  const replaced = query.refresh({ force: true, reason: "replace" });
  await flushQueryWork();
  await assert.rejects(first, CancelledError);
  assert.equal(contexts[0]?.cancellation.cancelled, true);
  const replacementError = await replaced;
  assert.equal(replacementError.phase, "error");
  assert.equal(replacementError.error?.code, "state_query_loader_error");

  currentCaller = { surface: "test", principal: { kind: "member", id: "beta" } };
  const reset = query.reset({
    caller: { current: () => currentCaller },
    source: { id: "runtime-b", surface: "test" },
    reason: "swap caller and source",
  });
  assert.equal(reset.phase, "loading");
  assert.equal("data" in reset, false);
  await flushQueryWork();
  const swapped = await query.currentLoad();
  assert.deepEqual(swapped.data, { version: 3, labels: ["member"] });
  assert.equal(contexts[2]?.source.id, "runtime-b");
  assert.equal(contexts[2]?.caller.principal.kind, "member");

  query.dispose();
  query.dispose();
  callerListeners[0]?.();
  assert.throws(() => query.refresh(), LifecycleError);

  const idleQuery = createQueryResource<ReportData>({
    key: ["idle"],
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    load: () => ({ version: 99, labels: [] }),
  });
  assert.equal(idleQuery.reset().phase, "idle");
  const preCancelled = createCancellationController();
  preCancelled.cancel("already cancelled");
  const cancelled = await idleQuery.refresh({ cancellation: preCancelled.signal });
  assert.equal(cancelled.phase, "error");
  assert.equal(cancelled.error instanceof CancelledError, true);
});

test("state query resources deduplicate refreshes and cancel shared work on external cancellation and disposal", async () => {
  const fake = createFakeClock();
  let loads = 0;
  let observedSignal: CancellationSignal | undefined;
  let resolveLoad: ((value: ReportData) => void) | undefined;
  const query = createQueryResource<ReportData>({
    key: ["reports"],
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    clock: fake.clock,
    load(context) {
      loads += 1;
      observedSignal = context.cancellation;
      return new Promise<ReportData>((resolve) => {
        resolveLoad = resolve;
      });
    },
  });
  const notifications: string[] = [];
  query.subscribe(() => notifications.push(`first:${query.getSnapshot().phase}`));
  query.subscribe(() => notifications.push(`second:${query.getSnapshot().phase}`));

  const first = query.refresh();
  const second = query.refresh();
  assert.equal(first, second);
  await flushQueryWork();
  assert.equal(loads, 1);
  resolveLoad?.({ version: 1, labels: ["shared"] });
  assert.deepEqual((await first).data, { version: 1, labels: ["shared"] });
  assert.equal(notifications.filter((item) => item.endsWith(":loading")).length, 2);
  assert.equal(notifications.filter((item) => item.endsWith(":ready")).length, 2);

  const controller = createCancellationController();
  const cancelled = query.refresh({ cancellation: controller.signal });
  await flushQueryWork();
  controller.cancel("caller abort");
  const cancelledSnapshot = await cancelled;
  assert.equal(cancelledSnapshot.phase, "error");
  assert.equal(cancelledSnapshot.error instanceof CancelledError, true);
  assert.equal(observedSignal?.cancelled, true);

  const pending = query.refresh();
  await flushQueryWork();
  query.dispose();
  assert.equal(query.getSnapshot().phase, "disposed");
  assert.equal(observedSignal?.cancelled, true);
  await assert.rejects(pending, CancelledError);
  assert.equal(fake.pending(), 0);
});
