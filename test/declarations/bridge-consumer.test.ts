import {
  bridgeMailboxProtocol,
  bridgeRuntimeSupport,
  copyBridgeMailboxEnvelope,
  createBridgeMailbox,
  createMockBridgeRuntime,
  createMockBridgeServices,
  createReservedDesktopBridgeRuntime,
  createReservedMobileBridgeRuntime,
  UnsupportedBridgeRuntimeServiceError,
  type BridgeMailboxEnvelope,
  type BridgeRuntimeAdapter,
  type BridgeRuntimeServiceName,
} from "@holmhq/sdk/bridge";
import { createCallerFingerprint, createInvocationContext, createReadonlyBytes } from "@holmhq/sdk";

const desktop = createReservedDesktopBridgeRuntime({ id: "decl-desktop" });
const mobile: BridgeRuntimeAdapter = createReservedMobileBridgeRuntime({ id: "decl-mobile" });
const services = createMockBridgeServices({
  adapter: "decl-bridge",
  surface: "desktop",
  secureStorage: { entries: { token: "decl-token" } },
  background: { sync: (payload) => payload },
});
const serviceName: BridgeRuntimeServiceName = "background";
const serviceError = new UnsupportedBridgeRuntimeServiceError({ adapter: desktop.id, surface: desktop.surface, service: serviceName });
const caller = createInvocationContext(
  { surface: "desktop", principal: { kind: "member", id: "decl-bridge" }, app: { id: "decl-app" } },
  "req-decl-bridge",
  1,
  "declaration",
);
const runtime = createMockBridgeRuntime({
  id: "decl-bridge-runtime",
  surface: "desktop",
  capabilities: [{ id: "com.example.bridge", origin: "runtime", version: { major: 1, minor: 0 } }],
  services,
});
const mailbox = createBridgeMailbox({ post: (_envelope: BridgeMailboxEnvelope) => undefined });
const request = mailbox.request({
  requestId: "req-decl-mailbox",
  capability: { id: "com.example.bridge", major: 1 },
  operation: "echo",
  payload: { bytes: createReadonlyBytes([1, 2]) },
});
const accepted: boolean = mailbox.receive({
  protocol: bridgeMailboxProtocol,
  kind: "response",
  requestId: "req-decl-mailbox",
  payload: { ok: true },
});
const eventEnvelope = copyBridgeMailboxEnvelope({
  protocol: bridgeMailboxProtocol,
  kind: "event",
  eventId: "evt-decl",
  name: "connectivity",
  payload: { online: true },
});
const fingerprint: string = createCallerFingerprint(caller);
const declarationBridgeStatus: "reserved" = bridgeRuntimeSupport.status;
const declarationBridgeProduction: "not production" = bridgeRuntimeSupport.production;
const declarationBridgeDesktop: "unsupported" = bridgeRuntimeSupport.desktop;
const declarationBridgeMobile: "unsupported" = bridgeRuntimeSupport.mobile;

// @ts-expect-error Bridge runtime surfaces are reserved desktop/mobile, not web.
const wrongSurface: "web" = mobile.surface;

void desktop;
void services;
void serviceError;
void runtime;
void request;
void accepted;
void eventEnvelope;
void fingerprint;
void declarationBridgeStatus;
void declarationBridgeProduction;
void declarationBridgeDesktop;
void declarationBridgeMobile;
void wrongSurface;
