import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  CancelledError,
  LifecycleError,
  ProtocolError,
  createCancellationController,
  createHolm,
  createReadonlyBytes,
  createStaticCallerProvider,
  isReadonlyBytes,
  type OperationRequest,
  type WireValue,
} from "../../../src/core/index.js";
import { createFakeClock } from "../../../src/test/index.js";
import {
  RemoteError,
  TransportError,
  createTransportRequest,
} from "../../../src/transports/index.js";
import {
  HOLM_APP_HTTP_CAPABILITY,
  WEB_HTTP_REQUEST_OPERATION,
  webRuntime,
} from "../../../src/web/index.js";

test("web runtime invokes Holm app HTTP through Fetch with private session credentials", async () => {
  const fake = createFakeClock(42);
  const calls: Array<{ readonly url: string; readonly init: RequestInit }> = [];
  const fixtureFetch: typeof fetch = async (input, init = {}) => {
    calls.push({ url: String(input), init });
    return new Response(
      JSON.stringify({ data: { member: { id: "member_1" } }, meta: { request_id: "holm-1" } }),
      {
        status: 200,
        headers: { "content-type": "application/json", "x-request-id": "holm-1" },
      },
    );
  };
  const runtime = webRuntime({
    baseUrl: "https://app.example.test/root/",
    fetch: fixtureFetch,
    clock: fake.clock,
    scheduler: fake.scheduler,
  });
  const holm = createHolm({
    runtime,
    caller: createStaticCallerProvider({
      surface: "web",
      principal: { kind: "browser-session" },
      origin: "https://app.example.test",
    }),
  });

  const response = await holm.invoke({
    capability: HOLM_APP_HTTP_CAPABILITY,
    operation: WEB_HTTP_REQUEST_OPERATION,
    requestId: "req-web-me",
    payload: createTransportRequest({
      method: "GET",
      url: "/api/me",
      params: { view: "compact" },
      responseMode: "json",
    }),
  });

  assert.deepEqual(response.payload, { member: { id: "member_1" } });
  assert.deepEqual(response.metadata, {
    status: 200,
    meta: { request_id: "holm-1" },
    headers: { "content-type": "application/json", "x-request-id": "holm-1" },
  });
  assert.deepEqual(holm.capabilities.getSnapshot().offers, [
    {
      id: "holm.http.app",
      origin: "runtime",
      version: { major: 1, minor: 0 },
    },
  ]);
  assert.equal(runtime.id, "web-fetch");
  assert.equal(runtime.surface, "web");
  assert.equal(runtime.clock.now(), 42);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "https://app.example.test/api/me?view=compact");
  assert.equal(calls[0]?.init.method, "GET");
  assert.equal(calls[0]?.init.credentials, "same-origin");
  const headers = new Headers(calls[0]?.init.headers);
  assert.equal(headers.get("accept"), "application/json");
  assert.equal(headers.has("authorization"), false);

  await holm.dispose();
});

