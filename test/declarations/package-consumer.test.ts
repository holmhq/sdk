import {
  canonicalEncodeWireValue,
  createCapabilityRegistry,
  createCallerFingerprint,
  createCoreEnvironment,
  createExtensionLifecycle,
  createHolm,
  createReadonlyBytes,
  createStaticCallerProvider,
  type CapabilityOffer,
  type CapabilitySnapshot,
  type CallerContext,
  type ExtensionLifecycle,
  type HolmExtension,
  HolmError,
  TimeoutError,
  runtimeEnvelopeProtocol,
  type RuntimeAdapter,
  type Scheduler,
  type CoreEnvironment,
  type SerializedHolmError,
  type WireValue,
} from "@holmhq/sdk";
import {
  applyTransportAuth,
  createTransportRequest,
  decodeTransportResponse,
  type TransportRequest,
  type TransportResponseMode,
} from "@holmhq/sdk/transports";
import { createNodeTokenAuth } from "@holmhq/sdk/node";
import { createWebSessionAuth } from "@holmhq/sdk/web";
import { createFakeClock, createInMemoryRuntimeAdapter } from "@holmhq/sdk/test";

const environment: CoreEnvironment = createCoreEnvironment();
const bytes = createReadonlyBytes([1, 2, 3]);
const value: WireValue = { environment, bytes };
const encoded: string = canonicalEncodeWireValue(value);
const error = new HolmError({
  kind: "serialization",
  code: "invalid_wire_value",
  message: "Invalid wire value",
});
const serialized: SerializedHolmError = error.toJSON();
const registry = createCapabilityRegistry([
  { id: "com.example.reports", origin: "runtime", version: { major: 1, minor: 0 } },
]);
const capability: CapabilityOffer = registry.require({ id: "com.example.reports", major: 1 });
const capabilitySnapshot: CapabilitySnapshot = registry.getSnapshot();
const callerContext: CallerContext = { surface: "test", principal: { kind: "anonymous" } };
const caller = createStaticCallerProvider(callerContext);
const fingerprint: string = createCallerFingerprint(callerContext);
const scheduler: Scheduler = { schedule: () => ({ cancel: () => undefined }) };
const runtime: RuntimeAdapter = {
  id: "runtime-test",
  surface: "test",
  clock: { now: () => 1 },
  scheduler,
  async start() {
    return [];
  },
  async invoke(request) {
    return { requestId: request.requestId, payload: null };
  },
  async dispose() {
    return undefined;
  },
};
const reportsExtension = {
  id: "com.example.reports",
  namespace: "reports",
  version: { major: 1, minor: 0 },
  setup() {
    return { api: { list: () => ["ready"] as const } };
  },
} satisfies HolmExtension<{ readonly list: () => readonly string[] }, "reports">;
const extensionLifecycle: ExtensionLifecycle = createExtensionLifecycle([reportsExtension] as const, {
  capabilities: createCapabilityRegistry([]),
});
const fake = createFakeClock();
const testRuntime = createInMemoryRuntimeAdapter({ clock: fake.clock, scheduler: fake.scheduler });
const holm = createHolm({ runtime: testRuntime, caller });
const timeout = new TimeoutError({ timeoutMs: 1 });
const responseMode: TransportResponseMode = "json";
const transportRequest: TransportRequest = createTransportRequest({
  method: "GET",
  url: "/api/reports",
  responseMode,
});
const webAuth = createWebSessionAuth({ credentials: "same-origin" });
const nodeAuth = createNodeTokenAuth({ token: "test-token" });
const decoded = decodeTransportResponse({ requestId: "req-decl", status: 200, body: "{\"ok\":true}", responseMode });
const appliedTransport = applyTransportAuth(transportRequest, nodeAuth);

// @ts-expect-error Declaration consumers must not widen the core fixture value.
const invalidEnvironment: CoreEnvironment = "browser";

void environment;
void encoded;
void serialized;
void capability;
void capabilitySnapshot;
void caller;
void fingerprint;
void runtime;
void runtimeEnvelopeProtocol;
void extensionLifecycle;
void holm;
void timeout;
void transportRequest;
void webAuth;
void nodeAuth;
void decoded;
void appliedTransport;
void invalidEnvironment;
