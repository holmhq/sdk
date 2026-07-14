import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  createCapabilityRegistry,
  createDiagnosticsSink,
  HolmError,
  LifecycleError,
  UnsupportedCapabilityError,
  type HolmDiagnosticEvent,
} from "../../../src/core/index.js";
import { createFakeClock } from "../../../src/test/index.js";
import {
  createDerivedResource,
  createQueryResource,
  createRealtimeReconcileHook,
  createResourceController,
  createResourceHistory,
  REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY,
  type ResourceSnapshot,
} from "../../../src/state/index.js";

interface CountData {
  readonly count: number;
}

interface SummaryData {
  readonly total: number;
  readonly labels: readonly string[];
}

interface ReportData {
  readonly version: number;
  readonly labels: readonly string[];
}

function assertHasSummary(snapshot: ResourceSnapshot<SummaryData>): asserts snapshot is ResourceSnapshot<SummaryData> & {
  readonly data: NonNullable<ResourceSnapshot<SummaryData>["data"]>;
} {
  assert.notEqual(snapshot.data, undefined);
}

test("derived resources recompute from dependency snapshots and dispose subscriptions", () => {
  const fake = createFakeClock(100);
  const left = createResourceController<CountData>({ clock: fake.clock });
  const right = createResourceController<CountData>({ clock: fake.clock });
  left.setReady({ count: 1 });
  right.setReady({ count: 2 });

  const derived = createDerivedResource({
    id: "reports.summary",
    dependencies: [left.resource, right.resource] as const,
    clock: fake.clock,
    derive(snapshots) {
      const leftData = snapshots[0].data;
      const rightData = snapshots[1].data;
      if (leftData === undefined || rightData === undefined) {
        throw new Error("derived dependencies should be ready");
      }
      return { total: leftData.count + rightData.count, labels: [`rev:${snapshots[0].revision}:${snapshots[1].revision}`] };
    },
  });
  const notifications: string[] = [];
  derived.subscribe(() => {
    notifications.push(`${derived.getSnapshot().phase}:${derived.getSnapshot().revision}`);
  });

  const initial = derived.getSnapshot();
  assert.equal(initial.phase, "ready");
  assert.equal(initial.updatedAt, 100);
  assertHasSummary(initial);
  assert.deepEqual(initial.data, { total: 3, labels: ["rev:1:1"] });
  assert.equal(Object.isFrozen(initial.data.labels), true);

  fake.advanceBy(5);
  left.setReady({ count: 4 });
  const recomputed = derived.getSnapshot();
  assert.equal(recomputed.phase, "ready");
  assertHasSummary(recomputed);
  assert.deepEqual(recomputed.data, { total: 6, labels: ["rev:2:1"] });
  assert.deepEqual(notifications, ["ready:2"]);

  derived.dispose();
  assert.equal(derived.getSnapshot().phase, "disposed");
  right.setReady({ count: 10 });
  assert.equal(derived.getSnapshot().phase, "disposed");
  assert.deepEqual(notifications, ["ready:2", "disposed:3"]);
  assert.throws(() => derived.refresh(), LifecycleError);
});

test("derived resources surface dependency errors and pending dependencies without framework runtime", () => {
  const ready = createResourceController<CountData>();
  const pending = createResourceController<CountData>();
  const failed = createResourceController<CountData>();
  ready.setReady({ count: 1 });
  pending.setLoading();
  let deriveCalls = 0;
  const derived = createDerivedResource({
    dependencies: [ready.resource, pending.resource] as const,
    derive(snapshots) {
      deriveCalls += 1;
      const left = snapshots[0].data;
      const right = snapshots[1].data;
      if (left === undefined || right === undefined) {
        throw new Error("derived dependencies should be ready");
      }
      return { total: left.count + right.count, labels: [] };
    },
  });

  assert.equal(derived.getSnapshot().phase, "loading");
  assert.equal(deriveCalls, 0);
  pending.setReady({ count: 2 });
  assert.equal(derived.getSnapshot().phase, "ready");
  assert.equal(deriveCalls, 1);
  assertHasSummary(derived.getSnapshot());
  assert.deepEqual(derived.getSnapshot().data, { total: 3, labels: [] });

  const remote = new HolmError({ kind: "remote", code: "reports_failed", message: "Reports failed." });
  failed.setError(remote);
  const errorDerived = createDerivedResource({
    dependencies: [ready.resource, failed.resource] as const,
    derive() {
      return { total: 0, labels: [] };
    },
  });
  assert.equal(errorDerived.getSnapshot().phase, "error");
  assert.equal(errorDerived.getSnapshot().error, remote);
});

