import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  CancelledError,
  createCancellationController,
  createHolm,
  InvalidCapabilityRequirementError,
  LifecycleError,
  TimeoutError,
  UnsupportedCapabilityError,
  type OperationRequest,
  type RuntimeAdapter,
} from "../../../src/core/index.js";
import { createCancellationScope } from "../../../src/core/cancellation.js";
import { createFakeClock, createInMemoryRuntimeAdapter } from "../../../src/test/index.js";

const reportsCapability = { id: "com.example.reports", major: 1 };
const reportsOffer = {
  id: "com.example.reports",
  origin: "runtime" as const,
  version: { major: 1, minor: 0 },
};
const testCaller = { surface: "test" as const, principal: { kind: "anonymous" as const } };

function createLifecycleRuntime(effects: string[]): RuntimeAdapter {
  const fake = createFakeClock();
  return {
    id: "runtime-lifecycle",
    surface: "test",
    clock: fake.clock,
    scheduler: fake.scheduler,
    async start() {
      effects.push("runtime:start");
      return [reportsOffer];
    },
    async invoke(request) {
      effects.push(`runtime:invoke:${request.requestId}`);
      return { requestId: request.requestId, payload: { ok: true } };
    },
    async dispose() {
      effects.push("runtime:dispose");
    },
  };
}

test("lifecycle createHolm starts explicitly and first invoke shares idempotent startup", async () => {
  const effects: string[] = [];
  const holm = createHolm({
    runtime: createLifecycleRuntime(effects),
    caller: { current: () => testCaller },
  });

  assert.equal(holm.lifecycle.state, "created");
  assert.equal(holm.capabilities.getSnapshot().offers.length, 0);

  await Promise.all([holm.start(), holm.start()]);
  assert.equal(holm.lifecycle.state, "ready");
  assert.deepEqual(holm.capabilities.require(reportsCapability), reportsOffer);

  const response = await holm.invoke({
    capability: reportsCapability,
    operation: "list",
    payload: null,
    requestId: "req-1",
  });

  assert.deepEqual(response.payload, { ok: true });
  await holm.dispose();
  await holm.dispose();
  assert.equal(holm.lifecycle.state, "disposed");
  assert.deepEqual(effects, ["runtime:start", "runtime:invoke:req-1", "runtime:dispose"]);
});

test("lifecycle rolls back runtime and extensions when extension start fails", async () => {
  const effects: string[] = [];
  const fake = createFakeClock();
  const runtime: RuntimeAdapter = {
    id: "runtime-rollback",
    surface: "test",
    clock: fake.clock,
    scheduler: fake.scheduler,
    async start() {
      effects.push("runtime:start");
      return [reportsOffer];
    },
    async invoke(request) {
      return { requestId: request.requestId, payload: null };
    },
    async dispose() {
      effects.push("runtime:dispose");
    },
  };

  const holm = createHolm({
    runtime,
    caller: { current: () => testCaller },
    extensions: [
      {
        id: "com.example.alpha",
        namespace: "alpha",
        version: { major: 1, minor: 0 },
        setup: () => ({
          api: { ready: true },
          start: () => {
            effects.push("extension:alpha:start");
          },
          dispose: () => {
            effects.push("extension:alpha:dispose");
          },
        }),
      },
      {
        id: "com.example.bravo",
        namespace: "bravo",
        version: { major: 1, minor: 0 },
        setup: () => ({
          api: { ready: false },
          start: () => {
            effects.push("extension:bravo:start");
            throw new Error("bravo failed");
          },
          dispose: () => {
            effects.push("extension:bravo:dispose");
          },
        }),
      },
    ] as const,
  });

  assert.equal(holm.alpha.ready, true);
  await assert.rejects(() => holm.start(), LifecycleError);
  assert.equal(holm.lifecycle.state, "failed");
  await holm.dispose();
  assert.deepEqual(effects, [
    "runtime:start",
    "extension:alpha:start",
    "extension:bravo:start",
    "extension:alpha:dispose",
    "runtime:dispose",
  ]);
});

