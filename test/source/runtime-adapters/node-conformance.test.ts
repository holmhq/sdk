import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  createCallerFingerprint,
  createDiagnosticsSink,
  createInvocationContext,
  createReadonlyBytes,
  createStaticCallerProvider,
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
  createNodeTokenAuth,
  nodeRuntime,
  UnsupportedNodeRuntimeServiceError,
  type NodeRuntimeFetch,
} from "../../../src/node/index.js";
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
