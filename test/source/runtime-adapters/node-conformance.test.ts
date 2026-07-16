import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  CancelledError,
  CapabilityVersionError,
  createCallerFingerprint,
  createCancellationController,
  createDiagnosticsSink,
  createInvocationContext,
  createReadonlyBytes,
  createStaticCallerProvider,
  LifecycleError,
  ProtocolError,
  UnsupportedCapabilityError,
  type CallerContext,
  type HolmDiagnosticEvent,
  type OperationRequest,
} from "../../../src/core/index.js";
import { HOLM_APP_HTTP_CAPABILITY } from "../../../src/app/index.js";
import { createFakeClock } from "../../../src/test/index.js";
import { createTransportRequest, RemoteError } from "../../../src/transports/index.js";
import {
  createNodeOperatorCaller,
  createNodeRuntimeServices,
  createNodeTokenAuth,
  nodeRuntime,
  UnsupportedNodeRuntimeServiceError,
  type NodeRuntimeFetch,
} from "../../../src/node/index.js";
import { createNodeOperatorCaller as createNodeOperatorCallerFromServices } from "../../../src/node/services.js";
import { runHttpAppRuntimeAdapterConformance } from "./conformance.js";

runHttpAppRuntimeAdapterConformance({
  name: "nodeRuntime",
  unsupportedOperationCode: "unsupported_node_runtime_operation",
  createAdapter: (options) => {
    const fake = createFakeClock(100);
    const { baseUrl, fetch, ...rest } = options;
    return nodeRuntime({
      ...rest,
      fetch: fetch as unknown as NodeRuntimeFetch,
      auth: rest.auth ?? createNodeTokenAuth({ token: "node-conformance-token" }),
      ...(baseUrl === undefined ? {} : { baseUrl: String(baseUrl) }),
      clock: fake.clock,
      scheduler: fake.scheduler,
      environment: { get: () => undefined },
      secureStore: { get: () => undefined },
    });
  },
});

test("nodeRuntime uses explicit CLI operator auth and injected runtime services without leaking secrets", async () => {
  const fake = createFakeClock(250);
  const events: HolmDiagnosticEvent[] = [];
  const fetchCalls: Array<{ readonly input: string; readonly init: { readonly headers?: Record<string, string>; readonly method?: string; readonly body?: unknown; readonly credentials?: unknown } }> = [];
  const runtime = nodeRuntime({
    id: "node-cli-test",
    baseUrl: "https://cli.example.test/root/",
    fetch: async (input, init) => {
      assert.ok(init);
      fetchCalls.push({ input: String(input), init });
      return new Response(JSON.stringify({ data: { ok: true } }), {
        headers: { "content-type": "application/json" },
      });
    },
    auth: createNodeTokenAuth({ token: () => "cli-secret-token", operatorId: "operator-1" }),
    clock: fake.clock,
    scheduler: fake.scheduler,
    diagnostics: createDiagnosticsSink((event) => {
      events.push(event);
    }),
    environment: {
      get(name) {
        return name === "HOLM_PROFILE" ? "local" : undefined;
      },
    },
    secureStore: {
      get(key) {
        return key === "holm.token" ? "stored-secret-token" : undefined;
      },
    },
  });
  const caller = await createNodeOperatorCaller({ operatorId: "operator-1", app: { id: "app-1" } }).current();
  await runtime.start();

  assert.equal(await runtime.services.environment.get("HOLM_PROFILE"), "local");
  assert.equal(await runtime.services.secureStore.get("holm.token"), "stored-secret-token");
  assert.equal(caller.surface, "cli");
  assert.deepEqual(caller.principal, { kind: "operator", id: "operator-1" });

  const response = await runtime.invoke(makeRequest({
    caller,
    requestId: "req-node-auth",
    payload: createTransportRequest({ method: "GET", url: "/api/me", headers: { cookie: "never" } }),
  }), {});

  assert.deepEqual(response.payload, { ok: true });
  assert.equal(fetchCalls[0]?.input, "https://cli.example.test/api/me");
  assert.equal(fetchCalls[0]?.init.method, "GET");
  assert.equal(fetchCalls[0]?.init.headers?.authorization, "Bearer cli-secret-token");
  assert.equal(fetchCalls[0]?.init.headers?.cookie, "never");
  assert.equal("credentials" in (fetchCalls[0]?.init ?? {}), false);
  assert.equal(JSON.stringify({ caller, response, events }).includes("cli-secret-token"), false);
  assert.equal(JSON.stringify({ caller, response, events }).includes("stored-secret-token"), false);
  await runtime.dispose();
});

