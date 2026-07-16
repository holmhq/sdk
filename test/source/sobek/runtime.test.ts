import { strict as assert } from "node:assert";
import { test } from "node:test";

import { HOLM_APP_HTTP_CAPABILITY } from "../../../src/app/index.js";
import {
  canonicalEncodeWireValue,
  createCallerFingerprint,
  createInvocationContext,
  createReadonlyBytes,
  ProtocolError,
  UnsupportedCapabilityError,
  type CallerContext,
  type OperationRequest,
} from "../../../src/core/index.js";
import { RemoteError } from "../../../src/transports/index.js";
import {
  createFakeSobekInjectedRuntime,
  sobekRuntime,
  UnsupportedSobekRuntimeServiceError,
  type SobekInjectedRequest,
} from "../../../src/sobek/index.js";

test("sobekRuntime invokes an injected runtime directly without fetch and preserves the canonical Holm envelope", async () => {
  const fetch = installFailingFetch();
  try {
    const fake = createFakeSobekInjectedRuntime({
      handler: (request) => ({
        status: 201,
        headers: { "content-type": ["application/json; charset=utf-8"], location: ["/api/tasks/task-1"] },
        body: { created: true, caller: request.caller.principal, bytes: createReadonlyBytes([9, 8]) },
      }),
    });
    const runtime = sobekRuntime({ id: "sobek-direct", runtime: fake });
    await runtime.start();

    const caller: CallerContext = {
      surface: "server",
      principal: { kind: "service", id: "server-runtime" },
      app: { id: "app-1" },
      scope: { type: "team", id: "team-1" },
      origin: "holm://sobek/app-1",
    };
    const response = await runtime.invoke(makeRequest({
      requestId: "req-sobek-post",
      caller,
      payload: {
        method: "POST",
        path: "/api/tasks",
        query: { dryRun: false, label: "new" },
        headers: { "idempotency-key": "idem-1", "x-caller-hint": "member-evil" },
        body: {
          title: "Ship adapter",
          attachment: createReadonlyBytes([1, 2, 3]),
          caller: { principal: { kind: "member", id: "client-hint" } },
        },
        caller: { principal: { kind: "member", id: "client-hint" } },
      },
    }), {});

    assert.equal(fetch.calls, 0, "Sobek injected runtime must not use fetch/HTTP self-calls");
    assert.equal(fake.invocations.length, 1);
    const injected = fake.invocations[0]?.request as SobekInjectedRequest;
    assert.equal(injected.method, "POST");
    assert.equal(injected.path, "/api/tasks");
    assert.deepEqual(injected.query, { dryRun: false, label: "new" });
    assert.equal(injected.idempotencyKey, "idem-1");
    assert.deepEqual(injected.body, {
      title: "Ship adapter",
      attachment: createReadonlyBytes([1, 2, 3]),
      caller: { principal: { kind: "member", id: "client-hint" } },
    });
    assert.deepEqual(injected.caller.principal, { kind: "service", id: "server-runtime" });
    assert.equal(injected.caller.surface, "server");
    assert.deepEqual(response.payload, {
      created: true,
      caller: { kind: "service", id: "server-runtime" },
      bytes: createReadonlyBytes([9, 8]),
    });
    assert.deepEqual(response.metadata, {
      status: 201,
      headers: { "content-type": ["application/json; charset=utf-8"], location: ["/api/tasks/task-1"] },
    });
    await runtime.dispose();
  } finally {
    fetch.restore();
  }
});

