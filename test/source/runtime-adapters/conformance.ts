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
  type HolmDiagnosticsSink,
  type InvocationControl,
  type OperationRequest,
  type OperationResponse,
  type RuntimeAdapter,
  type WireValue,
} from "../../../src/core/index.js";
import { createInvocationResponseTracker } from "../../../src/core/invoke.js";
import {
  RemoteError,
  createTransportRequest,
  type TransportAuthProvider,
} from "../../../src/transports/index.js";

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

export interface HttpAppRuntimeConformanceOptions {
  readonly baseUrl?: string | URL;
  readonly fetch: typeof fetch;
  readonly auth?: TransportAuthProvider;
  readonly cache?: false | { readonly ttlMs?: number; readonly swrMs?: number; readonly maxEntries?: number };
  readonly diagnostics?: HolmDiagnosticsSink;
}

export interface HttpAppRuntimeConformanceTarget<Adapter extends RuntimeAdapter> {
  readonly name: string;
  readonly unsupportedOperationCode?: string;
  createAdapter(options: HttpAppRuntimeConformanceOptions): Adapter;
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

export function runHttpAppRuntimeAdapterConformance<Adapter extends RuntimeAdapter>(
  target: HttpAppRuntimeConformanceTarget<Adapter>,
): void {
  const unsupportedOperationCode = target.unsupportedOperationCode ?? "unsupported_web_runtime_operation";
  test(`${target.name} preserves canonical app GET/POST transport semantics and response envelopes`, async () => {
    const calls: Array<{ readonly url: string; readonly init: RequestInit }> = [];
    const adapter = target.createAdapter({
      baseUrl: "https://app.example.test/root/",
      fetch: async (input, init = {}) => {
        calls.push({ url: String(input), init });
        if (init.method === "POST") {
          return new Response(JSON.stringify({ data: { created: true }, meta: { request_id: "remote-post" } }), {
            status: 201,
            headers: { "content-type": "application/json", "x-request-id": "remote-post" },
          });
        }
        return new Response(JSON.stringify({ data: { ok: true }, meta: { request_id: "remote-get" } }), {
          status: 200,
          headers: { "content-type": "application/json", "x-request-id": "remote-get" },
        });
      },
    });
    await adapter.start();

    const get = await adapter.invoke(
      makeRequest({
        capability: appRequestCapability,
        operation: "request",
        payload: createTransportRequest({
          method: "GET",
          url: "/api/apps/app-1/reports?existing=1#section",
          params: { z: 2, skip: null, a: "first" },
          headers: { "x-holm-request-id": "req-http-get" },
        }),
        requestId: "req-http-get",
        caller: webCaller("member-1"),
      }),
      {},
    );
    const post = await adapter.invoke(
      makeRequest({
        capability: appRequestCapability,
        operation: "request",
        payload: createTransportRequest({
          method: "POST",
          url: "/api/apps/app-1/reports",
          headers: { accept: "application/json", "content-type": "application/vnd.holm+json" },
          body: { mode: "json", value: { z: true, a: 1 } },
        }),
        requestId: "req-http-post",
        caller: webCaller("member-1"),
      }),
      {},
    );

    assert.equal(calls.length, 2);
    assert.equal(calls[0]?.url, "https://app.example.test/api/apps/app-1/reports?a=first&existing=1&z=2#section");
    assert.equal(calls[0]?.init.method, "GET");
    assert.equal(new Headers(calls[0]?.init.headers).get("x-holm-request-id"), "req-http-get");
    assert.equal(calls[1]?.url, "https://app.example.test/api/apps/app-1/reports");
    assert.equal(calls[1]?.init.method, "POST");
    assert.equal(calls[1]?.init.body, '{"a":1,"z":true}');
    assert.deepEqual(get.payload, { ok: true });
    assert.equal(get.requestId, "req-http-get");
    assert.deepEqual(get.metadata, {
      status: 200,
      meta: { request_id: "remote-get" },
      headers: { "content-type": "application/json", "x-request-id": "remote-get" },
    });
    assert.deepEqual(post.payload, { created: true });
    assert.equal(post.requestId, "req-http-post");
    assert.deepEqual(post.metadata, {
      status: 201,
      meta: { request_id: "remote-post" },
      headers: { "content-type": "application/json", "x-request-id": "remote-post" },
    });
    await adapter.dispose();

    const errorAdapter = target.createAdapter({
      fetch: async () => new Response(
        JSON.stringify({ error: { code: "holm.stable_denied", message: "Denied by policy." } }),
        { status: 403, headers: { "content-type": "application/json" } },
      ),
    });
    await errorAdapter.start();
    await assert.rejects(
      () => errorAdapter.invoke(
        makeRequest({
          capability: appRequestCapability,
          operation: "request",
          payload: createTransportRequest({ method: "GET", url: "/api/denied" }),
          requestId: "req-stable-error",
          caller: webCaller("member-1"),
        }),
        {},
      ),
      (error: unknown) => error instanceof RemoteError && error.code === "holm.stable_denied" && error.status === 403,
    );
    await errorAdapter.dispose();
  });

  test(`${target.name} keeps auth private while partitioning GET cache by caller and web session`, async () => {
    const events: HolmDiagnosticEvent[] = [];
    const seenAuthorization: string[] = [];
    let cachePartition = "member-a-session";
    let token = "secret-token-a";
    let fetchCalls = 0;
    const adapter = target.createAdapter({
      cache: { ttlMs: 30_000, swrMs: 0, maxEntries: 8 },
      diagnostics: createDiagnosticsSink((event) => {
        events.push(event);
      }),
      auth: {
        current: () => ({ kind: "bearer", scheme: "Bearer", token, cachePartition }),
      },
      fetch: async (_input, init = {}) => {
        fetchCalls += 1;
        seenAuthorization.push(new Headers(init.headers).get("authorization") ?? "");
        return new Response(JSON.stringify({ data: { call: fetchCalls } }), {
          headers: { "content-type": "application/json" },
        });
      },
    });
    const offers = await adapter.start();
    const request = createTransportRequest({
      method: "GET",
      url: "/api/private",
      headers: { "x-visible": "ok" },
      sensitive: { headers: ["x-visible"] },
    });

    const first = await adapter.invoke(makeRequest({
      capability: appRequestCapability,
      operation: "request",
      payload: request,
      requestId: "req-private-1",
      caller: webCaller("member-1"),
    }), {});
    const cached = await adapter.invoke(makeRequest({
      capability: appRequestCapability,
      operation: "request",
      payload: request,
      requestId: "req-private-2",
      caller: webCaller("member-1"),
    }), {});
    cachePartition = "member-b-session";
    token = "secret-token-b";
    const sessionChanged = await adapter.invoke(makeRequest({
      capability: appRequestCapability,
      operation: "request",
      payload: request,
      requestId: "req-private-3",
      caller: webCaller("member-1"),
    }), {});
    const callerChanged = await adapter.invoke(makeRequest({
      capability: appRequestCapability,
      operation: "request",
      payload: request,
      requestId: "req-private-4",
      caller: webCaller("member-2"),
    }), {});

    assert.deepEqual(first.payload, { call: 1 });
    assert.deepEqual(cached.payload, { call: 1 });
    assert.deepEqual(sessionChanged.payload, { call: 2 });
    assert.deepEqual(callerChanged.payload, { call: 3 });
    assert.equal(cached.requestId, "req-private-2");
    assert.equal(fetchCalls, 3);
    assert.deepEqual(seenAuthorization, ["Bearer secret-token-a", "Bearer secret-token-b", "Bearer secret-token-b"]);
    const publicState = JSON.stringify({ offers, events, first, cached, sessionChanged, callerChanged });
    assert.equal(publicState.includes("secret-token"), false);
    assert.equal(publicState.includes("member-a-session"), false);
    assert.equal(publicState.includes("member-b-session"), false);
    await adapter.dispose();

    const failing = target.createAdapter({
      auth: { current: () => ({ kind: "bearer", scheme: "Bearer", token: "secret-token-c" }) },
      fetch: async () => {
        throw new Error("network failed with secret-token-c");
      },
    });
    await failing.start();
    await assert.rejects(
      () => failing.invoke(makeRequest({
        capability: appRequestCapability,
        operation: "request",
        payload: createTransportRequest({ method: "GET", url: "/api/fail" }),
        requestId: "req-private-error",
        caller: webCaller("member-1"),
      }), {}),
      (error: unknown) => typeof (error as { toJSON?: unknown }).toJSON === "function" &&
        !JSON.stringify((error as { toJSON(): unknown }).toJSON()).includes("secret-token-c"),
    );
    await failing.dispose();
  });

  test(`${target.name} rejects unsupported operations and capabilities before fetch or auth`, async () => {
    let authCalls = 0;
    let fetchCalls = 0;
    const adapter = target.createAdapter({
      auth: {
        current() {
          authCalls += 1;
          return { kind: "bearer", scheme: "Bearer", token: "secret-token-unsupported" };
        },
      },
      fetch: async () => {
        fetchCalls += 1;
        return new Response('{"data":{"unexpected":true}}');
      },
    });
    await adapter.start();
    const cancelled = createCancellationController();
    cancelled.cancel("caller-left");

    await assert.rejects(
      () => adapter.invoke(makeRequest({
        capability: appRequestCapability,
        operation: "request",
        payload: createTransportRequest({ method: "GET", url: "/api/pre-cancelled" }),
        requestId: "req-pre-cancelled-http",
        caller: webCaller("member-1"),
      }), { cancellation: cancelled.signal }),
      (error: unknown) => error instanceof CancelledError && error.code === "operation_cancelled",
    );
    await assert.rejects(
      () => adapter.invoke(makeRequest({
        capability: reportsCapability,
        operation: "list",
        payload: null,
        requestId: "req-unsupported-capability-http",
        caller: webCaller("member-1"),
      }), {}),
      (error: unknown) => error instanceof UnsupportedCapabilityError && error.code === "unsupported_capability",
    );
    await assert.rejects(
      () => adapter.invoke(makeRequest({
        capability: appRequestCapability,
        operation: "discover",
        payload: createTransportRequest({ method: "GET", url: "/api/discover" }),
        requestId: "req-unsupported-operation-http",
        caller: webCaller("member-1"),
      }), {}),
      (error: unknown) => error instanceof ProtocolError && error.code === unsupportedOperationCode,
    );
    assert.equal(authCalls, 0);
    assert.equal(fetchCalls, 0);
    await adapter.dispose();
  });

  test(`${target.name} aborts cancelled fetches when possible and ignores late responses`, async () => {
    const cancellation = createCancellationController();
    let capturedSignal: AbortSignal | undefined;
    let markEntered: (() => void) | undefined;
    let releaseLate: ((response: Response) => void) | undefined;
    const entered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    const lateResponse = new Promise<Response>((resolve) => {
      releaseLate = resolve;
    });
    const adapter = target.createAdapter({
      fetch: async (_input, init = {}) => {
        capturedSignal = init.signal ?? undefined;
        markEntered?.();
        return lateResponse;
      },
    });
    await adapter.start();

    const pending = adapter.invoke(makeRequest({
      capability: appRequestCapability,
      operation: "request",
      payload: createTransportRequest({ method: "GET", url: "/api/slow" }),
      requestId: "req-cancel-late-http",
      caller: webCaller("member-1"),
    }), { cancellation: cancellation.signal });
    await entered;
    cancellation.cancel("route-change");
    await assert.rejects(
      () => pending,
      (error: unknown) => error instanceof CancelledError && JSON.stringify(error.details).includes("route-change"),
    );
    assert.equal(capturedSignal?.aborted, true);
    releaseLate?.(new Response('{"data":{"late":true}}', { headers: { "content-type": "application/json" } }));
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    await adapter.dispose();
  });
}

function webCaller(memberId: string): CallerContext {
  return Object.freeze({
    surface: "web",
    principal: { kind: "member" as const, id: memberId },
    app: { id: "app-1" },
    origin: "https://app.example.test",
  });
}

function makeRequest(options: {
  readonly capability: { readonly id: string; readonly major: number; readonly minMinor?: number };
  readonly operation: string;
  readonly payload: unknown;
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
    payload: options.payload as WireValue,
  };
}