test("nodeRuntime reports missing services as typed unsupported service errors with adapter and surface", async () => {
  const runtime = nodeRuntime({ id: "node-missing-services" });
  await runtime.start();

  assert.throws(
    () => runtime.clock.now(),
    (error: unknown) => error instanceof UnsupportedNodeRuntimeServiceError &&
      error.code === "unsupported_runtime_service" &&
      (error.toJSON().details as { readonly adapter?: unknown; readonly surface?: unknown; readonly service?: unknown }).adapter === "node-missing-services" &&
      (error.toJSON().details as { readonly surface?: unknown }).surface === "cli" &&
      (error.toJSON().details as { readonly service?: unknown }).service === "clock",
  );
  await assert.rejects(
    async () => runtime.services.environment.get("HOLM_PROFILE"),
    (error: unknown) => error instanceof UnsupportedNodeRuntimeServiceError &&
      (error.toJSON().details as { readonly service?: unknown }).service === "environment",
  );
  await assert.rejects(
    async () => runtime.services.secureStore.get("holm.token"),
    (error: unknown) => error instanceof UnsupportedNodeRuntimeServiceError &&
      (error.toJSON().details as { readonly service?: unknown }).service === "secureStore",
  );
  await assert.rejects(
    () => runtime.invoke(makeRequest({
      requestId: "req-missing-fetch",
      payload: createTransportRequest({ method: "GET", url: "/api/me" }),
    }), {}),
    (error: unknown) => error instanceof UnsupportedNodeRuntimeServiceError &&
      (error.toJSON().details as { readonly service?: unknown }).service === "fetch",
  );
  await runtime.dispose();
});

test("nodeRuntime keeps stable Holm errors and serialized auth failures redacted", async () => {
  const fake = createFakeClock(500);
  const denied = nodeRuntime({
    fetch: async () => new Response(
      JSON.stringify({ error: { code: "holm.node_denied", message: "Denied." } }),
      { status: 403, headers: { "content-type": "application/json" } },
    ),
    auth: createNodeTokenAuth({ token: "denied-secret" }),
    clock: fake.clock,
    scheduler: fake.scheduler,
    environment: { get: () => undefined },
    secureStore: { get: () => undefined },
  });
  await denied.start();
  await assert.rejects(
    () => denied.invoke(makeRequest({
      requestId: "req-node-denied",
      payload: createTransportRequest({ method: "GET", url: "/api/denied" }),
    }), {}),
    (error: unknown) => error instanceof RemoteError && error.code === "holm.node_denied" && error.status === 403,
  );
  await denied.dispose();

  const failing = nodeRuntime({
    fetch: async () => {
      throw new Error("network failed with denied-secret");
    },
    auth: createNodeTokenAuth({ token: "denied-secret" }),
    clock: fake.clock,
    scheduler: fake.scheduler,
    environment: { get: () => undefined },
    secureStore: { get: () => undefined },
  });
  await failing.start();
  await assert.rejects(
    () => failing.invoke(makeRequest({
      requestId: "req-node-redacted-error",
      payload: createTransportRequest({ method: "GET", url: "/api/fail" }),
    }), {}),
    (error: unknown) => typeof (error as { toJSON?: unknown }).toJSON === "function" &&
      !JSON.stringify((error as { toJSON(): unknown }).toJSON()).includes("denied-secret"),
  );
  await failing.dispose();
});

