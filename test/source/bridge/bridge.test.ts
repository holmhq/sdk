import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  CancelledError,
  CapabilityVersionError,
  createCallerFingerprint,
  createCancellationController,
  createInvocationContext,
  createReadonlyBytes,
  HolmError,
  ProtocolError,
  UnsupportedCapabilityError,
} from "../../../src/core/index.js";
import {
  bridgeMailboxProtocol,
  copyBridgeMailboxEnvelope,
  createBridgeMailbox,
  createMockBridgeRuntime,
  createMockBridgeServices,
  createReservedDesktopBridgeRuntime,
  createReservedMobileBridgeRuntime,
  UnsupportedBridgeRuntimeServiceError,
  type BridgeMailboxEnvelope,
  type BridgeRuntimeServiceName,
} from "../../../src/bridge/index.js";

const reportsCapability = { id: "com.example.reports", major: 1, minMinor: 0 };
const reportsOffer = {
  id: "com.example.reports",
  origin: "runtime" as const,
  version: { major: 1, minor: 0 },
};
const caller = createInvocationContext(
  { surface: "desktop", principal: { kind: "member", id: "bridge-member" }, app: { id: "bridge-app" } },
  "req-caller",
  11,
  "bridge-test",
);

function isUnsupportedService(service: BridgeRuntimeServiceName): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof UnsupportedBridgeRuntimeServiceError &&
    error.code === "unsupported_runtime_service" &&
    (error.toJSON().details as { readonly service?: unknown }).service === service;
}

test("reserved desktop and mobile bridge runtimes advertise no production capabilities", async () => {
  const desktop = createReservedDesktopBridgeRuntime({ id: "desktop-reserved" });
  const mobile = createReservedMobileBridgeRuntime({ id: "mobile-reserved" });

  assert.equal(desktop.surface, "desktop");
  assert.equal(mobile.surface, "mobile");
  assert.deepEqual(await desktop.start(), []);
  assert.deepEqual(await mobile.start(), []);
  assert.throws(() => desktop.clock.now(), isUnsupportedService("clock"));
  assert.throws(() => mobile.scheduler.schedule(1, () => undefined), isUnsupportedService("scheduler"));
});

test("bridge mailbox copies and freezes request and response wire values and ignores duplicate or late messages", async () => {
  const posted: BridgeMailboxEnvelope[] = [];
  const mailbox = createBridgeMailbox({
    post(envelope) {
      posted.push(envelope);
    },
  });
  const payload = {
    title: "before",
    labels: ["alpha"],
    bytes: createReadonlyBytes([1, 2, 3]),
  };

  const pending = mailbox.request({
    requestId: "req-mailbox-copy",
    capability: reportsCapability,
    operation: "list",
    payload,
  });
  payload.title = "after";
  payload.labels.push("mutated");

  const request = posted[0];
  assert.equal(request?.protocol, bridgeMailboxProtocol);
  assert.equal(request?.kind, "request");
  assert.equal(Object.isFrozen(request), true);
  assert.equal(Object.isFrozen(request?.payload), true);
  assert.deepEqual(request?.payload, {
    title: "before",
    labels: ["alpha"],
    bytes: createReadonlyBytes([1, 2, 3]),
  });

  assert.equal(mailbox.receive({
    protocol: bridgeMailboxProtocol,
    kind: "response",
    requestId: "req-mailbox-copy",
    payload: { ok: true, bytes: createReadonlyBytes([4, 5]) },
  }), true);
  const response = await pending;
  assert.equal(mailbox.receive({
    protocol: bridgeMailboxProtocol,
    kind: "response",
    requestId: "req-mailbox-copy",
    payload: { late: true },
  }), false);
  assert.equal(mailbox.receive({
    protocol: bridgeMailboxProtocol,
    kind: "response",
    requestId: "req-missing",
    payload: { late: true },
  }), false);
  assert.equal(mailbox.receive({
    protocol: bridgeMailboxProtocol,
    kind: "response",
    requestId: "req-mailbox-copy",
    payload: () => undefined,
  } as unknown as BridgeMailboxEnvelope), false);
  assert.equal(mailbox.receive({
    protocol: bridgeMailboxProtocol,
    kind: "error",
    requestId: "req-mailbox-copy",
    error: {
      $holm: "error",
      kind: "native",
      code: "late_duplicate",
      message: "late duplicate",
      details: () => undefined,
    },
  } as unknown as BridgeMailboxEnvelope), false);

  assert.equal(Object.isFrozen(response), true);
  assert.equal(Object.isFrozen(response.payload), true);
  assert.deepEqual(response.payload, { ok: true, bytes: createReadonlyBytes([4, 5]) });
});

