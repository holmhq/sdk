import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  CancelledError,
  createCancellationController,
  createDiagnosticsSink,
  HolmError,
  LifecycleError,
  type CancellationSignal,
  type HolmDiagnosticEvent,
} from "../../../src/core/index.js";
import { createFakeClock } from "../../../src/test/index.js";
import {
  createMutationResource,
  type MutationExecuteContext,
  type MutationInvalidationEvent,
  type ResourceSnapshot,
} from "../../../src/state/index.js";

interface ReportPayload {
  readonly id: string;
  readonly labels: readonly string[];
}

interface ReportResult {
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

function assertHasData(snapshot: ResourceSnapshot<ReportResult>): asserts snapshot is ResourceSnapshot<ReportResult> & {
  readonly data: NonNullable<ResourceSnapshot<ReportResult>["data"]>;
} {
  assert.notEqual(snapshot.data, undefined);
}

async function flushMutationWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test("state mutation resources copy optimistic updates, commit results, and emit explicit invalidations", async () => {
  const fake = createFakeClock(20);
  const calls: MutationExecuteContext<ReportPayload>[] = [];
  const results: Deferred<ReportResult>[] = [];
  const invalidations: MutationInvalidationEvent<ReportPayload, ReportResult>[] = [];
  const mutation = createMutationResource<ReportPayload, ReportResult>({
    id: "reports.save",
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "member", id: "alpha" } }) },
    clock: fake.clock,
    invalidates: [{ tags: ["reports", " report:1 "], prefixes: [" /api/reports "] }],
    optimistic(payload) {
      return { version: 0, labels: [...payload.labels, "optimistic"] };
    },
    execute(payload, context) {
      calls.push(context);
      const next = deferred<ReportResult>();
      results.push(next);
      assert.deepEqual(payload, context.payload);
      return next.promise;
    },
    onInvalidate(event) {
      invalidations.push(event);
    },
  });

  const payload = { id: "report-1", labels: ["draft"] };
  const pending = mutation.execute(payload, { reason: "save report" });
  payload.labels.push("mutated after execute");
  await flushMutationWork();

  const optimistic = mutation.getSnapshot();
  assert.equal(optimistic.phase, "ready");
  assert.equal(optimistic.stale, true);
  assert.equal(optimistic.refreshing, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.reason, "save report");
  assert.equal(calls[0]?.callerFingerprint.startsWith("caller:v1:"), true);
  assert.deepEqual(calls[0]?.payload, { id: "report-1", labels: ["draft"] });
  assertHasData(optimistic);
  assert.deepEqual(optimistic.data, { version: 0, labels: ["draft", "optimistic"] });
  assert.equal(Object.isFrozen(optimistic.data.labels), true);

  fake.advanceBy(5);
  const serverResult = { version: 1, labels: ["server"] };
  results[0]?.resolve(serverResult);
  const ready = await pending;
  serverResult.labels.push("mutated after resolve");

  assert.equal(ready.phase, "ready");
  assert.equal(ready.stale, false);
  assert.equal(ready.refreshing, false);
  assert.equal(ready.updatedAt, 25);
  assertHasData(ready);
  assert.deepEqual(ready.data, { version: 1, labels: ["server"] });
  assert.equal(invalidations.length, 1);
  assert.equal(invalidations[0]?.reason, "save report");
  assert.deepEqual(invalidations[0]?.payload, { id: "report-1", labels: ["draft"] });
  assert.deepEqual(invalidations[0]?.result, { version: 1, labels: ["server"] });
  assert.deepEqual(invalidations[0]?.invalidations, [{ prefixes: ["/api/reports"], tags: ["report:1", "reports"] }]);
  assert.throws(() => ((invalidations[0]?.invalidations[0]?.tags as string[]).push("mutated")), /read only|Cannot add/);
});

