import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  CancelledError,
  CapabilityVersionError,
  createCancellationController,
  createCapabilityRegistry,
  createDiagnosticsSink,
  createHolm,
  createStaticCallerProvider,
  createCallerFingerprint,
  invokeRuntime,
  LifecycleError,
  ProtocolError,
  runtimeEnvelopeProtocol,
  UnsupportedCapabilityError,
  type CallerContext,
  type ExtensionSetupContext,
  type HolmDiagnosticEvent,
  type InvocationControl,
  type OperationRequest,
  type OperationResponse,
  type RuntimeAdapter,
} from "../../../src/core/index.js";
import { createInvocationResponseTracker } from "../../../src/core/invoke.js";

type RecordingRuntime = RuntimeAdapter & {
  readonly calls: OperationRequest[];
  readonly controls: InvocationControl[];
};

const capability = { id: "com.example.reports", major: 1, minMinor: 1 };
const matchingOffer = {
  id: "com.example.reports",
  origin: "runtime" as const,
  version: { major: 1, minor: 2 },
};

function createRecordingRuntime(
  handler?: (request: OperationRequest, control: InvocationControl) => OperationResponse | Promise<OperationResponse>,
): RecordingRuntime {
  const calls: OperationRequest[] = [];
  const controls: InvocationControl[] = [];
  return {
    id: "runtime-test",
    surface: "test",
    clock: { now: () => 1234 },
    scheduler: { schedule: () => ({ cancel: () => undefined }) },
    calls,
    controls,
    async start() {
      return [matchingOffer];
    },
    async invoke(request, control) {
      calls.push(request);
      controls.push(control);
      return (
      handler?.(request, control) ?? {
        requestId: request.requestId,
        payload: { ok: true },
      }
    );
    },
    async dispose() {
      return undefined;
    },
  };
}

test("runtime invocation resolves a fresh caller for every call and exposes deterministic partitions", async () => {
  assert.equal(runtimeEnvelopeProtocol, "holm.sdk.runtime/1");

  const contexts: CallerContext[] = [
    { surface: "test", principal: { kind: "member", id: "member-a" }, app: { id: "app-1" } },
    { surface: "test", principal: { kind: "member", id: "member-b" }, app: { id: "app-1" } },
  ];
  let currentCalls = 0;
  const caller = {
    async current(): Promise<CallerContext> {
      return contexts[currentCalls++] as CallerContext;
    },
  };
  const runtime = createRecordingRuntime();
  const partitions: string[] = [];

  await invokeRuntime({
    runtime,
    capabilities: createCapabilityRegistry([matchingOffer]),
    caller,
    capability,
    operation: "list",
    payload: { filter: "open" },
    requestId: "req-1",
    reason: "first",
    control: { timeoutMs: 10 },
    onCallerPartition(partition) {
      partitions.push(partition.fingerprint);
    },
  });
  await invokeRuntime({
    runtime,
    capabilities: createCapabilityRegistry([matchingOffer]),
    caller,
    capability,
    operation: "list",
    payload: { filter: "closed" },
    requestId: "req-2",
  });

  assert.equal(currentCalls, 2);
  assert.equal(runtime.calls[0]?.caller.principal.kind, "member");
  assert.equal(runtime.calls[0]?.caller.invocationId, "req-1");
  assert.equal(runtime.calls[0]?.caller.startedAt, 1234);
  assert.equal(runtime.calls[0]?.caller.reason, "first");
  assert.equal(runtime.controls[0]?.timeoutMs, 10);
  assert.equal(runtime.calls[1]?.caller.principal.kind, "member");
  assert.equal(runtime.calls[1]?.caller.reason, undefined);
  assert.notEqual(runtime.calls[0]?.callerFingerprint, runtime.calls[1]?.callerFingerprint);
  assert.deepEqual(partitions, [runtime.calls[0]?.callerFingerprint]);
});