test("bridge mailbox copies and freezes event and cancel envelopes", () => {
  const payload = { status: "online", bytes: createReadonlyBytes([7]) };
  const event = copyBridgeMailboxEnvelope({
    protocol: bridgeMailboxProtocol,
    kind: "event",
    eventId: "evt-connectivity",
    name: "connectivity",
    payload,
  });
  payload.status = "offline";
  const cancel = copyBridgeMailboxEnvelope({
    protocol: bridgeMailboxProtocol,
    kind: "cancel",
    requestId: "req-cancel",
    reason: "caller-left",
  });

  assert.equal(Object.isFrozen(event), true);
  assert.equal(Object.isFrozen(event.payload), true);
  assert.deepEqual(event.payload, { status: "online", bytes: createReadonlyBytes([7]) });
  assert.equal(Object.isFrozen(cancel), true);
  assert.deepEqual(cancel, {
    protocol: bridgeMailboxProtocol,
    kind: "cancel",
    requestId: "req-cancel",
    reason: "caller-left",
  });
});

test("bridge mailbox rejects closures, class instances, cycles, and shared mutable handles", () => {
  const mailbox = createBridgeMailbox({ post() { return undefined; } });
  class NativeHandle {
    readonly id = "native";
  }
  const shared = { id: "shared" };
  const cycle: { self?: unknown } = {};
  cycle.self = cycle;

  for (const payload of [
    () => undefined,
    new NativeHandle(),
    cycle,
    { first: shared, second: shared },
    { dom: new NativeHandle() },
  ]) {
    assert.throws(
      () => mailbox.request({ requestId: `req-invalid-${Math.random()}`, capability: reportsCapability, operation: "list", payload }),
      (error: unknown) => error instanceof HolmError && error.code === "invalid_wire_value",
    );
  }
});

test("bridge service slots are explicit and fail with typed unsupported errors when not injected", async () => {
  const services = createMockBridgeServices({ adapter: "bridge-services", surface: "desktop" });

  assert.throws(() => services.secureStorage.get("token"), isUnsupportedService("secureStorage"));
  assert.throws(() => services.secureStorage.set("token", "value"), isUnsupportedService("secureStorage"));
  assert.throws(() => services.secureStorage.delete("token"), isUnsupportedService("secureStorage"));
  assert.throws(() => services.lifecycle.current(), isUnsupportedService("lifecycle"));
  assert.throws(() => services.lifecycle.subscribe(() => undefined), isUnsupportedService("lifecycle"));
  assert.throws(() => services.connectivity.current(), isUnsupportedService("connectivity"));
  assert.throws(() => services.connectivity.subscribe(() => undefined), isUnsupportedService("connectivity"));
  assert.throws(() => services.deepLink.initial(), isUnsupportedService("deepLink"));
  assert.throws(() => services.deepLink.subscribe(() => undefined), isUnsupportedService("deepLink"));
  assert.throws(() => services.navigation.open("holm://reports"), isUnsupportedService("navigation"));
  assert.throws(() => services.background.run("sync", null), isUnsupportedService("background"));
});