test("nodeRuntime covers cache invalidation, raw and binary bodies, and injected fetch shapes", async () => {
  const fake = createFakeClock(700);
  const calls: Array<{ readonly input: string; readonly init: { readonly headers: Record<string, string>; readonly body?: unknown; readonly signal?: { readonly aborted: boolean } } }> = [];
  const runtime = nodeRuntime({
    id: "node-rich-runtime",
    baseUrl: "https://cli.example.test/root/",
    fetch: async (input, init) => {
      assert.ok(init);
      calls.push({ input, init });
      if (input.includes("/binary")) {
        assert.equal(init.headers.accept, "*/*");
        assert.equal(init.body instanceof Uint8Array, true);
        return {
          status: 200,
          text: async () => "unused",
          arrayBuffer: async () => new Uint8Array([5, 6, 7]).buffer,
        };
      }
      if (input.includes("/raw")) {
        assert.equal(init.headers["content-type"], "text/plain;charset=utf-8");
        return {
          status: 200,
          headers: { entries: function* () { yield ["x-node", "raw"] as const; } },
          text: async () => "plain-response",
          arrayBuffer: async () => new ArrayBuffer(0),
        };
      }
      return {
        status: 200,
        url: `${input}#runtime-url`,
        headers: new Map([["content-type", "application/json"], ["x-node", "json"]]),
        text: async () => JSON.stringify({ data: { ok: true } }),
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    },
    auth: createNodeTokenAuth({ token: "rich-token", scheme: "Token", cachePartition: "rich", operatorId: "operator-rich" }),
    clock: fake.clock,
    scheduler: fake.scheduler,
    cache: { ttlMs: 10, swrMs: 5, maxEntries: 3 },
    environment: { get: (name) => name === "PROFILE" ? "rich" : undefined },
    secureStore: { get: () => undefined, set: () => undefined, delete: () => undefined },
  });
  await runtime.start();
  const first = await runtime.invoke(makeRequest({
    requestId: "req-node-rich-1",
    payload: { method: "GET", url: "/api/items#frag", params: { b: 2, a: null, c: true }, responseMode: "json" },
  }), {});
  const cached = await runtime.invoke(makeRequest({
    requestId: "req-node-rich-2",
    payload: { method: "GET", url: "/api/items#frag", params: { b: 2, a: null, c: true }, responseMode: "json" },
  }), {});
  const invalidated = await runtime.invoke({
    ...makeRequest({ requestId: "req-node-invalidate", payload: { method: "GET", url: "/api/items" } }),
    operation: "invalidate-cache",
  }, {});
  const raw = await runtime.invoke(makeRequest({
    requestId: "req-node-raw",
    payload: { method: "POST", url: "/raw", body: { mode: "raw", value: "plain" }, responseMode: "raw" },
  }), {});
  const binary = await runtime.invoke(makeRequest({
    requestId: "req-node-binary",
    payload: { method: "POST", url: "/binary", body: { mode: "binary", value: createReadonlyBytes([1, 2]) }, responseMode: "binary" },
  }), {});

  assert.deepEqual(first.payload, { ok: true });
  assert.equal(cached.requestId, "req-node-rich-2");
  assert.equal(calls.filter((call) => call.input.includes("/api/items")).length, 1);
  assert.deepEqual(invalidated.payload, null);
  assert.equal(raw.payload, "plain-response");
  assert.deepEqual(binary.payload, createReadonlyBytes([5, 6, 7]));
  assert.equal(calls[0]?.input, "https://cli.example.test/api/items?b=2&c=true#frag");
  assert.equal(calls[0]?.init.headers.authorization, "Token rich-token");
  assert.equal(calls[0]?.init.signal?.aborted, false);
  assert.equal(await runtime.services.environment.get("PROFILE"), "rich");
  await runtime.dispose();
  await runtime.dispose();

  let relativeInput = "";
  const relativeRuntime = nodeRuntime({
    fetch: async (input) => {
      relativeInput = input;
      return {
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        text: async () => JSON.stringify({ data: { ok: true } }),
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    },
    auth: createNodeTokenAuth({ token: "relative-token" }),
    clock: fake.clock,
    scheduler: fake.scheduler,
    cache: false,
    environment: { get: () => undefined },
    secureStore: { get: () => undefined },
  });
  await relativeRuntime.start();
  await relativeRuntime.invoke(makeRequest({
    requestId: "req-node-relative",
    payload: { method: "GET", url: "/relative?x=1#hash", params: { a: "b" } },
  }), {});
  assert.equal(relativeInput, "/relative?x=1&a=b#hash");
  await relativeRuntime.dispose();
});

test("nodeRuntime validates lifecycle, URL, auth, capability, and payload boundaries", async () => {
  assert.throws(() => nodeRuntime({ id: " " }), TypeError);
  assert.throws(() => nodeRuntime({ baseUrl: "not a url" }), TypeError);
  assert.throws(() => createNodeTokenAuth({ token: "   " }), TypeError);
  assert.throws(() => createNodeTokenAuth({ token: "token", scheme: " " }), TypeError);

  const fake = createFakeClock(800);
  let resolveCancelledFetch: (() => void) | undefined;
  const runtime = nodeRuntime({
    id: "node-validation",
    baseUrl: "https://cli.example.test/",
    fetch: async (input) => {
      if (input.includes("/api/cancel")) {
        return new Promise((resolve) => {
          resolveCancelledFetch = () => resolve({
            status: 200,
            headers: { entries: function* () { yield ["content-type", "application/json"] as const; } },
            text: async () => JSON.stringify({ data: { ok: true } }),
            arrayBuffer: async () => new ArrayBuffer(0),
          });
        });
      }
      return {
        status: 200,
        url: input,
        headers: { entries: function* () { yield ["content-type", "application/json"] as const; } },
        text: async () => JSON.stringify({ data: { ok: true } }),
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    },
    auth: createNodeTokenAuth({ token: () => "token-1" }),
    clock: fake.clock,
    scheduler: fake.scheduler,
    environment: { get: () => undefined },
    secureStore: { get: () => undefined },
  });
  await assert.rejects(
    () => runtime.invoke(makeRequest({ requestId: "req-not-started", payload: { method: "GET", url: "/api/me" } }), {}),
    (error: unknown) => error instanceof LifecycleError && error.code === "node_runtime_not_started",
  );
  await runtime.start();
  await assert.rejects(
    () => runtime.invoke({ ...makeRequest({ requestId: "req-version", payload: { method: "GET", url: "/api/me" } }), capability: { id: HOLM_APP_HTTP_CAPABILITY.id, major: 2 } }, {}),
    (error: unknown) => error instanceof CapabilityVersionError,
  );
  await assert.rejects(
    () => runtime.invoke({ ...makeRequest({ requestId: "req-unsupported-capability", payload: { method: "GET", url: "/api/me" } }), capability: { id: "com.example.other", major: 1 } }, {}),
    (error: unknown) => error instanceof UnsupportedCapabilityError,
  );
  await assert.rejects(
    () => runtime.invoke({ ...makeRequest({ requestId: "req-operation", payload: { method: "GET", url: "/api/me" } }), operation: "discover" }, {}),
    (error: unknown) => error instanceof ProtocolError && error.code === "unsupported_node_runtime_operation",
  );
  await assert.rejects(
    () => runtime.invoke(makeRequest({ requestId: "req-credentialed", payload: { method: "GET", url: "https://user:pass@example.test/api" } }), {}),
    (error: unknown) => error instanceof ProtocolError && error.code === "node_credentialed_request_url",
  );
  await assert.rejects(
    () => runtime.invoke(makeRequest({ requestId: "req-invalid-url", payload: { method: "GET", url: "http://[::1" } }), {}),
    (error: unknown) => error instanceof ProtocolError && error.code === "invalid_node_request_url",
  );
  for (const [requestId, payload] of [
    ["req-payload-null", null],
    ["req-payload-params", { method: "GET", url: "/api", params: { nested: { no: true } } }],
    ["req-payload-params-null", { method: "GET", url: "/api", params: null }],
    ["req-payload-headers", { method: "GET", url: "/api", headers: { ok: 1 } }],
    ["req-payload-headers-null", { method: "GET", url: "/api", headers: null }],
    ["req-payload-body", { method: "POST", url: "/api", body: { mode: "json" } }],
    ["req-payload-body-null", { method: "POST", url: "/api", body: null }],
    ["req-payload-binary", { method: "POST", url: "/api", body: { mode: "binary", value: { bytes: [1] } } }],
    ["req-payload-mode", { method: "GET", url: "/api", responseMode: "xml" }],
    ["req-payload-timeout", { method: "GET", url: "/api", timeoutMs: "soon" }],
    ["req-payload-sensitive", { method: "GET", url: "/api", sensitive: { url: "yes" } }],
    ["req-payload-sensitive-null", { method: "GET", url: "/api", sensitive: null }],
    ["req-payload-sensitive-array", { method: "GET", url: "/api", sensitive: { headers: [1] } }],
  ] as const) {
    await assert.rejects(
      () => runtime.invoke(makeRequest({ requestId, payload }), {}),
      (error: unknown) => error instanceof ProtocolError && error.code === "invalid_node_http_request",
    );
  }
  const invalidCache = nodeRuntime({
    fetch: async () => ({ status: 200, text: async () => "{}", arrayBuffer: async () => new ArrayBuffer(0) }),
    auth: createNodeTokenAuth({ token: "cache-token" }),
    clock: fake.clock,
    scheduler: fake.scheduler,
    cache: { ttlMs: -1 },
    environment: { get: () => undefined },
    secureStore: { get: () => undefined },
  });
  await invalidCache.start();
  await assert.rejects(
    () => invalidCache.invoke(makeRequest({ requestId: "req-invalid-cache", payload: { method: "GET", url: "/api/cache" } }), {}),
    TypeError,
  );

  const cancelled = createCancellationController();
  const pending = runtime.invoke(makeRequest({ requestId: "req-cancel-wait", payload: { method: "GET", url: "/api/cancel" } }), { cancellation: cancelled.signal });
  cancelled.cancel("caller-left");
  resolveCancelledFetch?.();
  await assert.rejects(pending, (error: unknown) => error instanceof CancelledError);
  await runtime.dispose();
  await assert.rejects(
    () => runtime.invoke(makeRequest({ requestId: "req-disposed", payload: { method: "GET", url: "/api/me" } }), {}),
    (error: unknown) => error instanceof LifecycleError && error.code === "node_runtime_disposed",
  );
  await assert.rejects(
    () => runtime.start(),
    (error: unknown) => error instanceof LifecycleError && error.code === "node_runtime_disposed",
  );

  const missingAuth = nodeRuntime({
    fetch: async () => ({ status: 200, text: async () => "{}", arrayBuffer: async () => new ArrayBuffer(0) }),
    clock: fake.clock,
    scheduler: fake.scheduler,
    environment: { get: () => undefined },
    secureStore: { get: () => undefined },
  });
  await missingAuth.start();
  await assert.rejects(
    () => missingAuth.invoke(makeRequest({ requestId: "req-missing-auth", payload: { method: "GET", url: "/api/me" } }), {}),
    (error: unknown) => error instanceof UnsupportedNodeRuntimeServiceError && (error.toJSON().details as { readonly service?: unknown }).service === "auth",
  );

  let resolveDisposedFetch: (() => void) | undefined;
  const disposeRuntime = nodeRuntime({
    fetch: async () => new Promise((resolve) => {
      resolveDisposedFetch = () => resolve({
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        text: async () => JSON.stringify({ data: { ok: true } }),
        arrayBuffer: async () => new ArrayBuffer(0),
      });
    }),
    auth: createNodeTokenAuth({ token: "dispose-token" }),
    clock: fake.clock,
    scheduler: fake.scheduler,
    environment: { get: () => undefined },
    secureStore: { get: () => undefined },
  });
  await disposeRuntime.start();
  const disposedPending = disposeRuntime.invoke(makeRequest({ requestId: "req-dispose-active", payload: { method: "GET", url: "/api/dispose" } }), {});
  await disposeRuntime.dispose();
  resolveDisposedFetch?.();
  await assert.rejects(disposedPending, (error: unknown) => error instanceof CancelledError || error instanceof Error);
});

test("nodeRuntime service helpers cover optional identities and unsupported slots", async () => {
  let tokenValue = "first-token";
  const dynamic = createNodeTokenAuth({ token: () => tokenValue, operatorId: "helper-operator" });
  const firstProof = await dynamic.current();
  assert.equal(firstProof?.cachePartition, "node-token:operator:helper-operator:0");
  tokenValue = "second-token";
  const secondProof = await dynamic.current();
  assert.equal(secondProof?.cachePartition, "node-token:operator:helper-operator:1");

  const defaultCaller = await createNodeOperatorCaller().current();
  assert.deepEqual(defaultCaller.principal, { kind: "operator" });
  const scopedCaller = await createNodeOperatorCaller({
    app: { id: "helper-app" },
    scope: { type: "team", id: "helper-team" },
    origin: "holm://cli/helper",
  }).current();
  const directCaller = await createNodeOperatorCallerFromServices({ operatorId: "direct-helper" }).current();
  assert.deepEqual(directCaller.principal, { kind: "operator", id: "direct-helper" });
  assert.deepEqual(scopedCaller.app, { id: "helper-app" });
  assert.deepEqual(scopedCaller.scope, { type: "team", id: "helper-team" });
  assert.equal(scopedCaller.origin, "holm://cli/helper");

  const services = createNodeRuntimeServices({ adapter: "node-helper", diagnostics: createDiagnosticsSink() });
  assert.throws(() => services.environment.get("HOLM_PROFILE"), UnsupportedNodeRuntimeServiceError);
  assert.throws(() => services.secureStore.get("holm.token"), UnsupportedNodeRuntimeServiceError);
  const runtime = nodeRuntime({ id: "node-helper-runtime" });
  assert.throws(() => runtime.scheduler.schedule(1, () => undefined), UnsupportedNodeRuntimeServiceError);
});

test("nodeRuntime rejects web session auth before fetch so CLI callers never infer browser cookies", async () => {
  const fake = createFakeClock(600);
  let fetchCalls = 0;
  const runtime = nodeRuntime({
    fetch: async () => {
      fetchCalls += 1;
      return new Response('{"data":{"unexpected":true}}');
    },
    auth: { current: () => ({ kind: "web-session", credentials: "include" }) },
    clock: fake.clock,
    scheduler: fake.scheduler,
    environment: { get: () => undefined },
    secureStore: { get: () => undefined },
  });
  await runtime.start();

  await assert.rejects(
    () => runtime.invoke(makeRequest({
      requestId: "req-node-web-session",
      payload: createTransportRequest({ method: "GET", url: "/api/me" }),
    }), {}),
    (error: unknown) => error instanceof UnsupportedCapabilityError &&
      error.code === "unsupported_capability" &&
      (error.toJSON().details as { readonly adapter?: unknown; readonly surface?: unknown }).surface === "cli",
  );
  assert.equal(fetchCalls, 0);
  await runtime.dispose();
});

function makeRequest(options: {
  readonly payload: unknown;
  readonly requestId: string;
  readonly caller?: CallerContext;
}): OperationRequest {
  const caller = options.caller ?? { surface: "cli", principal: { kind: "operator", id: "operator-1" } };
  return {
    requestId: options.requestId,
    capability: HOLM_APP_HTTP_CAPABILITY,
    operation: "request",
    caller: createInvocationContext(caller, options.requestId, 100, "node-conformance"),
    callerFingerprint: createCallerFingerprint(caller),
    payload: options.payload as never,
  };
}

void createReadonlyBytes;
void createStaticCallerProvider;