test("lifecycle rejects pre-cancelled work before adapter invocation", async () => {
  const runtime = createInMemoryRuntimeAdapter({ offers: [reportsOffer] });
  const cancellation = createCancellationController();
  cancellation.cancel("caller left");
  const holm = createHolm({ runtime, caller: { current: () => testCaller } });

  await assert.rejects(
    () =>
      holm.invoke({
        capability: reportsCapability,
        operation: "list",
        payload: null,
        requestId: "req-cancelled",
        control: { cancellation: cancellation.signal },
      }),
    (error: unknown) => error instanceof CancelledError && error.code === "operation_cancelled",
  );
  assert.equal(runtime.requests.length, 0);
});

test("lifecycle timeouts use the injected scheduler and ignore late adapter results", async () => {
  const fake = createFakeClock();
  const seen: OperationRequest[] = [];
  const runtime = createInMemoryRuntimeAdapter({
    clock: fake.clock,
    scheduler: fake.scheduler,
    offers: [reportsOffer],
    handlers: {
      "com.example.reports:list": (request) => {
        seen.push(request);
        return new Promise((resolve) => {
          fake.scheduler.schedule(50, () => {
            resolve({ requestId: request.requestId, payload: { late: true } });
          });
        });
      },
    },
  });
  const holm = createHolm({ runtime, caller: { current: () => testCaller } });
  await holm.start();

  const result = holm.invoke({
    capability: reportsCapability,
    operation: "list",
    payload: null,
    requestId: "req-timeout",
    control: { timeoutMs: 10 },
  });
  await Promise.resolve();
  fake.advanceBy(10);

  await assert.rejects(
    () => result,
    (error: unknown) => error instanceof TimeoutError && error.code === "operation_timeout",
  );
  assert.equal(seen[0]?.requestId, "req-timeout");
  assert.equal(runtime.requests.length, 1);
  fake.advanceBy(40);
});

test("lifecycle isolates two instances with deterministic fakes", async () => {
  const leftFake = createFakeClock(100);
  const rightFake = createFakeClock(900);
  const leftRuntime = createInMemoryRuntimeAdapter({
    id: "left-runtime",
    clock: leftFake.clock,
    scheduler: leftFake.scheduler,
    offers: [reportsOffer],
    handlers: {
      "com.example.reports:list": (request) => ({
        requestId: request.requestId,
        payload: { runtime: "left", at: request.caller.startedAt, caller: request.callerFingerprint },
      }),
    },
  });
  const rightRuntime = createInMemoryRuntimeAdapter({
    id: "right-runtime",
    clock: rightFake.clock,
    scheduler: rightFake.scheduler,
    offers: [reportsOffer],
    handlers: {
      "com.example.reports:list": (request) => ({
        requestId: request.requestId,
        payload: { runtime: "right", at: request.caller.startedAt, caller: request.callerFingerprint },
      }),
    },
  });

  const left = createHolm({
    runtime: leftRuntime,
    caller: { current: () => ({ surface: "test", principal: { kind: "member", id: "left" } }) },
  });
  const right = createHolm({
    runtime: rightRuntime,
    caller: { current: () => ({ surface: "test", principal: { kind: "member", id: "right" } }) },
  });

  const [leftResponse, rightResponse] = await Promise.all([
    left.invoke({ capability: reportsCapability, operation: "list", payload: null, requestId: "left-1" }),
    right.invoke({ capability: reportsCapability, operation: "list", payload: null, requestId: "right-1" }),
  ]);

  assert.deepEqual(leftResponse.payload, {
    runtime: "left",
    at: 100,
    caller: leftRuntime.requests[0]?.callerFingerprint,
  });
  assert.deepEqual(rightResponse.payload, {
    runtime: "right",
    at: 900,
    caller: rightRuntime.requests[0]?.callerFingerprint,
  });
  assert.notEqual(leftRuntime.requests[0]?.callerFingerprint, rightRuntime.requests[0]?.callerFingerprint);
  assert.equal(left.capabilities.getSnapshot().revision, 1);
  assert.equal(right.capabilities.getSnapshot().revision, 1);
});