test("bridge mocks negotiate explicit test capabilities and copy invocations without production claims", async () => {
  const services = createMockBridgeServices({
    adapter: "bridge-mock",
    surface: "mobile",
    secureStorage: { entries: { token: "secret" } },
  });
  const runtime = createMockBridgeRuntime({
    id: "bridge-mock",
    surface: "mobile",
    capabilities: [reportsOffer],
    services,
    handlers: {
      "com.example.reports:list": (request) => {
        const token = services.secureStorage.get("token");
        if (token === undefined) {
          throw new Error("missing mock token");
        }
        return {
          requestId: request.requestId,
          payload: { echo: request.payload, token },
          metadata: { source: "mock" },
        };
      },
    },
  });
  const requestPayload = { filter: "open", bytes: createReadonlyBytes([8, 9]) };

  assert.deepEqual(await createReservedMobileBridgeRuntime({ id: "mobile-empty" }).start(), []);
  assert.deepEqual(await runtime.start(), [reportsOffer]);
  const response = await runtime.invoke({
    requestId: "req-bridge-mock",
    capability: reportsCapability,
    operation: "list",
    caller,
    callerFingerprint: createCallerFingerprint(caller),
    payload: requestPayload,
  }, {});
  requestPayload.filter = "closed";

  assert.equal(runtime.surface, "mobile");
  assert.equal(runtime.invocations.length, 1);
  assert.deepEqual(runtime.invocations[0]?.payload, { filter: "open", bytes: createReadonlyBytes([8, 9]) });
  assert.equal(Object.isFrozen(response), true);
  assert.equal(Object.isFrozen(response.payload), true);
  assert.deepEqual(response.payload, {
    echo: { filter: "open", bytes: createReadonlyBytes([8, 9]) },
    token: "secret",
  });
  assert.deepEqual(response.metadata, { source: "mock" });
});

test("bridge services copy injected snapshots and support reserved service slots", () => {
  const opened: string[] = [];
  const services = createMockBridgeServices({
    adapter: "bridge-rich-services",
    surface: "desktop",
    secureStorage: { entries: { token: { nested: { value: "before" } } } },
    lifecycle: { state: "active", at: 1 },
    connectivity: { kind: "online", metered: true, at: 2 },
    deepLink: { url: "holm://reports/1", at: 3 },
    navigation: { open: (url) => { opened.push(url); } },
    background: {
      sync(payload) {
        return { synced: payload };
      },
    },
  });

  const stored = services.secureStorage.get("token") as { readonly nested: { value: string } };
  assert.deepEqual(stored, { nested: { value: "before" } });
  assert.throws(() => { (stored.nested as { value: string }).value = "mutated"; }, TypeError);
  services.secureStorage.set("draft", { id: "draft-1" });
  assert.deepEqual(services.secureStorage.get("draft"), { id: "draft-1" });
  services.secureStorage.delete("draft");
  assert.equal(services.secureStorage.get("draft"), undefined);

  const lifecycleEvents: unknown[] = [];
  const unsubscribeLifecycle = services.lifecycle.subscribe((event) => lifecycleEvents.push(event));
  unsubscribeLifecycle();
  const connectivityEvents: unknown[] = [];
  const unsubscribeConnectivity = services.connectivity.subscribe((event) => connectivityEvents.push(event));
  unsubscribeConnectivity();
  const deepLinkEvents: unknown[] = [];
  const unsubscribeDeepLink = services.deepLink.subscribe((event) => deepLinkEvents.push(event));
  unsubscribeDeepLink();

  assert.deepEqual(services.lifecycle.current(), { state: "active", at: 1 });
  assert.deepEqual(services.connectivity.current(), { kind: "online", metered: true, at: 2 });
  assert.deepEqual(services.deepLink.initial(), { url: "holm://reports/1", at: 3 });
  services.navigation.open("holm://reports/open");
  assert.deepEqual(opened, ["holm://reports/open"]);
  assert.deepEqual(services.background.run("sync", { id: "payload" }), { synced: { id: "payload" } });
  assert.equal(services.background.run("missing", null), undefined);
  assert.deepEqual(lifecycleEvents, []);
  assert.deepEqual(connectivityEvents, []);
  assert.deepEqual(deepLinkEvents, []);

  const directBackground = createMockBridgeServices({
    background: { run: (_task, payload) => payload },
  });
  assert.deepEqual(directBackground.background.run("echo", { ok: true }), { ok: true });

  const defaultServices = createMockBridgeServices();
  assert.throws(() => defaultServices.secureStorage.get("token"), isUnsupportedService("secureStorage"));
  const directServices = createMockBridgeServices({
    lifecycle: { current: () => ({ state: "background" }), subscribe: () => () => undefined },
    connectivity: { current: () => ({ kind: "unknown" }), subscribe: () => () => undefined },
    deepLink: { initial: () => undefined, subscribe: () => () => undefined },
  });
  assert.deepEqual(directServices.lifecycle.current(), { state: "background" });
  assert.deepEqual(directServices.connectivity.current(), { kind: "unknown" });
  assert.equal(directServices.deepLink.initial(), undefined);
  assert.equal(
    new UnsupportedBridgeRuntimeServiceError({ adapter: "bridge-custom", surface: "mobile", service: "deepLink", message: "custom" }).message,
    "custom",
  );
});