test("sobekRuntime copies serializable requests, responses, binary values, and stable errors", async () => {
  const requestBody = { labels: ["before"], bytes: createReadonlyBytes([1, 2, 3]) };
  const responseBody = { ok: true, nested: { labels: ["before"] }, bytes: createReadonlyBytes([4, 5]) };
  let capturedRequest: SobekInjectedRequest | undefined;
  const fake = createFakeSobekInjectedRuntime({
    handler(request) {
      capturedRequest = request;
      return { status: 200, headers: { "content-type": ["application/json; charset=utf-8"] }, body: responseBody };
    },
  });
  const runtime = sobekRuntime({ runtime: fake });
  await runtime.start();

  const response = await runtime.invoke(makeRequest({
    requestId: "req-sobek-copy",
    payload: { method: "POST", path: "/api/copy", body: requestBody },
  }), {});
  requestBody.labels.push("after");
  responseBody.nested.labels.push("after");

  assert.equal(Object.isFrozen(capturedRequest), true);
  assert.equal(Object.isFrozen(capturedRequest?.body), true);
  assert.equal(Object.isFrozen(response), true);
  assert.equal(Object.isFrozen(response.payload), true);
  assert.equal(
    canonicalEncodeWireValue(capturedRequest?.body),
    canonicalEncodeWireValue({ labels: ["before"], bytes: createReadonlyBytes([1, 2, 3]) }),
  );
  assert.equal(
    canonicalEncodeWireValue(response.payload),
    canonicalEncodeWireValue({ ok: true, nested: { labels: ["before"] }, bytes: createReadonlyBytes([4, 5]) }),
  );

  const stableDetails = { field: "title", bytes: createReadonlyBytes([7, 8]) };
  fake.setHandler(() => ({
    status: 422,
    headers: { "content-type": ["application/json; charset=utf-8"] },
    error: { code: "INVALID_REQUEST", message: "Invalid request.", details: stableDetails },
  }));
  let thrown: unknown;
  try {
    await runtime.invoke(makeRequest({
      requestId: "req-sobek-error",
      payload: { method: "POST", path: "/api/error", body: { title: "" } },
    }), {});
  } catch (error) {
    thrown = error;
  }
  stableDetails.field = "mutated";

  assert.equal(thrown instanceof RemoteError, true);
  assert.equal((thrown as RemoteError).code, "INVALID_REQUEST");
  assert.equal((thrown as RemoteError).status, 422);
  assert.deepEqual((thrown as RemoteError).toJSON().details, { field: "title", bytes: createReadonlyBytes([7, 8]) });
  await runtime.dispose();
});

test("sobekRuntime reports missing capabilities and injected services with typed adapter and surface details", async () => {
  const missing = sobekRuntime({ id: "sobek-missing-runtime" });
  await missing.start();

  await assert.rejects(
    () => missing.invoke(makeRequest({ requestId: "req-sobek-missing", payload: { method: "GET", path: "/api/me" } }), {}),
    (error: unknown) => error instanceof UnsupportedSobekRuntimeServiceError &&
      error.code === "unsupported_runtime_service" &&
      (error.toJSON().details as { readonly adapter?: unknown; readonly surface?: unknown; readonly service?: unknown }).adapter === "sobek-missing-runtime" &&
      (error.toJSON().details as { readonly surface?: unknown }).surface === "server" &&
      (error.toJSON().details as { readonly service?: unknown }).service === "runtime",
  );

  const fake = createFakeSobekInjectedRuntime();
  const runtime = sobekRuntime({ id: "sobek-errors", runtime: fake });
  await runtime.start();
  await assert.rejects(
    () => runtime.invoke({
      ...makeRequest({ requestId: "req-sobek-capability", payload: { method: "GET", path: "/api/me" } }),
      capability: { id: "com.example.other", major: 1 },
    }, {}),
    (error: unknown) => error instanceof UnsupportedCapabilityError &&
      (error.toJSON().details as { readonly adapter?: unknown; readonly surface?: unknown }).adapter === "sobek-errors" &&
      (error.toJSON().details as { readonly surface?: unknown }).surface === "server",
  );
  await assert.rejects(
    () => runtime.invoke({
      ...makeRequest({ requestId: "req-sobek-op", payload: { method: "GET", path: "/api/me" } }),
      operation: "discover",
    }, {}),
    (error: unknown) => error instanceof ProtocolError &&
      error.code === "unsupported_sobek_runtime_operation" &&
      (error.toJSON().details as { readonly adapter?: unknown; readonly surface?: unknown }).adapter === "sobek-errors" &&
      (error.toJSON().details as { readonly surface?: unknown }).surface === "server",
  );
  await runtime.dispose();
});

function makeRequest(options: {
  readonly requestId: string;
  readonly payload: unknown;
  readonly caller?: CallerContext;
}): OperationRequest {
  const caller = options.caller ?? {
    surface: "server" as const,
    principal: { kind: "service" as const, id: "sobek-test" },
    app: { id: "app-1" },
  };
  return {
    requestId: options.requestId,
    capability: HOLM_APP_HTTP_CAPABILITY,
    operation: "request",
    caller: createInvocationContext(caller, options.requestId, 100, "sobek-conformance"),
    callerFingerprint: createCallerFingerprint(caller),
    payload: options.payload as never,
  };
}

function installFailingFetch(): { readonly calls: number; restore(): void } {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  let calls = 0;
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    writable: true,
    value: () => {
      calls += 1;
      throw new Error("fetch/HTTP self-call is forbidden for sobekRuntime tests");
    },
  });
  return {
    get calls() {
      return calls;
    },
    restore() {
      if (descriptor === undefined) {
        Reflect.deleteProperty(globalThis, "fetch");
      } else {
        Object.defineProperty(globalThis, "fetch", descriptor);
      }
    },
  };
}
