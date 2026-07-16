import { createCallerFingerprint, createInvocationContext } from "../../src/core/index.js";
import {
  createBridgeMailbox,
  createMockBridgeRuntime,
  createMockBridgeServices,
  createReservedDesktopBridgeRuntime,
  createReservedMobileBridgeRuntime,
  UnsupportedBridgeRuntimeServiceError,
  type BridgeRuntimeAdapter,
  type BridgeRuntimeServiceName,
} from "../../src/bridge/index.js";

const desktop = createReservedDesktopBridgeRuntime();
const mobile: BridgeRuntimeAdapter = createReservedMobileBridgeRuntime();
const services = createMockBridgeServices({ secureStorage: { entries: { token: "value" } } });
const serviceName: BridgeRuntimeServiceName = "secureStorage";
const error = new UnsupportedBridgeRuntimeServiceError({ adapter: desktop.id, surface: desktop.surface, service: serviceName });
const caller = createInvocationContext(
  { surface: "desktop", principal: { kind: "member", id: "bridge-type" }, app: { id: "bridge-app" } },
  "req-bridge-type",
  1,
  "type-test",
);
const mock = createMockBridgeRuntime({
  surface: "desktop",
  capabilities: [{ id: "com.example.bridge", origin: "runtime", version: { major: 1, minor: 0 } }],
});
const mailbox = createBridgeMailbox({ post: () => undefined });
const fingerprint: string = createCallerFingerprint(caller);

// @ts-expect-error Bridge/core type tests compile without DOM ambient types.
type BridgeDocument = Document;

// @ts-expect-error Bridge/core type tests compile without Node ambient types.
const bridgeProcess = process;

// @ts-expect-error Reserved bridge runtimes are desktop/mobile, not web.
const wrongSurface: "web" = desktop.surface;

void mobile;
void services;
void error;
void mock;
void mailbox;
void fingerprint;
void bridgeProcess;
void wrongSurface;