test("bridge mailbox validates duplicate, error, cancel, and malformed envelopes", async () => {
  const posted: BridgeMailboxEnvelope[] = [];
  const mailbox = createBridgeMailbox({ post: (envelope) => { posted.push(envelope); } });
  const duplicate = mailbox.request({ requestId: "req-duplicate", capability: reportsCapability, operation: "list", payload: null });
  assert.throws(
    () => mailbox.request({ requestId: "req-duplicate", capability: reportsCapability, operation: "list", payload: null }),
    (error: unknown) => error instanceof ProtocolError && error.code === "bridge_mailbox_request_duplicate",
  );
  assert.equal(mailbox.cancel("req-duplicate", "caller-left"), true);
  await assert.rejects(duplicate, (error: unknown) => error instanceof CancelledError && error.code === "operation_cancelled");
  assert.equal(mailbox.cancel("req-missing"), false);
  assert.equal(posted.at(-1)?.kind, "cancel");

  const denied = mailbox.request({ requestId: "req-error", capability: reportsCapability, operation: "list", payload: null });
  assert.equal(mailbox.receive({
    protocol: bridgeMailboxProtocol,
    kind: "error",
    requestId: "req-error",
    error: { $holm: "error", kind: "remote", code: "native_denied", message: "Denied.", details: { safe: true }, status: 403, retryable: false },
  }), true);
  await assert.rejects(
    denied,
    (error: unknown) => error instanceof HolmError && error.code === "native_denied" && error.status === 403,
  );

  assert.throws(
    () => createBridgeMailbox({ post: () => { throw new Error("post failed"); } })
      .request({ requestId: "req-post-fails", capability: reportsCapability, operation: "list", payload: null }),
    (error: unknown) => error instanceof ProtocolError && error.code === "bridge_mailbox_post_failed",
  );
  assert.throws(
    () => mailbox.receive({ protocol: "wrong", kind: "event", payload: null } as unknown as BridgeMailboxEnvelope),
    (error: unknown) => error instanceof ProtocolError && error.code === "invalid_bridge_mailbox_protocol",
  );
  assert.deepEqual(copyBridgeMailboxEnvelope({
    protocol: bridgeMailboxProtocol,
    kind: "response",
    requestId: "req-copy-response",
    payload: { ok: true },
    metadata: { trace: "trace-1" },
  }), {
    protocol: bridgeMailboxProtocol,
    kind: "response",
    requestId: "req-copy-response",
    payload: { ok: true },
    metadata: { trace: "trace-1" },
  });
  assert.deepEqual(copyBridgeMailboxEnvelope({
    protocol: bridgeMailboxProtocol,
    kind: "error",
    requestId: "req-copy-error",
    error: { $holm: "error", kind: "remote", code: "REMOTE", message: "Remote.", retryable: true },
  }).error?.retryable, true);
  assert.equal(mailbox.receive({
    protocol: bridgeMailboxProtocol,
    kind: "event",
    eventId: "evt-late",
    name: "connectivity",
    payload: { online: true },
  }), false);
  assert.equal(mailbox.receive({
    protocol: bridgeMailboxProtocol,
    kind: "cancel",
    requestId: "req-late-cancel",
  }), false);
  for (const envelope of [
    { protocol: bridgeMailboxProtocol, kind: "request", requestId: "", capability: reportsCapability, operation: "list", payload: null },
    { protocol: bridgeMailboxProtocol, kind: "request", requestId: "req-no-capability", operation: "list", payload: null },
    { protocol: bridgeMailboxProtocol, kind: "request", requestId: "req-no-operation", capability: reportsCapability, operation: "", payload: null },
    { protocol: bridgeMailboxProtocol, kind: "event", eventId: "evt-no-payload", name: "connectivity" },
    { protocol: bridgeMailboxProtocol, kind: "error", requestId: "req-invalid-error", error: { $holm: "error", kind: "remote", code: "", message: "bad" } },
    { protocol: bridgeMailboxProtocol, kind: "unknown", payload: null },
  ]) {
    assert.throws(
      () => copyBridgeMailboxEnvelope(envelope as unknown as BridgeMailboxEnvelope),
      (error: unknown) => error instanceof ProtocolError,
    );
  }
});