test("runtime invocation copies request payload, caller context, and response values across the adapter boundary", async () => {
  const mutablePayload = { nested: { count: 1 }, list: ["before"] };
  const mutableContext = {
    surface: "test" as const,
    principal: { kind: "member" as const, id: "member-a" },
    app: { id: "app-1" },
  };
  let responsePayload = { nested: { ok: true }, list: ["response"] };
  const runtime = createRecordingRuntime((request) => {
    mutablePayload.nested.count = 99;
    mutablePayload.list.push("after");
    mutableContext.app.id = "app-mutated";
    assert.deepEqual(request.payload, { nested: { count: 1 }, list: ["before"] });
    assert.deepEqual(request.caller.app, { id: "app-1" });
    return {
      requestId: request.requestId,
      payload: responsePayload,
      metadata: { trace: { id: "trace-1" } },
    };
  });

  const response = await invokeRuntime({
    runtime,
    capabilities: createCapabilityRegistry([matchingOffer]),
    caller: createStaticCallerProvider(mutableContext),
    capability,
    operation: "list",
    payload: mutablePayload,
    requestId: "req-copy",
  });
  responsePayload.nested.ok = false;
  responsePayload.list.push("mutated");

  assert.deepEqual(response, {
    requestId: "req-copy",
    payload: { nested: { ok: true }, list: ["response"] },
    metadata: { trace: { id: "trace-1" } },
  });
  assert.notEqual(response.payload, responsePayload);
  assert.equal(Object.isFrozen(response.payload), true);
});

test("runtime invocation rejects responses that do not correlate to the request id", async () => {
  const runtime = createRecordingRuntime(() => ({ requestId: "req-other", payload: { crossed: true } }));

  await assert.rejects(
    () =>
      invokeRuntime({
        runtime,
        capabilities: createCapabilityRegistry([matchingOffer]),
        caller: createStaticCallerProvider({ surface: "test", principal: { kind: "anonymous" } }),
        capability,
        operation: "list",
        payload: null,
        requestId: "req-expected",
      }),
    (error: unknown) => error instanceof ProtocolError && error.code === "runtime_response_mismatch",
  );
});

test("runtime response tracking ignores and diagnoses duplicate and late responses deterministically", () => {
  const events: HolmDiagnosticEvent[] = [];
  const tracker = createInvocationResponseTracker({
    clock: { now: () => 42 },
    diagnostics: createDiagnosticsSink((event) => {
      events.push(event);
    }),
    maxTerminalRequests: 2,
  });
  const accepted = tracker.begin("req-tracked");

  assert.equal(accepted.accept({ requestId: "req-tracked", payload: { version: 1 } }), "accepted");
  assert.equal(accepted.accept({ requestId: "req-tracked", payload: { version: 2 } }), "duplicate");
  assert.throws(
    () => tracker.begin("req-tracked"),
    (error: unknown) => error instanceof ProtocolError && error.code === "runtime_request_duplicate",
  );

  const cancelled = tracker.begin("req-cancelled");
  cancelled.cancel();
  assert.equal(cancelled.accept({ requestId: "req-cancelled", payload: { late: true } }), "late");

  const mismatched = tracker.begin("req-mismatch-diagnostic");
  assert.throws(
    () => mismatched.accept({ requestId: "req-other-diagnostic", payload: null }),
    (error: unknown) => error instanceof ProtocolError && error.code === "runtime_response_mismatch",
  );
  assert.deepEqual(
    events.map((event) => event.code),
    [
      "runtime_response_duplicate",
      "runtime_request_duplicate",
      "runtime_response_late",
      "runtime_response_mismatch",
    ],
  );

  const third = tracker.begin("req-third");
  assert.equal(third.accept({ requestId: "req-third", payload: null }), "accepted");
  assert.doesNotThrow(() => tracker.begin("req-tracked"));

  const cleared = tracker.begin("req-cleared");
  tracker.clear();
  assert.equal(cleared.accept({ requestId: "req-cleared", payload: null }), "late");
  assert.equal(events.at(-1)?.code, "runtime_response_late");
  assert.throws(
    () => createInvocationResponseTracker({ clock: { now: () => 0 }, maxTerminalRequests: 0 }),
    /positive integer/,
  );
  assert.throws(
    () => tracker.begin(" "),
    (error: unknown) => error instanceof ProtocolError && error.code === "runtime_request_id_invalid",
  );
});