test("lifecycle rejects new operations during and after disposal", async () => {
  const runtime = createInMemoryRuntimeAdapter({ offers: [reportsOffer] });
  const holm = createHolm({ runtime, caller: { current: () => testCaller } });

  await holm.dispose();

  await assert.rejects(
    () => holm.invoke({ capability: reportsCapability, operation: "list", payload: null, requestId: "req-disposed" }),
    (error: unknown) => error instanceof LifecycleError && error.code === "lifecycle_disposed",
  );
});

test("lifecycle cancellation controllers notify once and support late listeners", () => {
  const cancellation = createCancellationController();
  const seen: string[] = [];
  const unsubscribe = cancellation.signal.onCancel(() => {
    seen.push(cancellation.signal.reason ?? "none");
  });

  unsubscribe();
  unsubscribe();
  cancellation.cancel("first");
  cancellation.cancel("second");
  cancellation.signal.onCancel(() => {
    seen.push(cancellation.signal.reason ?? "none");
  });

  assert.equal(cancellation.signal.cancelled, true);
  assert.equal(cancellation.signal.reason, "first");
  assert.deepEqual(seen, ["first"]);
});

test("lifecycle validates timeout controls and cancellation without reasons", async () => {
  const runtime = createInMemoryRuntimeAdapter({ offers: [reportsOffer] });
  const holm = createHolm({ runtime, caller: { current: () => testCaller } });
  await holm.start();

  await assert.rejects(
    () => holm.invoke({
      capability: reportsCapability,
      operation: "list",
      payload: null,
      requestId: "req-invalid-timeout",
      control: { timeoutMs: -1 },
    }),
    TimeoutError,
  );

  const cancellation = createCancellationController();
  cancellation.cancel();
  await assert.rejects(
    () => holm.invoke({
      capability: reportsCapability,
      operation: "list",
      payload: null,
      requestId: "req-cancelled-no-reason",
      control: { cancellation: cancellation.signal },
    }),
    (error: unknown) => error instanceof CancelledError && error.toJSON().details === undefined,
  );
});

test("lifecycle propagates caller cancellation and adapter rejections after invocation starts", async () => {
  const fake = createFakeClock();
  const cancellation = createCancellationController();
  const runtime = createInMemoryRuntimeAdapter({
    clock: fake.clock,
    scheduler: fake.scheduler,
    offers: [reportsOffer],
    handlers: {
      "com.example.reports:wait": (_request, control) => new Promise((resolve) => {
        control.cancellation?.onCancel(() => {
          resolve({ requestId: "req-caller-cancel", payload: { cancelled: control.cancellation?.reason ?? null } });
        });
      }),
      "com.example.reports:reject": () => Promise.reject(new Error("adapter rejected")),
    },
  });
  const holm = createHolm({ runtime, caller: { current: () => testCaller } });
  await holm.start();

  const waiting = holm.invoke({
    capability: reportsCapability,
    operation: "wait",
    payload: null,
    requestId: "req-caller-cancel",
    control: { cancellation: cancellation.signal },
  });
  await Promise.resolve();
  cancellation.cancel("manual");

  await assert.rejects(
    () => waiting,
    (error: unknown) =>
      error instanceof CancelledError &&
      (error.toJSON().details as { readonly reason?: unknown } | undefined)?.reason === "manual",
  );
  await assert.rejects(
    () => holm.invoke({ capability: reportsCapability, operation: "reject", payload: null, requestId: "req-reject" }),
    /adapter rejected/,
  );
  await assert.rejects(
    () => holm.invoke({
      capability: { id: "com.example.missing", major: 1 },
      operation: "missing",
      payload: null,
      requestId: "req-missing-capability",
    }),
    UnsupportedCapabilityError,
  );
});

