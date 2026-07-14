import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  createDiagnosticsSink,
  HolmError,
  LifecycleError,
  type HolmDiagnosticEvent,
} from "../../../src/core/index.js";
import {
  createResourceController,
  type ResourceSnapshot,
} from "../../../src/state/index.js";

interface ReportData {
  readonly count: number;
  readonly nested: {
    readonly labels: readonly string[];
  };
}

function assertReportData(snapshot: ResourceSnapshot<ReportData>): asserts snapshot is ResourceSnapshot<ReportData> & {
  readonly data: NonNullable<ResourceSnapshot<ReportData>["data"]>;
} {
  assert.notEqual(snapshot.data, undefined);
}

test("state resources expose immutable revisioned snapshots with stable references", () => {
  let now = 10;
  const controller = createResourceController<ReportData>({ clock: { now: () => now } });
  const resource = controller.resource;

  const idle = resource.getSnapshot();
  assert.equal(idle.phase, "idle");
  assert.equal(idle.revision, 0);
  assert.equal(idle.stale, false);
  assert.equal(idle.refreshing, false);
  assert.equal("data" in idle, false);
  assert.equal("updatedAt" in idle, false);
  assert.equal(resource.getSnapshot(), idle);
  assert.equal(Object.isFrozen(idle), true);

  const loading = controller.setLoading();
  assert.notEqual(loading, idle);
  assert.equal(loading.phase, "loading");
  assert.equal(loading.revision, 1);
  assert.equal(loading.stale, false);
  assert.equal(loading.refreshing, false);
  assert.equal(resource.getSnapshot(), loading);

  const source = { count: 1, nested: { labels: ["first"] } };
  now = 42;
  const ready = controller.setReady(source);
  source.nested.labels.push("mutated after setReady");

  assert.equal(ready.phase, "ready");
  assert.equal(ready.revision, 2);
  assert.equal(ready.updatedAt, 42);
  assert.equal(resource.getSnapshot(), ready);
  assertReportData(ready);
  assert.deepEqual(ready.data, { count: 1, nested: { labels: ["first"] } });
  assert.equal(Object.isFrozen(ready), true);
  assert.equal(Object.isFrozen(ready.data), true);
  assert.equal(Object.isFrozen(ready.data.nested), true);
  assert.equal(Object.isFrozen(ready.data.nested.labels), true);
});

test("state resources retain copied data through refreshing and error snapshots", () => {
  let now = 100;
  const controller = createResourceController<ReportData>({ clock: { now: () => now } });
  const ready = controller.setReady({ count: 2, nested: { labels: ["cached"] } });
  assertReportData(ready);

  const refreshing = controller.setLoading({ refreshing: true, stale: true });
  assert.equal(refreshing.phase, "loading");
  assert.equal(refreshing.refreshing, true);
  assert.equal(refreshing.stale, true);
  assertReportData(refreshing);
  assert.notEqual(refreshing.data, ready.data);
  assert.deepEqual(refreshing.data, ready.data);

  now = 125;
  const error = new HolmError({ kind: "remote", code: "report_failed", message: "Report failed." });
  const errored = controller.setError(error, { stale: true });
  assert.equal(errored.phase, "error");
  assert.equal(errored.error, error);
  assert.equal(errored.stale, true);
  assert.equal(errored.refreshing, false);
  assert.equal(errored.updatedAt, 125);
  assertReportData(errored);
  assert.notEqual(errored.data, refreshing.data);
  assert.deepEqual(errored.data, { count: 2, nested: { labels: ["cached"] } });
});

test("state resource subscriptions notify transitions and support idempotent unsubscribe and dispose", () => {
  const controller = createResourceController<ReportData>();
  const resource = controller.resource;
  const seen: string[] = [];

  const unsubscribeFirst = resource.subscribe(() => {
    seen.push(`first:${resource.getSnapshot().phase}`);
  });
  const unsubscribeSecond = resource.subscribe(() => {
    seen.push(`second:${resource.getSnapshot().phase}`);
  });

  assert.deepEqual(seen, []);
  unsubscribeFirst();
  unsubscribeFirst();

  controller.setLoading();
  assert.deepEqual(seen, ["second:loading"]);

  resource.dispose();
  assert.equal(resource.getSnapshot().phase, "disposed");
  assert.deepEqual(seen, ["second:loading", "second:disposed"]);

  unsubscribeSecond();
  resource.dispose();
  assert.deepEqual(seen, ["second:loading", "second:disposed"]);
  assert.throws(
    () => controller.setReady({ count: 1, nested: { labels: [] } }),
    (error: unknown) => error instanceof LifecycleError && error.code === "state_resource_disposed",
  );

  let lateNotifications = 0;
  const unsubscribeAfterDispose = resource.subscribe(() => {
    lateNotifications += 1;
  });
  unsubscribeAfterDispose();
  assert.equal(lateNotifications, 0);
  assert.deepEqual(seen, ["second:loading", "second:disposed"]);
});