test("state mutation resources roll back copied optimistic values without corrupting canonical data", async () => {
  const results: Deferred<ReportResult>[] = [];
  const mutation = createMutationResource<ReportPayload, ReportResult>({
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    optimistic(payload) {
      return { version: 999, labels: [...payload.labels] };
    },
    execute() {
      const next = deferred<ReportResult>();
      results.push(next);
      return next.promise;
    },
  });

  const first = mutation.execute({ id: "report-1", labels: ["canonical"] });
  await flushMutationWork();
  results[0]?.resolve({ version: 1, labels: ["canonical"] });
  assert.deepEqual((await first).data, { version: 1, labels: ["canonical"] });

  const failed = mutation.execute({ id: "report-1", labels: ["draft"] });
  await flushMutationWork();
  const optimistic = mutation.getSnapshot();
  assertHasData(optimistic);
  assert.deepEqual(optimistic.data, { version: 999, labels: ["draft"] });

  const remote = new HolmError({ kind: "remote", code: "save_failed", message: "Save failed." });
  results[1]?.reject(remote);
  const rolledBack = await failed;

  assert.equal(rolledBack.phase, "error");
  assert.equal(rolledBack.error, remote);
  assert.equal(rolledBack.stale, true);
  assertHasData(rolledBack);
  assert.deepEqual(rolledBack.data, { version: 1, labels: ["canonical"] });
  assert.equal(JSON.stringify(rolledBack).includes("draft"), false);
});

test("state mutation resources normalize errors, cancellation, invalidation hooks, and disposal branches", async () => {
  const diagnostics: HolmDiagnosticEvent[] = [];
  let observedSignal: CancellationSignal | undefined;
  const mutation = createMutationResource<ReportPayload, ReportResult, HolmError>({
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    diagnostics: createDiagnosticsSink((event) => {
      diagnostics.push(event);
    }),
    invalidates(result) {
      return [{ tags: [String(result.version)] }];
    },
    execute(_payload, context) {
      observedSignal = context.cancellation;
      if (_payload.id === "plain-error") {
        throw new Error("plain secret failure");
      }
      if (_payload.id === "cancel") {
        return new Promise<ReportResult>(() => undefined);
      }
      return { version: 2, labels: ["ok"] };
    },
    onInvalidate() {
      throw new Error("invalidation secret failure");
    },
  });

  const ok = await mutation.execute({ id: "ok", labels: [] });
  assert.deepEqual(ok.data, { version: 2, labels: ["ok"] });
  assert.equal(diagnostics.some((event) => event.code === "state_mutation_invalidate_hook_error"), true);
  assert.equal(JSON.stringify(diagnostics).includes("secret"), false);

  const failed = await mutation.execute({ id: "plain-error", labels: [] });
  assert.equal(failed.phase, "error");
  assert.equal(failed.error?.code, "state_mutation_execute_error");
  assert.deepEqual(failed.data, { version: 2, labels: ["ok"] });

  const cancellation = createCancellationController();
  const cancelled = mutation.execute({ id: "cancel", labels: [] }, { cancellation: cancellation.signal });
  await flushMutationWork();
  cancellation.cancel("caller abort");
  const cancelledSnapshot = await cancelled;
  assert.equal(cancelledSnapshot.error instanceof CancelledError, true);
  assert.equal(observedSignal?.cancelled, true);

  const busy = createMutationResource<ReportPayload, ReportResult>({
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    execute() {
      return new Promise<ReportResult>(() => undefined);
    },
  });
  const busyPending = busy.execute({ id: "pending", labels: [] });
  assert.throws(() => busy.execute({ id: "second", labels: [] }), LifecycleError);
  busy.dispose();
  busy.dispose();
  assert.equal(busy.getSnapshot().phase, "disposed");
  await assert.rejects(busyPending, CancelledError);
  assert.equal((await mutation.currentExecution()).phase, "error");
  mutation.dispose();
  assert.throws(() => mutation.execute({ id: "disposed", labels: [] }), LifecycleError);
});

