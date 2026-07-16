import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  CancelledError,
  createCancellationController,
  createCallerFingerprint,
  createCapabilityRegistry,
  createDiagnosticsSink,
  createHolm,
  createInvocationContext,
  createReadonlyBytes,
  createStaticCallerProvider,
  invokeRuntime,
  ProtocolError,
  UnsupportedCapabilityError,
  canonicalEncodeWireValue,
  type CapabilityOffer,
  type CallerContext,
  type HolmDiagnosticEvent,
  type InvocationControl,
  type OperationRequest,
  type OperationResponse,
  type RuntimeAdapter,
  type WireValue,
} from "../../../src/core/index.js";
import { createInvocationResponseTracker } from "../../../src/core/invoke.js";

export type RuntimeAdapterConformanceHandler = (
  request: OperationRequest,
  control: InvocationControl,
) => OperationResponse | Promise<OperationResponse>;

export interface RuntimeAdapterConformanceOptions {
  readonly id?: string;
  readonly offers?: readonly CapabilityOffer[];
  readonly handlers?: Readonly<Record<string, RuntimeAdapterConformanceHandler>>;
}

export interface RuntimeAdapterConformanceTarget<Adapter extends RuntimeAdapter> {
  readonly name: string;
  createAdapter(options: RuntimeAdapterConformanceOptions): Adapter;
  getRequests(adapter: Adapter): readonly OperationRequest[];
  getControls(adapter: Adapter): readonly InvocationControl[];
}

const appRequestCapability = { id: "holm.http.app", major: 1 };
const appRequestOffer = {
  id: "holm.http.app",
  origin: "runtime" as const,
  version: { major: 1, minor: 0 },
};
const reportsCapability = { id: "com.example.reports", major: 1, minMinor: 1 };
const reportsOffer = {
  id: "com.example.reports",
  origin: "runtime" as const,
  version: { major: 1, minor: 2 },
};
const callerContext: CallerContext = {
  surface: "test",
  principal: { kind: "member", id: "member-1" },
  app: { id: "app-1" },
  scope: { type: "team", id: "team-1" },
};