test("resource history records compact diagnostics without retaining payloads", () => {
  const fake = createFakeClock(500);
  const diagnostics: HolmDiagnosticEvent[] = [];
  const controller = createResourceController<{ readonly secret: string }>({ clock: fake.clock });
  const history = createResourceHistory(controller.resource, {
    id: "member.profile",
    capacity: 3,
    clock: fake.clock,
    diagnostics: createDiagnosticsSink((event) => {
      diagnostics.push(event);
    }),
  });

  controller.setLoading();
  fake.advanceBy(1);
  controller.setReady({ secret: "member-token-secret" });
  controller.setError(new HolmError({ kind: "remote", code: "profile_failed", message: "Profile failed.", details: { secret: "remote-secret" } }));

  const entries = history.getEntries();
  assert.equal(entries.length, 3);
  assert.deepEqual(entries.map((entry) => entry.phase), ["loading", "ready", "error"]);
  assert.equal(entries[1]?.hasData, true);
  assert.equal(entries[2]?.errorCode, "profile_failed");
  assert.equal(JSON.stringify(entries).includes("member-token-secret"), false);
  assert.equal(JSON.stringify(entries).includes("remote-secret"), false);
  assert.equal(diagnostics.some((event) => event.code === "state_resource_history_recorded"), true);

  history.dispose();
  controller.setReady({ secret: "after-history-dispose" });
  assert.equal(history.getEntries().length, 3);
});

test("derived, history, query reconcile, and realtime seams cover validation branches", async () => {
  assert.throws(
    () => createDerivedResource({
      id: " ",
      dependencies: [createResourceController<CountData>().resource] as const,
      derive: () => ({ total: 0, labels: [] }),
    }),
    /non-empty/,
  );
  assert.throws(
    () => createDerivedResource({ dependencies: [] as never, derive: () => ({ total: 0, labels: [] }) }),
    /non-empty resource array/,
  );
  assert.throws(
    () => createDerivedResource({ dependencies: [{}] as never, derive: () => ({ total: 0, labels: [] }) }),
    /state resources/,
  );

  const pending = createResourceController<CountData>();
  const pendingDerived = createDerivedResource({
    dependencies: [pending.resource] as const,
    derive(snapshots) {
      return { total: snapshots[0].data?.count ?? 0, labels: [] };
    },
  });
  const pendingPhases: string[] = [];
  const unsubscribePending = pendingDerived.subscribe(() => {
    pendingPhases.push(pendingDerived.getSnapshot().phase);
  });
  assert.equal(pendingDerived.getSnapshot().phase, "idle");
  assert.equal(pendingDerived.refresh().phase, "idle");
  pending.setReady({ count: 5 });
  unsubscribePending();
  assert.deepEqual(pendingDerived.getSnapshot().data, { total: 5, labels: [] });
  assert.deepEqual(pendingPhases, ["idle", "ready"]);

  const failedDependency = createResourceController<CountData>();
  failedDependency.setReady({ count: 1 });
  const plainFailure = createDerivedResource({
    id: "plain-failure",
    dependencies: [failedDependency.resource] as const,
    derive() {
      throw new Error("plain derived failure");
    },
  });
  assert.equal(plainFailure.getSnapshot().phase, "error");
  assert.equal(plainFailure.getSnapshot().error?.code, "state_derived_compute_error");

  const holmFailure = createDerivedResource({
    dependencies: [failedDependency.resource] as const,
    derive() {
      throw new HolmError({ kind: "remote", code: "derived_remote_failed", message: "Derived failed." });
    },
  });
  assert.equal(holmFailure.getSnapshot().error?.code, "derived_remote_failed");

  const disposableDependency = createResourceController<CountData>();
  disposableDependency.setReady({ count: 1 });
  const disposableDerived = createDerivedResource({
    dependencies: [disposableDependency.resource] as const,
    derive: () => ({ total: 1, labels: [] }),
  });
  disposableDependency.dispose();
  assert.equal(disposableDerived.getSnapshot().phase, "disposed");
  disposableDerived.dispose();
  assert.throws(() => disposableDerived.refresh(), LifecycleError);

  assert.throws(() => createResourceHistory(pending.resource, { id: " " }), /non-empty/);
  assert.throws(() => createResourceHistory(pending.resource, { capacity: 0 }), /positive integer/);
  const includeInitial = createResourceHistory(pending.resource, { includeInitial: true });
  assert.equal(includeInitial.getEntries()[0]?.phase, "ready");
  includeInitial.dispose();
  includeInitial.dispose();

  const invalidClockHistory = createResourceHistory(pending.resource, { clock: { now: () => Number.NaN } });
  assert.doesNotThrow(() => pending.setReady({ count: 6 }));
  invalidClockHistory.dispose();

  const throwingHistory = createResourceHistory(pending.resource, {
    diagnostics: { emit: () => { throw new Error("history diagnostics down"); } },
  });
  assert.doesNotThrow(() => pending.setReady({ count: 7 }));
  throwingHistory.dispose();

  const queryDiagnostics: HolmDiagnosticEvent[] = [];
  const query = createQueryResource<ReportData>({
    id: "query-reconcile",
    key: ["query-reconcile"],
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    diagnostics: createDiagnosticsSink((event) => {
      queryDiagnostics.push(event);
    }),
    load: () => ({ version: 1, labels: ["load"] }),
  });
  const reconciled = query.reconcile({ version: 8, labels: ["manual"] }, { stale: true, refreshing: true, reason: "manual" });
  assert.equal(reconciled.stale, true);
  assert.equal(reconciled.refreshing, true);
  assert.equal(queryDiagnostics.some((event) => event.code === "state_query_reconciled"), true);

  const throwingQueryDiagnostics = createQueryResource<ReportData>({
    key: ["throwing-reconcile"],
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    diagnostics: { emit: () => { throw new Error("query diagnostics down"); } },
    load: () => ({ version: 1, labels: ["load"] }),
  });
  assert.doesNotThrow(() => throwingQueryDiagnostics.reconcile({ version: 2, labels: ["manual"] }));
  throwingQueryDiagnostics.dispose();
  assert.throws(() => throwingQueryDiagnostics.markStale(), LifecycleError);
  assert.throws(() => throwingQueryDiagnostics.reconcile({ version: 3, labels: [] }), LifecycleError);

  const realtimeDiagnostics: HolmDiagnosticEvent[] = [];
  const capabilities = createCapabilityRegistry([
    { id: REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY.id, version: { major: 1, minor: 0 }, origin: "runtime" },
  ]);
  const hook = createRealtimeReconcileHook({
    id: "query-realtime",
    query,
    capabilities,
    requirement: REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY,
    diagnostics: createDiagnosticsSink((event) => {
      realtimeDiagnostics.push(event);
    }),
  });
  hook.handle({ kind: "reconcile", data: { version: 9, labels: ["event"] } });
  hook.handle({ kind: "invalidate" });
  assert.equal(realtimeDiagnostics.some((event) => event.code === "state_realtime_reconciled"), true);
  assert.equal(realtimeDiagnostics.some((event) => event.code === "state_realtime_invalidated"), true);
  assert.throws(() => createRealtimeReconcileHook({ id: " ", query, capabilities }), /non-empty/);

  const throwingHook = createRealtimeReconcileHook({
    query,
    capabilities,
    diagnostics: { emit: () => { throw new Error("realtime diagnostics down"); } },
  });
  assert.doesNotThrow(() => throwingHook.handle({ kind: "invalidate" }));
});