test("web runtime deduplicates caller-partitioned GETs without reusing response request IDs", async () => {
  const fake = createFakeClock(100);
  let releaseFetch: (() => void) | undefined;
  const fetchGate = new Promise<void>((resolve) => {
    releaseFetch = resolve;
  });
  let fetchCalls = 0;
  const runtime = webRuntime({
    fetch: async () => {
      fetchCalls += 1;
      await fetchGate;
      return new Response('{"data":{"items":["one"]}}', {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    clock: fake.clock,
    scheduler: fake.scheduler,
  });
  await runtime.start();

  const request = createTransportRequest({ method: "GET", url: "/api/items", params: { page: 1 } });
  const first = runtime.invoke(operationRequest(request, "req-cache-1"), {});
  const second = runtime.invoke(operationRequest(request, "req-cache-2"), {});
  await Promise.resolve();
  await Promise.resolve();
  releaseFetch?.();
  const [firstResponse, secondResponse] = await Promise.all([first, second]);

  assert.equal(fetchCalls, 1);
  assert.equal(firstResponse.requestId, "req-cache-1");
  assert.equal(secondResponse.requestId, "req-cache-2");
  assert.deepEqual(firstResponse.payload, { items: ["one"] });
  assert.deepEqual(secondResponse.payload, { items: ["one"] });
  await runtime.dispose();
});

test("web runtime rejects cross-origin app requests before resolving or sending auth proof", async () => {
  let authCalls = 0;
  let fetchCalls = 0;
  const runtime = webRuntime({
    baseUrl: "https://app.example.test/",
    auth: {
      current() {
        authCalls += 1;
        return { kind: "bearer", scheme: "Bearer", token: "cross-origin-secret" };
      },
    },
    fetch: async () => {
      fetchCalls += 1;
      return new Response('{"data":{"unexpected":true}}', {
        headers: { "content-type": "application/json" },
      });
    },
  });
  await runtime.start();

  await assert.rejects(
    () => runtime.invoke(
      operationRequest(createTransportRequest({ method: "GET", url: "https://evil.example/api/me" }), "req-cross-origin"),
      {},
    ),
    (error: unknown) => error instanceof ProtocolError && error.code === "web_cross_origin_request",
  );
  assert.equal(authCalls, 0);
  assert.equal(fetchCalls, 0);
  await runtime.dispose();
});

test("web runtime rejects mixed authority separators against ambient browser origin", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "location");
  let authCalls = 0;
  let fetchCalls = 0;
  try {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { href: "https://app.example.test/root/" },
    });
    const runtime = webRuntime({
      auth: {
        current() {
          authCalls += 1;
          return { kind: "bearer", scheme: "Bearer", token: "ambient-secret" };
        },
      },
      fetch: async () => {
        fetchCalls += 1;
        return new Response('{"data":{"unexpected":true}}', {
          headers: { "content-type": "application/json" },
        });
      },
    });
    await runtime.start();
    await assert.rejects(
      () => runtime.invoke(
        operationRequest(createTransportRequest({ method: "GET", url: "/\\evil.example/api/me" }), "req-mixed-origin"),
        {},
      ),
      (error: unknown) => error instanceof ProtocolError && error.code === "web_cross_origin_request",
    );
    await runtime.dispose();
  } finally {
    if (descriptor === undefined) {
      Reflect.deleteProperty(globalThis, "location");
    } else {
      Object.defineProperty(globalThis, "location", descriptor);
    }
  }
  assert.equal(authCalls, 0);
  assert.equal(fetchCalls, 0);
});

test("web runtime fails closed on whitespace-prefixed authority requests with no ambient origin", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "location");
  let authCalls = 0;
  let fetchCalls = 0;
  try {
    Reflect.deleteProperty(globalThis, "location");
    const runtime = webRuntime({
      auth: {
        current() {
          authCalls += 1;
          return { kind: "bearer", scheme: "Bearer", token: "no-ambient-secret" };
        },
      },
      fetch: async () => {
        fetchCalls += 1;
        return new Response('{"data":{"unexpected":true}}', {
          headers: { "content-type": "application/json" },
        });
      },
    });
    await runtime.start();
    for (const bypass of ["\n//evil.example/api/me", " https://evil.example/api/me", "\thttp:evil.example/api/me"]) {
      await assert.rejects(
        () => runtime.invoke(
          operationRequest(createTransportRequest({ method: "GET", url: bypass }), "req-no-ambient"),
          {},
        ),
        (error: unknown) => error instanceof ProtocolError && error.code === "web_cross_origin_request",
      );
    }
    await runtime.dispose();
  } finally {
    if (descriptor === undefined) {
      Reflect.deleteProperty(globalThis, "location");
    } else {
      Object.defineProperty(globalThis, "location", descriptor);
    }
  }
  assert.equal(authCalls, 0);
  assert.equal(fetchCalls, 0);
});

