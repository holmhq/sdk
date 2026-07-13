import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  CapabilityVersionError,
  createCapabilityRegistry,
  createStaticCallerProvider,
  createCallerFingerprint,
  invokeRuntime,
  runtimeEnvelopeProtocol,
  UnsupportedCapabilityError,
  type CallerContext,
  type InvocationControl,
  type OperationRequest,
  type OperationResponse,
  type RuntimeAdapter,
} from "../../../src/core/index.js";

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
    calls,
    controls,
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

test("caller fingerprints are deterministic, partition-safe, and do not include ambient auth fields", () => {
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
  assert.match(left, /^caller:v1:[0-9a-f]{8}$/);
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