test("realtime reconcile hooks are public-capability gated and non-durable", async () => {
  let version = 1;
  const capabilities = createCapabilityRegistry([]);
  const query = createQueryResource<ReportData>({
    key: ["reports"],
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    load: () => ({ version, labels: ["load"] }),
  });
  const hook = createRealtimeReconcileHook({ query, capabilities });

  assert.equal(hook.durable, false);
  assert.equal(hook.supports.privateChannels, false);
  assert.equal(hook.supports.presence, false);
  assert.equal(hook.supports.collaboration, false);
  assert.throws(() => hook.handle({ kind: "invalidate", reason: "broadcast" }), UnsupportedCapabilityError);

  capabilities.replaceOffers([{ id: REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY.id, version: { major: 1, minor: 0 }, origin: "runtime" }]);
  assert.deepEqual((await query.refresh()).data, { version: 1, labels: ["load"] });

  const invalidated = hook.handle({ kind: "invalidate", reason: "broadcast" });
  assert.equal(invalidated.phase, "ready");
  assert.equal(invalidated.stale, true);
  assert.equal(query.getSnapshot().stale, true);

  const eventPayload = { version: 2, labels: ["server-event"] };
  const reconciled = hook.handle({ kind: "reconcile", data: eventPayload, reason: "server reconcile" });
  eventPayload.labels.push("mutated after event");
  assert.equal(reconciled.phase, "ready");
  assert.deepEqual(reconciled.data, { version: 2, labels: ["server-event"] });
  assert.equal(Object.isFrozen(reconciled.data?.labels), true);

  version = 3;
  const refreshed = await hook.handle({ kind: "invalidate", refresh: true, reason: "broadcast-refresh" });
  assert.deepEqual(refreshed.data, { version: 3, labels: ["load"] });

  assert.throws(
    () => createRealtimeReconcileHook({
      query,
      capabilities,
      requirement: { id: "holm.realtime.private", major: 1 } as never,
    }),
    /public realtime subscribe/,
  );

  hook.dispose();
  assert.throws(() => hook.handle({ kind: "invalidate" }), LifecycleError);
});
