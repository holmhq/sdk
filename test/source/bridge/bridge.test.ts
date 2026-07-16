import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createCallerFingerprint, createInvocationContext, createReadonlyBytes, HolmError } from "../../../src/core/index.js";
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

  const response = await pending;
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
  assert.throws(() => services.lifecycle.current(), isUnsupportedService("lifecycle"));
  assert.throws(() => services.connectivity.current(), isUnsupportedService("connectivity"));
  assert.throws(() => services.deepLink.initial(), isUnsupportedService("deepLink"));
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