test("state resources isolate listener failures through diagnostics", () => {
  const diagnostics: HolmDiagnosticEvent[] = [];
  const controller = createResourceController<ReportData>({
    id: "reports",
    diagnostics: createDiagnosticsSink((event) => {
      diagnostics.push(event);
    }),
  });
  const resource = controller.resource;
  let reachedHealthyListener = false;

  resource.subscribe(() => {
    throw new Error("listener token secret must not leak");
  });
  resource.subscribe(() => {
    reachedHealthyListener = true;
  });

  controller.setLoading();

  assert.equal(reachedHealthyListener, true);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.channel, "state.resource");
  assert.equal(diagnostics[0]?.code, "state_resource_listener_error");
  assert.equal(diagnostics[0]?.details?.resourceId, "reports");
  assert.equal(diagnostics[0]?.details?.phase, "loading");
  assert.equal(diagnostics[0]?.details?.revision, 1);
  assert.equal(JSON.stringify(diagnostics).includes("token secret"), false);
});

test("state resources validate inputs and cover optional lifecycle branches", () => {
  assert.throws(() => createResourceController<ReportData>({ id: " " }), /id/);

  const controller = createResourceController<ReportData>();
  assert.equal(controller.getSnapshot(), controller.resource.getSnapshot());
  assert.throws(() => controller.resource.subscribe(undefined as never), /listener/);

  const ready = controller.setReady(
    { count: 3, nested: { labels: ["optional"] } },
    { stale: true, refreshing: true },
  );
  assert.equal(ready.stale, true);
  assert.equal(ready.refreshing, true);
  assert.equal("updatedAt" in ready, false);

  const errored = controller.setError(
    new HolmError({ kind: "remote", code: "report_failed", message: "Report failed." }),
    { retainData: false, refreshing: true },
  );
  assert.equal(errored.phase, "error");
  assert.equal(errored.refreshing, true);
  assert.equal("data" in errored, false);
  assert.equal("updatedAt" in errored, false);

  const disposed = controller.dispose();
  assert.equal(disposed.phase, "disposed");
  assert.equal("updatedAt" in disposed, false);
  assert.equal(controller.dispose(), disposed);

  assert.throws(
    () => createResourceController<ReportData>({ clock: { now: () => Number.NaN } }).setReady({
      count: 1,
      nested: { labels: [] },
    }),
    /finite timestamp/,
  );
});

test("state resources support explicit value copiers without exposing mutable references", () => {
  interface MutableReport {
    items: string[];
    nested: { count: number };
  }

  const source: MutableReport = { items: ["copied"], nested: { count: 1 } };
  const controller = createResourceController<MutableReport>({
    copy: (value) => ({ items: [...value.items], nested: { count: value.nested.count } }),
  });
  const ready = controller.setReady(source);
  source.items.push("mutated");
  source.nested.count = 2;

  assert.deepEqual(ready.data, { items: ["copied"], nested: { count: 1 } });
  assert.equal(Object.isFrozen(ready.data), true);
  assert.equal(Object.isFrozen(ready.data?.items), true);
  assert.equal(Object.isFrozen(ready.data?.nested), true);

  const primitive = createResourceController<string>({ copy: (value) => value }).setReady("plain");
  assert.equal(primitive.data, "plain");

  const cycle: { self?: unknown } = {};
  cycle.self = cycle;
  const cyclic = createResourceController<unknown>({ copy: () => cycle }).setReady({});
  assert.equal((cyclic.data as { readonly self?: unknown }).self, cyclic.data);
  assert.equal(Object.isFrozen(cyclic.data), true);
});

test("state resources keep delivery deterministic when diagnostics are absent or fail", () => {
  const withoutDiagnostics = createResourceController<ReportData>();
  let firstHealthy = false;
  withoutDiagnostics.resource.subscribe(() => {
    throw new Error("ignored without diagnostics");
  });
  withoutDiagnostics.resource.subscribe(() => {
    firstHealthy = true;
  });
  assert.doesNotThrow(() => withoutDiagnostics.setLoading());
  assert.equal(firstHealthy, true);

  const throwingDiagnostics = createResourceController<ReportData>({
    diagnostics: {
      emit() {
        throw new Error("diagnostics unavailable");
      },
    },
  });
  let secondHealthy = false;
  throwingDiagnostics.resource.subscribe(() => {
    throw new Error("reported but isolated");
  });
  throwingDiagnostics.resource.subscribe(() => {
    secondHealthy = true;
  });
  assert.doesNotThrow(() => throwingDiagnostics.setLoading());
  assert.equal(secondHealthy, true);
});