test("runtime invocation diagnoses adapter responses that arrive after caller cancellation", async () => {
  const events: HolmDiagnosticEvent[] = [];
  let resolveResponse: ((response: OperationResponse) => void) | undefined;
  const runtime = createRecordingRuntime(
    () =>
      new Promise<OperationResponse>((resolve) => {
        resolveResponse = resolve;
      }),
  );
  const holm = createHolm({
    runtime,
    caller: createStaticCallerProvider({ surface: "test", principal: { kind: "anonymous" } }),
    diagnostics: createDiagnosticsSink((event) => {
      events.push(event);
    }),
  });
  const cancellation = createCancellationController();

  await holm.start();
  const pending = holm.invoke({
    capability,
    operation: "list",
    payload: null,
    requestId: "req-late",
    control: { cancellation: cancellation.signal },
  });
  await Promise.resolve();
  cancellation.cancel("caller-left");
  await assert.rejects(pending, CancelledError);
  resolveResponse?.({ requestId: "req-late", payload: { late: true } });
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(events.some((event) => event.code === "runtime_response_late"), true);
  await holm.dispose();
});

test("runtime caller fingerprints are deterministic, partition-safe, and do not include ambient auth fields", () => {
  const left = createCallerFingerprint({
    surface: "test",
    principal: { kind: "operator", id: "operator-1" },
    app: { id: "app-1" },
    scope: { type: "team", id: "scope-1" },
    origin: "fixture",
    token: "do-not-include",
  } as CallerContext & { readonly token: string });
  const right = createCallerFingerprint({
    origin: "fixture",
    scope: { id: "scope-1", type: "team" },
    app: { id: "app-1" },
    principal: { id: "operator-1", kind: "operator" },
    surface: "test",
    cookie: "do-not-include",
  } as CallerContext & { readonly cookie: string });

  assert.equal(left, right);
  assert.match(left, /^caller:v1:[0-9a-f]{32}$/);
  assert.equal(left.includes("operator-1"), false);
  assert.equal(left.includes("do-not-include"), false);

  const principalFingerprints = [
    createCallerFingerprint({ surface: "test", principal: { kind: "anonymous" } }),
    createCallerFingerprint({ surface: "test", principal: { kind: "browser-session" } }),
    createCallerFingerprint({ surface: "test", principal: { kind: "member", id: "member-1" } }),
    createCallerFingerprint({ surface: "test", principal: { kind: "operator" } }),
    createCallerFingerprint({ surface: "test", principal: { kind: "agent", memberId: "member-1" } }),
    createCallerFingerprint({ surface: "test", principal: { kind: "service", id: "service-1" } }),
  ];
  assert.equal(new Set(principalFingerprints).size, principalFingerprints.length);

  const partitionFingerprints = [
    createCallerFingerprint({
      surface: "test",
      principal: { kind: "member", id: "member-1" },
      app: { id: "app-1" },
      scope: { type: "team", id: "scope-1" },
    }),
    createCallerFingerprint({
      surface: "test",
      principal: { kind: "member", id: "member-2" },
      app: { id: "app-1" },
      scope: { type: "team", id: "scope-1" },
    }),
    createCallerFingerprint({
      surface: "test",
      principal: { kind: "member", id: "member-1" },
      app: { id: "app-2" },
      scope: { type: "team", id: "scope-1" },
    }),
    createCallerFingerprint({
      surface: "test",
      principal: { kind: "member", id: "member-1" },
      app: { id: "app-1" },
      scope: { type: "project", id: "scope-1" },
    }),
    createCallerFingerprint({
      surface: "test",
      principal: { kind: "member", id: "member-1" },
      app: { id: "app-1" },
      scope: { type: "team", id: "scope-2" },
    }),
  ];
  assert.equal(new Set(partitionFingerprints).size, partitionFingerprints.length);
});