test("web runtime fences cancelled shared GET loads from later cache reads", async () => {
  const cancellation = createCancellationController();
  let fetchCalls = 0;
  let releaseFirst: ((response: Response) => void) | undefined;
  let markEntered: (() => void) | undefined;
  const entered = new Promise<void>((resolve) => {
    markEntered = resolve;
  });
  const firstResponse = new Promise<Response>((resolve) => {
    releaseFirst = resolve;
  });
  const runtime = webRuntime({
    fetch: async () => {
      fetchCalls += 1;
      if (fetchCalls === 1) {
        markEntered?.();
        return firstResponse;
      }
      return new Response('{"data":{"source":"fresh"}}', {
        headers: { "content-type": "application/json" },
      });
    },
  });
  await runtime.start();
  const request = operationRequest(
    createTransportRequest({ method: "GET", url: "/api/cancelled-cache", responseMode: "json" }),
    "req-cancelled-cache",
  );
  const cancelled = runtime.invoke(request, { cancellation: cancellation.signal });
  await entered;
  cancellation.cancel("leave-page");
  await assert.rejects(cancelled, CancelledError);
  releaseFirst?.(new Response('{"data":{"source":"cancelled"}}', {
    headers: { "content-type": "application/json" },
  }));
  await new Promise<void>((resolve) => setImmediate(resolve));

  const after = await runtime.invoke(operationRequest(
    createTransportRequest({ method: "GET", url: "/api/cancelled-cache", responseMode: "json" }),
    "req-after-cancelled-cache",
  ), {});
  assert.deepEqual(after.payload, { source: "fresh" });
  assert.equal(fetchCalls, 2);
  await runtime.dispose();
});

test("web runtime keeps a shared GET alive while another cache consumer remains", async () => {
  const firstCancellation = createCancellationController();
  let release: ((response: Response) => void) | undefined;
  let fetchCalls = 0;
  const response = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const runtime = webRuntime({
    fetch: async () => {
      fetchCalls += 1;
      return response;
    },
  });
  await runtime.start();
  const input = createTransportRequest({ method: "GET", url: "/api/shared", responseMode: "json" });
  const first = runtime.invoke(operationRequest(input, "req-shared-cancel"), {
    cancellation: firstCancellation.signal,
  });
  const second = runtime.invoke(operationRequest(input, "req-shared-active"), {});
  await new Promise<void>((resolve) => setImmediate(resolve));
  firstCancellation.cancel("first-left");
  await assert.rejects(first, CancelledError);
  release?.(new Response('{"data":{"shared":true}}', {
    headers: { "content-type": "application/json" },
  }));
  assert.deepEqual((await second).payload, { shared: true });
  assert.equal(fetchCalls, 1);
  await runtime.dispose();
});