test("lifecycle disposal cancels owned in-flight work", async () => {
  const runtime = createInMemoryRuntimeAdapter({
    offers: [reportsOffer],
    handlers: {
      "com.example.reports:wait": (_request, control) => new Promise((resolve) => {
        control.cancellation?.onCancel(() => {
          resolve({ requestId: "req-owned-cancel", payload: control.cancellation?.reason ?? null });
        });
      }),
    },
  });
  const holm = createHolm({ runtime, caller: { current: () => testCaller } });
  await holm.start();

  const waiting = holm.invoke({
    capability: reportsCapability,
    operation: "wait",
    payload: null,
    requestId: "req-owned-cancel",
  });
  await Promise.resolve();
  await holm.dispose();

  await assert.rejects(
    () => waiting,
    (error: unknown) =>
      error instanceof CancelledError &&
      (error.toJSON().details as { readonly reason?: unknown } | undefined)?.reason === "disposed",
  );
  assert.equal(runtime.disposeCount, 1);
});

test("lifecycle validates extension capability requirements after runtime start", async () => {
  const runtime = createInMemoryRuntimeAdapter({ offers: [] });
  const holm = createHolm({
    runtime,
    caller: { current: () => testCaller },
    extensions: [
      {
        id: "com.example.needs_reports",
        namespace: "needsReports",
        version: { major: 1, minor: 0 },
        requiresCapabilities: [reportsCapability],
        setup: () => ({ api: { ready: true } }),
      },
    ] as const,
  });

  await assert.rejects(() => holm.start(), LifecycleError);
  assert.equal(runtime.startCount, 1);
  assert.equal(runtime.disposeCount, 1);
  assert.equal(holm.lifecycle.state, "failed");
});

test("lifecycle surfaces startup rollback and disposal cleanup failures", async () => {
  const effects: string[] = [];
  const fake = createFakeClock();
  const rollbackRuntime: RuntimeAdapter = {
    id: "runtime-rollback-fails",
    surface: "test",
    clock: fake.clock,
    scheduler: fake.scheduler,
    async start() {
      effects.push("rollback:start");
      return [reportsOffer];
    },
    async invoke(request) {
      return { requestId: request.requestId, payload: null };
    },
    async dispose() {
      effects.push("rollback:dispose");
      throw new Error("runtime rollback failed");
    },
  };
  const rollbackHolm = createHolm({
    runtime: rollbackRuntime,
    caller: { current: () => testCaller },
    extensions: [
      {
        id: "com.example.broken_start",
        namespace: "brokenStart",
        version: { major: 1, minor: 0 },
        setup: () => ({
          api: { ok: false },
          start: () => {
            effects.push("extension:start");
            throw new Error("extension start failed");
          },
        }),
      },
    ] as const,
  });
  await assert.rejects(
    () => rollbackHolm.start(),
    (error: unknown) => error instanceof LifecycleError && /runtime rollback failed/.test(String(error.cause)),
  );

  const disposalRuntime: RuntimeAdapter = {
    id: "runtime-disposal-fails",
    surface: "test",
    clock: fake.clock,
    scheduler: fake.scheduler,
    async start() {
      effects.push("disposal:start");
      return [reportsOffer];
    },
    async invoke(request) {
      return { requestId: request.requestId, payload: null };
    },
    async dispose() {
      effects.push("disposal:runtime:dispose");
      throw new Error("runtime disposal failed");
    },
  };
  const disposalHolm = createHolm({
    runtime: disposalRuntime,
    caller: { current: () => testCaller },
    extensions: [
      {
        id: "com.example.broken_dispose",
        namespace: "brokenDispose",
        version: { major: 1, minor: 0 },
        setup: () => ({
          api: { ok: true },
          dispose: () => {
            effects.push("extension:dispose");
            throw new Error("extension disposal failed");
          },
        }),
      },
    ] as const,
  });
  await disposalHolm.start();
  await assert.rejects(
    () => disposalHolm.dispose(),
    (error: unknown) => error instanceof LifecycleError && error.cause instanceof AggregateError,
  );
  assert.deepEqual(effects, [
    "rollback:start",
    "extension:start",
    "rollback:dispose",
    "disposal:start",
    "extension:dispose",
    "disposal:runtime:dispose",
  ]);
});