test("static caller providers return isolated caller snapshots", async () => {
  const provider = createStaticCallerProvider({
    surface: "test",
    principal: { kind: "service", id: "service-1" },
    scope: { id: "scope-1" },
  });
  const first = await provider.current();
  const second = await provider.current();

  assert.deepEqual(second, {
    surface: "test",
    principal: { kind: "service", id: "service-1" },
    scope: { id: "scope-1" },
  });
  assert.notEqual(first, second);
  assert.notEqual(first.scope, second.scope);
});

test("extension invocation seam carries lifecycle readiness, cancellation, and caller context through the core seam", async () => {
  const runtime = createRecordingRuntime();
  const holm = createHolm({
    runtime,
    caller: createStaticCallerProvider({ surface: "test", principal: { kind: "service", id: "extension-caller" } }),
    extensions: [
      {
        id: "sdk.diagnostics.probe",
        namespace: "probe",
        version: { major: 1, minor: 0 },
        setup: (context: ExtensionSetupContext) => ({
          api: {
            call: (payload: unknown, control?: InvocationControl) =>
              context.invoke({
                capability,
                operation: "list",
                payload,
                requestId: "extension-req",
                ...(control === undefined ? {} : { control }),
              }),
          },
        }),
      },
    ] as const,
  });

  await holm.start();
  const response = await holm.probe.call({ ok: true });

  assert.deepEqual(response.payload, { ok: true });
  assert.equal(runtime.calls[0]?.caller.principal.kind, "service");
  assert.equal(runtime.calls[0]?.caller.invocationId, "extension-req");
  assert.equal(typeof runtime.calls[0]?.callerFingerprint, "string");

  const cancellation = createCancellationController();
  cancellation.cancel("extension-caller-left");
  await assert.rejects(
    () => holm.probe.call({ ok: true }, { cancellation: cancellation.signal }),
    (error: unknown) =>
      error instanceof CancelledError &&
      (error.toJSON().details as { readonly reason?: unknown } | undefined)?.reason === "extension-caller-left",
  );

  await holm.dispose();
  await assert.rejects(
    () => holm.probe.call({ ok: true }),
    (error: unknown) => error instanceof LifecycleError && error.code === "lifecycle_disposed",
  );
});

test("runtime invocation fails capability checks before adapter invocation", async () => {
  const missingRuntime = createRecordingRuntime();
  await assert.rejects(
    () =>
      invokeRuntime({
        runtime: missingRuntime,
        capabilities: createCapabilityRegistry([]),
        caller: createStaticCallerProvider({ surface: "test", principal: { kind: "anonymous" } }),
        capability,
        operation: "list",
        payload: null,
        requestId: "req-missing",
      }),
    (error: unknown) =>
      error instanceof UnsupportedCapabilityError &&
      (error.toJSON().details as { readonly adapter?: unknown } | undefined)?.adapter === "runtime-test" &&
      (error.toJSON().details as { readonly surface?: unknown } | undefined)?.surface === "test",
  );
  assert.equal(missingRuntime.calls.length, 0);

  const mismatchRuntime = createRecordingRuntime();
  await assert.rejects(
    () =>
      invokeRuntime({
        runtime: mismatchRuntime,
        capabilities: createCapabilityRegistry([{ ...matchingOffer, version: { major: 2, minor: 0 } }]),
        caller: createStaticCallerProvider({ surface: "test", principal: { kind: "anonymous" } }),
        capability,
        operation: "list",
        payload: null,
        requestId: "req-mismatch",
      }),
    CapabilityVersionError,
  );
  assert.equal(mismatchRuntime.calls.length, 0);
});