test("state mutation resources cover reset, custom errors, invalidation validation, and optional lifecycle branches", async () => {
  class SaveError extends HolmError {
    readonly retryAfterMs = 1000;
  }

  assert.throws(
    () =>
      createMutationResource<ReportPayload, ReportResult>({
        id: " ",
        source: { id: "runtime-a", surface: "test" },
        caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
        execute: () => ({ version: 1, labels: [] }),
      }),
    /non-empty/,
  );

  const normalized = createMutationResource<ReportPayload, ReportResult, SaveError>({
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    copy: (value) => ({ version: value.version, labels: [...value.labels] }),
    execute() {
      throw new Error("custom failure");
    },
    normalizeError(error, context) {
      assert.equal(error instanceof Error, true);
      assert.equal(context.payload.id, "custom");
      return new SaveError({ kind: "remote", code: "custom_save_failed", message: "Custom save failed." });
    },
  });
  const custom = await normalized.execute({ id: "custom", labels: [] });
  assert.equal(custom.error?.retryAfterMs, 1000);

  const noInvalidationEvents: MutationInvalidationEvent<ReportPayload, ReportResult>[] = [];
  const noInvalidations = createMutationResource<ReportPayload, ReportResult>({
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    execute: () => ({ version: 1, labels: ["no-invalidation"] }),
    onInvalidate: (event) => {
      noInvalidationEvents.push(event);
    },
  });
  assert.deepEqual((await noInvalidations.execute({ id: "none", labels: [] })).data, { version: 1, labels: ["no-invalidation"] });
  assert.equal(noInvalidationEvents.length, 0);

  const invalidationValidation = createMutationResource<ReportPayload, ReportResult>({
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    execute: () => ({ version: 1, labels: ["invalid"] }),
    invalidates: [{ tags: [" "] }],
    onInvalidate: () => undefined,
  });
  const invalidated = await invalidationValidation.execute({ id: "invalid", labels: [] });
  assert.equal(invalidated.phase, "error");
  assert.equal(invalidated.error?.code, "state_mutation_execute_error");
  assert.deepEqual(invalidated.data, { version: 1, labels: ["invalid"] });

  const preCancelled = createCancellationController();
  preCancelled.cancel("already cancelled");
  const preCancelledMutation = createMutationResource<ReportPayload, ReportResult>({
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    execute: () => ({ version: 1, labels: ["wrong"] }),
  });
  const preCancelledSnapshot = await preCancelledMutation.execute(
    { id: "cancelled", labels: [] },
    { cancellation: preCancelled.signal },
  );
  assert.equal(preCancelledSnapshot.error instanceof CancelledError, true);

  const optimisticNoData = createMutationResource<ReportPayload, ReportResult>({
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    optimistic: (payload) => ({ version: 99, labels: [...payload.labels] }),
    execute: () => {
      throw new HolmError({ kind: "remote", code: "no_data_failed", message: "No data failed." });
    },
  });
  const phases: string[] = [];
  const unsubscribe = optimisticNoData.subscribe(() => {
    phases.push(optimisticNoData.getSnapshot().phase);
  });
  const optimisticPending = optimisticNoData.execute({ id: "no-data", labels: ["draft"] });
  assert.equal(optimisticNoData.currentExecution(), optimisticPending);
  const noDataFailure = await optimisticPending;
  unsubscribe();
  assert.equal(noDataFailure.phase, "error");
  assert.equal("data" in noDataFailure, false);
  assert.deepEqual(phases, ["loading", "ready", "idle", "error"]);

  const resetMutation = createMutationResource<ReportPayload, ReportResult>({
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    execute: () => new Promise<ReportResult>(() => undefined),
  });
  const resetPending = resetMutation.execute({ id: "reset", labels: [] });
  assert.equal(resetMutation.reset().phase, "idle");
  await assert.rejects(resetPending, CancelledError);
  resetMutation.dispose();
  assert.throws(() => resetMutation.reset(), LifecycleError);
});