test("bridge runtimes reject reserved invocation, version drift, and cancellation", async () => {
  const reserved = createReservedDesktopBridgeRuntime({
    id: "desktop-reserved-rich",
    clock: { now: () => 7 },
    scheduler: { schedule: () => ({ cancel: () => undefined }) },
  });
  assert.equal(reserved.clock.now(), 7);
  assert.deepEqual(await reserved.dispose(), undefined);
  await assert.rejects(
    () => reserved.invoke({
      requestId: "req-reserved",
      capability: reportsCapability,
      operation: "list",
      caller,
      callerFingerprint: createCallerFingerprint(caller),
      payload: null,
    }, {}),
    (error: unknown) => error instanceof UnsupportedCapabilityError && error.code === "unsupported_capability",
  );

  assert.throws(() => createMockBridgeRuntime({ id: " ", surface: "desktop" }), TypeError);
  const runtime = createMockBridgeRuntime({
    id: "bridge-versioned",
    surface: "desktop",
    capabilities: [reportsOffer],
  });
  await assert.rejects(
    () => runtime.invoke({
      requestId: "req-unsupported",
      capability: { id: "com.example.missing", major: 1 },
      operation: "list",
      caller,
      callerFingerprint: createCallerFingerprint(caller),
      payload: null,
    }, {}),
    (error: unknown) => error instanceof UnsupportedCapabilityError,
  );
  await assert.rejects(
    () => runtime.invoke({
      requestId: "req-version",
      capability: { id: reportsCapability.id, major: 1, minMinor: 2 },
      operation: "list",
      caller,
      callerFingerprint: createCallerFingerprint(caller),
      payload: null,
    }, {}),
    (error: unknown) => error instanceof CapabilityVersionError,
  );
  runtime.setCapabilities([{ ...reportsOffer, version: { major: 1, minor: 2 } }]);
  const echo = await runtime.invoke({
    requestId: "req-echo",
    capability: { id: reportsCapability.id, major: 1, minMinor: 2 },
    operation: "list",
    caller,
    callerFingerprint: createCallerFingerprint(caller),
    payload: { ok: true },
  }, { timeoutMs: 5 });
  assert.deepEqual(echo.payload, { ok: true });
  assert.deepEqual(runtime.controls[0], { timeoutMs: 5 });

  runtime.setHandler("com.example.reports:custom", () => ({ requestId: "req-custom", payload: { mismatch: true } }));
  const cancelled = createCancellationController();
  cancelled.cancel("caller-left");
  await assert.rejects(
    () => runtime.invoke({
      requestId: "req-cancelled",
      capability: { id: reportsCapability.id, major: 1, minMinor: 2 },
      operation: "custom",
      caller,
      callerFingerprint: createCallerFingerprint(caller),
      payload: null,
    }, { cancellation: cancelled.signal }),
    (error: unknown) => error instanceof CancelledError,
  );
});