test("web runtime cache partitions callers, invalidates mutations, retries errors, and can be disabled", async () => {
  const fake = createFakeClock(500);
  let calls = 0;
  const fixtureFetch: typeof fetch = async (_input, init = {}) => {
    calls += 1;
    if (calls === 5) {
      return new Response('{"error":{"code":"temporary","message":"Retry"}}', {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ data: { call: calls, method: init.method } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const runtime = webRuntime({
    fetch: fixtureFetch,
    clock: fake.clock,
    scheduler: fake.scheduler,
    cache: { ttlMs: 100, swrMs: 0, maxEntries: 4 },
  });
  await runtime.start();
  const get = createTransportRequest({ method: "GET", url: "/api/items" });
  const post = createTransportRequest({
    method: "POST",
    url: "/api/items",
    body: { mode: "json", value: { label: "new" } },
  });

  const alphaFirst = await runtime.invoke(operationRequest(get, "req-alpha-1", "caller-alpha"), {});
  const alphaCached = await runtime.invoke(operationRequest(get, "req-alpha-2", "caller-alpha"), {});
  const betaFirst = await runtime.invoke(operationRequest(get, "req-beta-1", "caller-beta"), {});
  await runtime.invoke(operationRequest(post, "req-alpha-post", "caller-alpha"), {});
  const alphaReloaded = await runtime.invoke(operationRequest(get, "req-alpha-3", "caller-alpha"), {});
  const betaCached = await runtime.invoke(operationRequest(get, "req-beta-2", "caller-beta"), {});

  assert.deepEqual(alphaFirst.payload, { call: 1, method: "GET" });
  assert.deepEqual(alphaCached.payload, { call: 1, method: "GET" });
  assert.deepEqual(betaFirst.payload, { call: 2, method: "GET" });
  assert.deepEqual(alphaReloaded.payload, { call: 4, method: "GET" });
  assert.deepEqual(betaCached.payload, { call: 2, method: "GET" });
  assert.equal(betaCached.requestId, "req-beta-2");
  assert.equal(calls, 4);

  fake.advanceBy(101);
  await assert.rejects(
    () => runtime.invoke(operationRequest(get, "req-alpha-error", "caller-alpha"), {}),
    (error: unknown) => error instanceof RemoteError && error.code === "temporary",
  );
  const retried = await runtime.invoke(operationRequest(get, "req-alpha-retry", "caller-alpha"), {});
  assert.deepEqual(retried.payload, { call: 6, method: "GET" });
  assert.equal(calls, 6);
  await runtime.dispose();

  let uncachedCalls = 0;
  const uncached = webRuntime({
    cache: false,
    fetch: async () => {
      uncachedCalls += 1;
      return new Response(JSON.stringify({ data: { call: uncachedCalls } }), {
        headers: { "content-type": "application/json" },
      });
    },
  });
  await uncached.start();
  await uncached.invoke(operationRequest(get, "req-uncached-1"), {});
  await uncached.invoke(operationRequest(get, "req-uncached-2"), {});
  assert.equal(uncachedCalls, 2);
  await uncached.dispose();
});

test("web runtime encodes bearer-authenticated JSON and preserves raw responses", async () => {
  let captured: { readonly url: string; readonly init: RequestInit } | undefined;
  const runtime = webRuntime({
    auth: {
      current: () => ({ kind: "bearer", scheme: "Bearer", token: "web-secret" }),
    },
    fetch: async (input, init = {}) => {
      captured = { url: String(input), init };
      return new Response("accepted", {
        status: 201,
        headers: { "content-type": "text/plain", "x-result": "created" },
      });
    },
  });
  await runtime.start();

  const response = await runtime.invoke(
    operationRequest(
      createTransportRequest({
        method: "POST",
        url: "/api/custom?existing=1#section",
        params: { z: 2, skip: null, a: "first" },
        headers: { accept: "text/plain", "content-type": "application/vnd.holm+json" },
        body: { mode: "json", value: { z: true, a: 1 } },
        responseMode: "raw",
      }),
      "req-web-json",
    ),
    {},
  );

  assert.equal(captured?.url, "/api/custom?existing=1&a=first&z=2#section");
  assert.equal(captured?.init.credentials, undefined);
  assert.equal(captured?.init.body, '{"a":1,"z":true}');
  const headers = new Headers(captured?.init.headers);
  assert.equal(headers.get("accept"), "text/plain");
  assert.equal(headers.get("content-type"), "application/vnd.holm+json");
  assert.equal(headers.get("authorization"), "Bearer web-secret");
  assert.equal(response.payload, "accepted");
  assert.deepEqual(response.metadata, {
    status: 201,
    headers: { "content-type": "text/plain", "x-result": "created" },
  });
  await runtime.dispose();
});

test("web runtime sends and receives copied binary bodies through Fetch", async () => {
  let captured: RequestInit | undefined;
  const runtime = webRuntime({
    baseUrl: "https://app.example.test/",
    fetch: async (_input, init = {}) => {
      captured = init;
      return new Response(Uint8Array.from([4, 5, 6]), {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      });
    },
  });
  await runtime.start();

  const response = await runtime.invoke(
    operationRequest(
      createTransportRequest({
        method: "PUT",
        url: "https://app.example.test/api/binary",
        body: { mode: "binary", value: createReadonlyBytes([1, 2, 3]) },
        responseMode: "binary",
      }),
      "req-web-binary",
    ),
    {},
  );

  assert.equal(captured?.credentials, "same-origin");
  assert.equal(captured?.body instanceof ArrayBuffer, true);
  assert.deepEqual([...new Uint8Array(captured?.body as ArrayBuffer)], [1, 2, 3]);
  const headers = new Headers(captured?.headers);
  assert.equal(headers.get("accept"), "*/*");
  assert.equal(headers.get("content-type"), "application/octet-stream");
  assert.equal(isReadonlyBytes(response.payload), true);
  if (isReadonlyBytes(response.payload)) {
    assert.deepEqual([...response.payload], [4, 5, 6]);
  }
  await runtime.dispose();
});

test("web runtime validates construction, operation payloads, and adapter lifecycle", async () => {
  assert.throws(() => webRuntime({ id: " " }), /runtime id/);
  assert.throws(() => webRuntime({ baseUrl: "relative" }), /baseUrl/);
  assert.throws(() => webRuntime({ cache: { ttlMs: -1 } }), /cache ttlMs/);
  assert.throws(() => webRuntime({ cache: { swrMs: Number.NaN } }), /cache swrMs/);
  assert.throws(() => webRuntime({ cache: { maxEntries: 0 } }), /maxEntries/);

  const fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  try {
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: undefined, writable: true });
    assert.throws(() => webRuntime(), /Fetch implementation/);
  } finally {
    if (fetchDescriptor === undefined) {
      Reflect.deleteProperty(globalThis, "fetch");
    } else {
      Object.defineProperty(globalThis, "fetch", fetchDescriptor);
    }
  }

  const defaults = webRuntime({ fetch: async () => new Response("ok") });
  assert.equal(Number.isFinite(defaults.clock.now()), true);
  assert.throws(() => defaults.scheduler.schedule(-1, () => undefined), /scheduler delay/);
  const scheduled = defaults.scheduler.schedule(60_000, () => undefined);
  scheduled.cancel();

  const runtime = webRuntime({ fetch: async () => new Response('{"data":null}') });
  const valid = operationRequest(createTransportRequest({ method: "GET", url: "/api/valid" }));
  await assert.rejects(() => runtime.invoke(valid, {}), LifecycleError);
  assert.equal((await runtime.start())[0]?.id, "holm.http.app");
  assert.equal((await runtime.start())[0]?.id, "holm.http.app");

  await assert.rejects(
    () => runtime.invoke({ ...valid, operation: "other" }, {}),
    (error: unknown) => error instanceof ProtocolError && error.code === "unsupported_web_runtime_operation",
  );
  await assert.rejects(
    () => runtime.invoke({ ...valid, capability: { id: "holm.http.admin", major: 1 } }, {}),
    (error: unknown) => error instanceof ProtocolError && error.code === "unsupported_web_runtime_operation",
  );
  await assert.rejects(
    () => runtime.invoke({ ...valid, capability: { id: "holm.http.app", major: 2 } }, {}),
    (error: unknown) => error instanceof ProtocolError && error.code === "unsupported_web_runtime_operation",
  );

  const malformedPayloads: readonly WireValue[] = [
    null,
    { url: "/api/missing-method" },
    { method: "GET", url: "/api", params: [] },
    { method: "GET", url: "/api", params: { bad: [] } },
    { method: "GET", url: "/api", params: { bad: Number.NaN } },
    { method: "GET", url: "/api", headers: [] },
    { method: "GET", url: "/api", headers: { bad: 1 } },
    { method: "POST", url: "/api", body: [] },
    { method: "POST", url: "/api", body: { mode: "json" } },
    { method: "POST", url: "/api", body: { mode: "raw", value: 1 } },
    { method: "POST", url: "/api", body: { mode: "binary", value: "bytes" } },
    { method: "POST", url: "/api", body: { mode: "other", value: "body" } },
    { method: "GET", url: "/api", responseMode: "xml" },
    { method: "GET", url: "/api", timeoutMs: "soon" },
    { method: "GET", url: "/api", sensitive: [] },
    { method: "GET", url: "/api", sensitive: { url: "yes" } },
    { method: "GET", url: "/api", sensitive: { params: "token" } },
    { method: "GET", url: "/api", sensitive: { params: [1] } },
    { method: "GET", url: "/api", sensitive: { headers: [1] } },
  ];
  for (const payload of malformedPayloads) {
    await assert.rejects(
      () => runtime.invoke({ ...valid, payload }, {}),
      (error: unknown) => error instanceof ProtocolError && error.code === "invalid_web_http_request",
    );
  }

  await runtime.dispose();
  await runtime.dispose();
  await assert.rejects(() => runtime.start(), LifecycleError);
  await assert.rejects(() => runtime.invoke(valid, {}), LifecycleError);
  await defaults.dispose();
});

test("web runtime maps cancellation, network failure, and disposal to typed errors", async () => {
  let fetchCalls = 0;
  const preCancelled = createCancellationController();
  preCancelled.cancel("before-fetch");
  const preCancelledRuntime = webRuntime({
    fetch: async () => {
      fetchCalls += 1;
      return new Response("never");
    },
  });
  await preCancelledRuntime.start();
  await assert.rejects(
    () => preCancelledRuntime.invoke(basicRequest("req-pre-cancel"), { cancellation: preCancelled.signal }),
    (error: unknown) => error instanceof CancelledError && error.details !== undefined,
  );
  assert.equal(fetchCalls, 0);
  await preCancelledRuntime.dispose();

  const duringAuth = createCancellationController();
  const authCancelledRuntime = webRuntime({
    auth: {
      current() {
        duringAuth.cancel("auth-transition");
        return { kind: "web-session", credentials: "include" };
      },
    },
    fetch: async () => {
      fetchCalls += 1;
      return new Response("never");
    },
  });
  await authCancelledRuntime.start();
  await assert.rejects(
    () => authCancelledRuntime.invoke(basicRequest("req-auth-cancel"), { cancellation: duringAuth.signal }),
    CancelledError,
  );
  assert.equal(fetchCalls, 0);
  await authCancelledRuntime.dispose();

  const authFailureRuntime = webRuntime({
    auth: {
      current() {
        throw new Error("auth-provider secret");
      },
    },
    fetch: async () => {
      fetchCalls += 1;
      return new Response("never");
    },
  });
  await authFailureRuntime.start();
  await assert.rejects(
    () => authFailureRuntime.invoke(basicRequest("req-auth-failure"), {}),
    (error: unknown) => error instanceof TransportError && !JSON.stringify(error.toJSON()).includes("auth-provider secret"),
  );
  assert.equal(fetchCalls, 0);
  await authFailureRuntime.dispose();

  const networkRuntime = webRuntime({
    fetch: async () => {
      throw new Error("network secret");
    },
  });
  await networkRuntime.start();
  await assert.rejects(
    () => networkRuntime.invoke(basicRequest("req-network"), {}),
    (error: unknown) => error instanceof TransportError && !JSON.stringify(error.toJSON()).includes("network secret"),
  );
  await networkRuntime.dispose();

  const callerCancellation = createCancellationController();
  const pendingFetch = createAbortablePendingFetch();
  const pendingRuntime = webRuntime({ fetch: pendingFetch.fetch });
  await pendingRuntime.start();
  const pending = pendingRuntime.invoke(basicRequest("req-pending-cancel"), { cancellation: callerCancellation.signal });
  await pendingFetch.entered;
  callerCancellation.cancel("caller-left");
  await assert.rejects(
    pending,
    (error: unknown) => error instanceof CancelledError && JSON.stringify(error.details).includes("caller-left"),
  );
  await pendingRuntime.dispose();

  const ignoredAbort = createDeferredFetch();
  const ignoredAbortCancellation = createCancellationController();
  const ignoredAbortRuntime = webRuntime({ fetch: ignoredAbort.fetch });
  await ignoredAbortRuntime.start();
  const ignoredAbortPending = ignoredAbortRuntime.invoke(basicRequest("req-ignored-abort"), {
    cancellation: ignoredAbortCancellation.signal,
  });
  await ignoredAbort.entered;
  ignoredAbortCancellation.cancel("ignored-abort");
  ignoredAbort.resolve(new Response("late", { status: 200 }));
  await assert.rejects(
    ignoredAbortPending,
    (error: unknown) => error instanceof CancelledError && JSON.stringify(error.details).includes("ignored-abort"),
  );
  await ignoredAbortRuntime.dispose();

  const disposeFetch = createAbortablePendingFetch();
  const disposedRuntime = webRuntime({ fetch: disposeFetch.fetch });
  await disposedRuntime.start();
  const disposedPending = disposedRuntime.invoke(basicRequest("req-dispose-cancel"), {});
  await disposeFetch.entered;
  await disposedRuntime.dispose();
  await assert.rejects(disposedPending, CancelledError);

  const ignoredDispose = createDeferredFetch();
  const ignoredDisposeRuntime = webRuntime({ fetch: ignoredDispose.fetch });
  await ignoredDisposeRuntime.start();
  const ignoredDisposePending = ignoredDisposeRuntime.invoke(basicRequest("req-ignored-dispose"), {});
  await ignoredDispose.entered;
  await ignoredDisposeRuntime.dispose();
  ignoredDispose.resolve(new Response("late", { status: 200 }));
  await assert.rejects(
    ignoredDisposePending,
    (error: unknown) => error instanceof CancelledError && JSON.stringify(error.details).includes("disposed"),
  );
});

function basicRequest(requestId: string): OperationRequest {
  return operationRequest(createTransportRequest({ method: "GET", url: "/api/health", responseMode: "raw" }), requestId);
}

function operationRequest(
  payload: unknown,
  requestId = "req-web-direct",
  callerFingerprint = "caller:v1:web-test",
): OperationRequest {
  return {
    requestId,
    capability: HOLM_APP_HTTP_CAPABILITY,
    operation: WEB_HTTP_REQUEST_OPERATION,
    caller: {
      surface: "web",
      principal: { kind: "browser-session" },
      invocationId: requestId,
      startedAt: 0,
    },
    callerFingerprint,
    payload: payload as WireValue,
  };
}

function createDeferredFetch(): {
  readonly fetch: typeof fetch;
  readonly entered: Promise<void>;
  resolve(response: Response): void;
} {
  let markEntered: (() => void) | undefined;
  let resolveResponse: ((response: Response) => void) | undefined;
  const entered = new Promise<void>((resolve) => {
    markEntered = resolve;
  });
  const response = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });
  return {
    entered,
    fetch: async () => {
      markEntered?.();
      return response;
    },
    resolve(nextResponse: Response): void {
      resolveResponse?.(nextResponse);
    },
  };
}

function createAbortablePendingFetch(): { readonly fetch: typeof fetch; readonly entered: Promise<void> } {
  let markEntered: (() => void) | undefined;
  const entered = new Promise<void>((resolve) => {
    markEntered = resolve;
  });
  return {
    entered,
    fetch: async (_input, init = {}) => {
      markEntered?.();
      return await new Promise<Response>((_resolve, reject) => {
        const signal = init.signal;
        if (signal?.aborted) {
          reject({ name: "AbortError" });
          return;
        }
        signal?.addEventListener("abort", () => reject({ name: "AbortError" }), { once: true });
      });
    },
  };
}