export function runRuntimeAdapterConformance<Adapter extends RuntimeAdapter>(
  target: RuntimeAdapterConformanceTarget<Adapter>,
): void {
  test(`${target.name} copies and freezes app requests, caller context, binary values, responses, and metadata`, async () => {
    const requestPayload = {
      method: "POST",
      path: "/api/apps/app-1/reports",
      body: {
        title: "quarterly",
        attachment: createReadonlyBytes([1, 2, 3, 4]),
      },
      error: {
        status: 422,
        code: "validation_error",
        message: "Invalid report payload.",
      },
    };
    const originalPayloadEncoding = canonicalEncodeWireValue(requestPayload);
    const mutableCaller = {
      surface: "test" as const,
      principal: { kind: "member" as const, id: "member-1" },
      app: { id: "app-1" },
    };
    const responsePayload = { ok: true, bytes: createReadonlyBytes([9, 8]), labels: ["before"] };
    const responseMetadata = { trace: { id: "trace-1" }, method: "POST" };
    let handlerRequest: OperationRequest | undefined;
    let handlerControl: InvocationControl | undefined;

    const adapter = target.createAdapter({
      offers: [appRequestOffer],
      handlers: {
        "holm.http.app:request": (request, control) => {
          handlerRequest = request;
          handlerControl = control;
          assert.equal(Object.isFrozen(request), true);
          assert.equal(Object.isFrozen(request.capability), true);
          assert.equal(Object.isFrozen(request.caller), true);
          assert.equal(Object.isFrozen(request.payload), true);
          assert.equal((request.payload as { readonly action?: unknown }).action, undefined);
          assert.equal((request.payload as { readonly actionId?: unknown }).actionId, undefined);
          assert.equal(canonicalEncodeWireValue(request.payload), originalPayloadEncoding);
          assert.deepEqual(request.caller.app, { id: "app-1" });
          return {
            requestId: request.requestId,
            payload: responsePayload,
            metadata: responseMetadata,
          };
        },
      },
    });
    const request = makeRequest({
      capability: appRequestCapability,
      operation: "request",
      payload: requestPayload,
      caller: mutableCaller,
      requestId: "req-holm-post",
    });
    const control = { timeoutMs: 25 };

    const response = await adapter.invoke(request, control);
    requestPayload.body.title = "mutated";
    requestPayload.body.attachment = createReadonlyBytes([0]);
    mutableCaller.app = { id: "app-mutated" };
    responsePayload.labels.push("after");
    responseMetadata.trace.id = "trace-mutated";

    const storedRequest = target.getRequests(adapter)[0];
    const storedControl = target.getControls(adapter)[0];
    assert.notEqual(handlerRequest, request);
    assert.equal(handlerRequest, storedRequest);
    assert.notEqual(handlerControl, control);
    assert.equal(handlerControl, storedControl);
    assert.equal(canonicalEncodeWireValue(storedRequest?.payload), originalPayloadEncoding);
    assert.deepEqual(storedRequest?.caller.app, { id: "app-1" });
    assert.deepEqual(storedControl, { timeoutMs: 25 });
    assert.equal(Object.isFrozen(response), true);
    assert.equal(Object.isFrozen(response.payload), true);
    assert.equal(Object.isFrozen(response.metadata), true);
    assert.equal(
      canonicalEncodeWireValue(response.payload),
      canonicalEncodeWireValue({ ok: true, bytes: createReadonlyBytes([9, 8]), labels: ["before"] }),
    );
    assert.deepEqual(response.metadata, { trace: { id: "trace-1" }, method: "POST" });
  });

  test(`${target.name} rejects pre-cancelled and unsupported direct invocations before handler execution`, async () => {
    let handlerCalls = 0;
    const adapter = target.createAdapter({
      offers: [],
      handlers: {
        "com.example.reports:list": (request) => {
          handlerCalls += 1;
          return { requestId: request.requestId, payload: { shouldNotRun: true } };
        },
      },
    });
    const cancelled = createCancellationController();
    cancelled.cancel("caller-left");

    await assert.rejects(
      () =>
        adapter.invoke(
          makeRequest({
            capability: reportsCapability,
            operation: "list",
            payload: null,
            requestId: "req-direct-cancelled",
          }),
          { cancellation: cancelled.signal },
        ),
      (error: unknown) => error instanceof CancelledError && error.code === "operation_cancelled",
    );
    await assert.rejects(
      () =>
        adapter.invoke(
          makeRequest({
            capability: reportsCapability,
            operation: "list",
            payload: null,
            requestId: "req-direct-unsupported",
          }),
          {},
        ),
      (error: unknown) => error instanceof UnsupportedCapabilityError && error.code === "unsupported_capability",
    );

    assert.equal(handlerCalls, 0);
    assert.equal(target.getRequests(adapter).length, 0);
  });

  test(`${target.name} reports missing capabilities through the SDK core before handler execution`, async () => {
    let handlerCalls = 0;
    const adapter = target.createAdapter({
      offers: [],
      handlers: {
        "com.example.reports:list": (request) => {
          handlerCalls += 1;
          return { requestId: request.requestId, payload: { shouldNotRun: true } };
        },
      },
    });
    const holm = createHolm({
      runtime: adapter,
      caller: createStaticCallerProvider(callerContext),
    });

    await assert.rejects(
      () =>
        holm.invoke({
          capability: reportsCapability,
          operation: "list",
          payload: null,
          requestId: "req-core-unsupported",
        }),
      (error: unknown) =>
        error instanceof UnsupportedCapabilityError &&
        (error.toJSON().details as { readonly adapter?: unknown } | undefined)?.adapter === adapter.id &&
        (error.toJSON().details as { readonly surface?: unknown } | undefined)?.surface === adapter.surface,
    );
    assert.equal(handlerCalls, 0);
    assert.equal(target.getRequests(adapter).length, 0);
  });

  test(`${target.name} handles cancellation, duplicate, late, and mismatched responses deterministically`, async () => {
    const events: HolmDiagnosticEvent[] = [];
    let resolveLate: ((response: OperationResponse) => void) | undefined;
    let resolveLateStarted: (() => void) | undefined;
    const lateStarted = new Promise<void>((resolve) => {
      resolveLateStarted = resolve;
    });
    let handlerCalls = 0;
    const adapter = target.createAdapter({
      offers: [reportsOffer],
      handlers: {
        "com.example.reports:list": (request) => {
          handlerCalls += 1;
          return { requestId: request.requestId, payload: { ok: true } };
        },
        "com.example.reports:late": (request) => {
          handlerCalls += 1;
          resolveLateStarted?.();
          return new Promise<OperationResponse>((resolve) => {
            resolveLate = resolve;
          }).then(() => ({ requestId: request.requestId, payload: { late: true } }));
        },
        "com.example.reports:mismatch": () => {
          handlerCalls += 1;
          return { requestId: "req-other", payload: { crossed: true } };
        },
      },
    });
    const tracker = createInvocationResponseTracker({
      clock: adapter.clock,
      diagnostics: createDiagnosticsSink((event) => {
        events.push(event);
      }),
    });

    const response = await invokeRuntime(
      {
        runtime: adapter,
        capabilities: createCapabilityRegistry([reportsOffer]),
        caller: createStaticCallerProvider(callerContext),
        capability: reportsCapability,
        operation: "list",
        payload: { filter: "open" },
        requestId: "req-duplicate",
      },
      tracker,
    );
    assert.deepEqual(response.payload, { ok: true });

    await assert.rejects(
      () =>
        invokeRuntime(
          {
            runtime: adapter,
            capabilities: createCapabilityRegistry([reportsOffer]),
            caller: createStaticCallerProvider(callerContext),
            capability: reportsCapability,
            operation: "list",
            payload: { filter: "again" },
            requestId: "req-duplicate",
          },
          tracker,
        ),
      (error: unknown) => error instanceof ProtocolError && error.code === "runtime_request_duplicate",
    );

    await assert.rejects(
      () =>
        invokeRuntime(
          {
            runtime: adapter,
            capabilities: createCapabilityRegistry([reportsOffer]),
            caller: createStaticCallerProvider(callerContext),
            capability: reportsCapability,
            operation: "mismatch",
            payload: null,
            requestId: "req-expected",
          },
          tracker,
        ),
      (error: unknown) => error instanceof ProtocolError && error.code === "runtime_response_mismatch",
    );

    const holm = createHolm({
      runtime: adapter,
      caller: createStaticCallerProvider(callerContext),
      diagnostics: createDiagnosticsSink((event) => {
        events.push(event);
      }),
    });
    await holm.start();
    const cancellation = createCancellationController();
    const pending = holm.invoke({
      capability: reportsCapability,
      operation: "late",
      payload: null,
      requestId: "req-late",
      control: { cancellation: cancellation.signal },
    });
    await lateStarted;
    cancellation.cancel("caller-left");
    await assert.rejects(
      () => pending,
      (error: unknown) => error instanceof CancelledError && error.code === "operation_cancelled",
    );
    resolveLate?.({ requestId: "req-late", payload: { late: true } });
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    assert.equal(handlerCalls, 3);
    assert.equal(events.some((event) => event.code === "runtime_request_duplicate"), true);
    assert.equal(events.some((event) => event.code === "runtime_response_mismatch"), true);
    assert.equal(events.some((event) => event.code === "runtime_response_late"), true);
    await holm.dispose();
  });
}

function makeRequest(options: {
  readonly capability: { readonly id: string; readonly major: number; readonly minMinor?: number };
  readonly operation: string;
  readonly payload: WireValue;
  readonly requestId: string;
  readonly caller?: CallerContext;
}): OperationRequest {
  const caller = options.caller ?? callerContext;
  return {
    requestId: options.requestId,
    capability: options.capability,
    operation: options.operation,
    caller: createInvocationContext(caller, options.requestId, 100, "conformance"),
    callerFingerprint: createCallerFingerprint(caller),
    payload: options.payload,
  };
}