test("lifecycle fake utilities expose deterministic scheduling and mutable handlers", async () => {
  const fake = createFakeClock(5);
  const effects: string[] = [];
  const later = fake.scheduler.schedule(10, () => {
    effects.push("later");
  });
  fake.scheduler.schedule(1, () => {
    effects.push("first");
  });
  assert.equal(fake.pending(), 2);
  later.cancel();
  fake.clock.advanceBy(1);
  assert.deepEqual(effects, ["first"]);
  assert.equal(fake.pending(), 0);
  fake.scheduler.schedule(5, () => {
    effects.push("set");
  });
  fake.clock.set(11);
  fake.scheduler.runDue();
  assert.deepEqual(effects, ["first", "set"]);
  assert.throws(() => fake.advanceBy(-1), TypeError);
  assert.throws(() => fake.clock.set(Number.NaN), TypeError);
  assert.throws(() => fake.scheduler.schedule(-1, () => undefined), TypeError);

  const runtime = createInMemoryRuntimeAdapter({ offers: [] });
  runtime.setOffers([reportsOffer]);
  runtime.setHandler("com.example.reports:custom", (request) => ({
    requestId: request.requestId,
    payload: { custom: true },
  }));
  const holm = createHolm({ runtime, caller: { current: () => testCaller } });
  await holm.start();
  const custom = await holm.invoke({
    capability: reportsCapability,
    operation: "custom",
    payload: { ignored: true },
    requestId: "req-custom",
  });
  const echo = await holm.invoke({
    capability: reportsCapability,
    operation: "echo",
    payload: { echo: true },
    requestId: "req-echo",
  });
  await holm.dispose();

  assert.deepEqual(custom.payload, { custom: true });
  assert.deepEqual(echo.payload, { echo: true });
  assert.equal(runtime.startCount, 1);
  assert.equal(runtime.disposeCount, 1);
  assert.equal(runtime.controls.length, 2);
});

test("lifecycle cancellation scopes can be cancelled before awaiting work", async () => {
  const fake = createFakeClock();
  const scope = createCancellationScope({ scheduler: fake.scheduler });
  scope.cancel("scope");

  await assert.rejects(
    () => scope.race(Promise.resolve("late")),
    (error: unknown) =>
      error instanceof CancelledError &&
      (error.toJSON().details as { readonly reason?: unknown } | undefined)?.reason === "scope",
  );
  scope.cleanup();
});

test("lifecycle rethrows invalid capability requirements from invoke", async () => {
  const runtime = createInMemoryRuntimeAdapter({ offers: [reportsOffer] });
  const holm = createHolm({ runtime, caller: { current: () => testCaller } });
  await holm.start();

  await assert.rejects(
    () => holm.invoke({
      capability: { id: "unscoped", major: 1 },
      operation: "bad",
      payload: null,
      requestId: "req-invalid-capability",
    }),
    InvalidCapabilityRequirementError,
  );
});

test("lifecycle surfaces a single runtime disposal failure", async () => {
  const fake = createFakeClock();
  const runtime: RuntimeAdapter = {
    id: "runtime-single-dispose-failure",
    surface: "test",
    clock: fake.clock,
    scheduler: fake.scheduler,
    async start() {
      return [reportsOffer];
    },
    async invoke(request) {
      return { requestId: request.requestId, payload: null };
    },
    async dispose() {
      throw new Error("single runtime dispose failure");
    },
  };
  const holm = createHolm({ runtime, caller: { current: () => testCaller } });
  await holm.start();

  await assert.rejects(
    () => holm.dispose(),
    (error: unknown) => error instanceof LifecycleError && /single runtime dispose failure/.test(String(error.cause)),
  );
});

test("lifecycle errors may omit details", () => {
  const error = new LifecycleError({ code: "lifecycle_custom", message: "Custom lifecycle" });

  assert.equal(error.toJSON().details, undefined);
});
