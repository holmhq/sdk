import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createAppExtension, HOLM_APP_HTTP_CAPABILITY } from "../../../src/app/index.js";
import {
  canonicalEncodeWireValue,
  createCallerFingerprint,
  createHolm,
  createCancellationController,
  createInvocationContext,
  createReadonlyBytes,
  createStaticCallerProvider,
  CancelledError,
  CapabilityVersionError,
  LifecycleError,
  ProtocolError,
  UnsupportedCapabilityError,
  type CallerContext,
  type OperationRequest,
} from "../../../src/core/index.js";
import { createFakeClock } from "../../../src/test/index.js";
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

test("createHolm app HTTP calls through sobekRuntime pass canonical request bodies without HTTP self-calls", async () => {
  const fetch = installFailingFetch();
  try {
    const fake = createFakeSobekInjectedRuntime({
      handler: (request) => ({
        status: 200,
        body: { ok: true, body: request.body ?? null, caller: request.caller.principal },
      }),
    });
    const services = createFakeClock(100);
    const holm = createHolm({
      runtime: sobekRuntime({
        id: "sobek-app-extension",
        runtime: fake,
        clock: services.clock,
        scheduler: services.scheduler,
      }),
      caller: createStaticCallerProvider({
        surface: "server",
        principal: { kind: "service", id: "server-runtime" },
        app: { id: "app-1" },
        origin: "holm://sobek/app-1",
      }),
      extensions: [createAppExtension({ requestId: (sequence) => `sobek-app-${sequence}` })] as const,
    });

    const json = await holm.app.http.post("/api/tasks?draft=true", { title: "x" }, {
      params: { page: 1 },
      headers: { "x-caller-hint": "member-evil" },
    });
    const raw = await holm.app.http.request({ method: "POST", url: "/api/raw", body: { mode: "raw", value: "plain" } });
    const binaryBytes = createReadonlyBytes([4, 5, 6]);
    const binary = await holm.app.http.request({ method: "POST", url: "/api/binary", body: { mode: "binary", value: binaryBytes } });

    assert.equal(fetch.calls, 0, "Sobek app composition must not use fetch/HTTP self-calls");
    assert.equal(fake.invocations.length, 3);
    const jsonRequest = fake.invocations[0]?.request as SobekInjectedRequest;
    assert.equal(jsonRequest.requestId, "sobek-app-1");
    assert.equal(jsonRequest.method, "POST");
    assert.equal(jsonRequest.path, "/api/tasks");
    assert.deepEqual(jsonRequest.query, { draft: "true", page: 1 });
    assert.deepEqual(jsonRequest.body, { title: "x" });
    assert.deepEqual(jsonRequest.caller.principal, { kind: "service", id: "server-runtime" });
    assert.deepEqual(json, { ok: true, body: { title: "x" }, caller: { kind: "service", id: "server-runtime" } });
    assert.equal((fake.invocations[1]?.request as SobekInjectedRequest).body, "plain");
    assert.deepEqual((fake.invocations[2]?.request as SobekInjectedRequest).body, binaryBytes);
    assert.deepEqual(raw, { ok: true, body: "plain", caller: { kind: "service", id: "server-runtime" } });
    assert.deepEqual(binary, { ok: true, body: binaryBytes, caller: { kind: "service", id: "server-runtime" } });
    await holm.dispose();
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

test("sobekRuntime covers URL parsing, query merging, metadata, and reserved invalidate", async () => {
  const fake = createFakeSobekInjectedRuntime({
    handler(request) {
      const headers = { "x-sobek": ["ok"], "content-type": ["application/json"] };
      if (request.path === "/api/empty") {
        return { status: 204, headers };
      }
      return {
        status: 200,
        headers,
        body: {
          path: request.path,
          query: request.query,
          params: request.params ?? null,
          headers: request.headers,
          body: request.body ?? null,
          files: request.files ?? null,
          approval: request.approval ?? null,
          idempotencyKey: request.idempotencyKey ?? null,
        },
      };
    },
  });
  const services = createFakeClock(900);
  const runtime = sobekRuntime({ id: "sobek-rich", runtime: fake, clock: services.clock, scheduler: services.scheduler });
  await runtime.start();

  const response = await runtime.invoke(makeRequest({
    requestId: "req-sobek-url",
    payload: {
      method: "post",
      url: "https://holm.example.test/api/reports?tag=one&tag=two&tag=three&&space=a+b&empty=#hash",
      params: { page: 2, dryRun: false },
      headers: { "X-List": ["a", "b"], "X-One": "1", "Idempotency-Key": "idem-url" },
      body: { mode: "json", value: { title: "Report" } },
      files: { upload: createReadonlyBytes([1, 2]) },
      approval: { token: "approval" },
    },
  }), {});
  const empty = await runtime.invoke(makeRequest({
    requestId: "req-sobek-empty",
    payload: { method: "GET", path: "/api/empty" },
  }), {});
  const rootUrl = await runtime.invoke(makeRequest({
    requestId: "req-sobek-root-url",
    payload: { method: "GET", url: "https://holm.example.test", params: { from: "root" } },
  }), {});
  const pathParams = await runtime.invoke(makeRequest({
    requestId: "req-sobek-path-params",
    payload: { method: "GET", path: "/api/params", params: { id: "report-1" } },
  }), {});
  const invalidated = await runtime.invoke({
    ...makeRequest({ requestId: "req-sobek-invalidate", payload: { method: "GET", path: "/api/reports" } }),
    operation: "invalidate-cache",
  }, {});

  assert.deepEqual(response.payload, {
    path: "/api/reports",
    query: { dryRun: false, empty: "", page: 2, space: "a b", tag: ["one", "two", "three"] },
    params: null,
    headers: { "idempotency-key": ["idem-url"], "x-list": ["a", "b"], "x-one": ["1"] },
    body: { title: "Report" },
    files: { upload: createReadonlyBytes([1, 2]) },
    approval: { token: "approval" },
    idempotencyKey: "idem-url",
  });
  assert.deepEqual(response.metadata, { status: 200, headers: { "content-type": ["application/json"], "x-sobek": ["ok"] } });
  assert.deepEqual(empty.payload, null);
  assert.deepEqual((rootUrl.payload as { readonly path: string; readonly query: unknown }).path, "/");
  assert.deepEqual((rootUrl.payload as { readonly query: unknown }).query, { from: "root" });
  assert.deepEqual((pathParams.payload as { readonly params: unknown }).params, { id: "report-1" });
  assert.deepEqual(invalidated.payload, null);
  assert.equal(runtime.clock.now(), 900);
  await runtime.dispose();
});

test("sobekRuntime validates lifecycle, malformed requests, responses, and cancellation", async () => {
  assert.throws(() => sobekRuntime({ id: " " }), TypeError);
  const fake = createFakeSobekInjectedRuntime();
  const runtime = sobekRuntime({ id: "sobek-validation", runtime: fake });
  await assert.rejects(
    () => runtime.invoke(makeRequest({ requestId: "req-sobek-not-started", payload: { method: "GET", path: "/api/me" } }), {}),
    (error: unknown) => error instanceof LifecycleError && error.code === "sobek_runtime_not_started",
  );
  await runtime.start();

  await assert.rejects(
    () => runtime.invoke({ ...makeRequest({ requestId: "req-sobek-version", payload: { method: "GET", path: "/api/me" } }), capability: { id: HOLM_APP_HTTP_CAPABILITY.id, major: 2 } }, {}),
    (error: unknown) => error instanceof CapabilityVersionError,
  );
  for (const [requestId, payload] of [
    ["req-sobek-missing-path", { method: "GET" }],
    ["req-sobek-relative", { method: "GET", path: "api/me" }],
    ["req-sobek-bad-query", { method: "GET", path: "/api/me?bad=%E0%A4%A" }],
    ["req-sobek-missing-method", { path: "/api/me" }],
    ["req-sobek-delete", { method: "DELETE", path: "/api/me" }],
    ["req-sobek-header-name", { method: "GET", path: "/api/me", headers: { " ": "bad" } }],
    ["req-sobek-header-value", { method: "GET", path: "/api/me", headers: { "x-bad": ["ok", 1] } }],
    ["req-sobek-body-missing", { method: "POST", url: "/api/me", body: { mode: "json" } }],
    ["req-sobek-body-raw", { method: "POST", url: "/api/me", body: { mode: "raw", value: 1 } }],
    ["req-sobek-body-binary", { method: "POST", url: "/api/me", body: { mode: "binary", value: { bytes: [1] } } }],
    ["req-sobek-body-mode", { method: "POST", url: "/api/me", body: { mode: 1, value: null } }],
    ["req-sobek-query", { method: "GET", path: "/api/me", query: null }],
    ["req-sobek-params", { method: "GET", path: "/api/me", params: null }],
  ] as const) {
    await assert.rejects(
      () => runtime.invoke(makeRequest({ requestId, payload }), {}),
      (error: unknown) => error instanceof ProtocolError,
    );
  }

  fake.setHandler(() => ({ status: 99, body: { ok: true } }));
  await assert.rejects(
    () => runtime.invoke(makeRequest({ requestId: "req-sobek-status", payload: { method: "GET", path: "/api/me" } }), {}),
    (error: unknown) => error instanceof ProtocolError && error.code === "invalid_sobek_response_status",
  );
  fake.setHandler(() => ({ status: 200, headers: { " ": ["bad"] }, body: { ok: true } }));
  await assert.rejects(
    () => runtime.invoke(makeRequest({ requestId: "req-sobek-response-header-name", payload: { method: "GET", path: "/api/me" } }), {}),
    (error: unknown) => error instanceof ProtocolError && error.code === "invalid_sobek_response_headers",
  );
  fake.setHandler(() => ({ status: 200, headers: { "x-bad": ["ok", 1 as unknown as string] }, body: { ok: true } }));
  await assert.rejects(
    () => runtime.invoke(makeRequest({ requestId: "req-sobek-response-header-value", payload: { method: "GET", path: "/api/me" } }), {}),
    (error: unknown) => error instanceof ProtocolError && error.code === "invalid_sobek_response_headers",
  );
  fake.setHandler(() => ({ status: 400, body: { error: { code: "REMOTE_BODY", message: "Remote body error.", retryable: true } } }));
  await assert.rejects(
    () => runtime.invoke(makeRequest({ requestId: "req-sobek-body-error", payload: { method: "GET", path: "/api/me" } }), {}),
    (error: unknown) => error instanceof RemoteError && error.code === "REMOTE_BODY" && error.retryable === true,
  );
  fake.setHandler(() => ({ status: 400, body: { error: { code: "", message: "ignored" } } }));
  await assert.rejects(
    () => runtime.invoke(makeRequest({ requestId: "req-sobek-invalid-body-error", payload: { method: "GET", path: "/api/me" } }), {}),
    (error: unknown) => error instanceof RemoteError && error.code === "holm.remote_error",
  );
  fake.setHandler(() => ({ error: { code: "", message: "bad" } }));
  await assert.rejects(
    () => runtime.invoke(makeRequest({ requestId: "req-sobek-invalid-error", payload: { method: "GET", path: "/api/me" } }), {}),
    (error: unknown) => error instanceof ProtocolError && error.code === "invalid_sobek_error",
  );
  fake.setHandler(() => ({ error: { code: "BAD", message: "" } }));
  await assert.rejects(
    () => runtime.invoke(makeRequest({ requestId: "req-sobek-invalid-error-message", payload: { method: "GET", path: "/api/me" } }), {}),
    (error: unknown) => error instanceof ProtocolError && error.code === "invalid_sobek_error",
  );

  let resolveCancelled: ((response: { readonly status: number; readonly body: { readonly ok: true } }) => void) | undefined;
  const cancelled = createFakeSobekInjectedRuntime({
    handler: () => new Promise<{ readonly status: number; readonly body: { readonly ok: true } }>((resolve) => { resolveCancelled = resolve; }),
  });
  const cancellable = sobekRuntime({ id: "sobek-cancellable", runtime: cancelled });
  await cancellable.start();
  const sdkCancellation = createCancellationController();
  const pending = cancellable.invoke(makeRequest({ requestId: "req-sobek-cancel", payload: { method: "GET", path: "/api/me" } }), { cancellation: sdkCancellation.signal });
  sdkCancellation.cancel("caller-left");
  resolveCancelled?.({ status: 200, body: { ok: true } });
  await assert.rejects(pending, (error: unknown) => error instanceof CancelledError);
  await cancellable.dispose();

  assert.throws(() => sobekRuntime({ id: "sobek-missing-clock" }).clock.now(), UnsupportedSobekRuntimeServiceError);
  assert.throws(() => sobekRuntime({ id: "sobek-missing-scheduler" }).scheduler.schedule(1, () => undefined), UnsupportedSobekRuntimeServiceError);
  await runtime.dispose();
  await assert.rejects(
    () => runtime.invoke(makeRequest({ requestId: "req-sobek-disposed", payload: { method: "GET", path: "/api/me" } }), {}),
    (error: unknown) => error instanceof LifecycleError && error.code === "sobek_runtime_disposed",
  );
  await assert.rejects(() => runtime.start(), (error: unknown) => error instanceof LifecycleError && error.code === "sobek_runtime_disposed");
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
