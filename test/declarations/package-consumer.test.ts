import {
  canonicalEncodeWireValue,
  createCapabilityRegistry,
  createCallerFingerprint,
  createCoreEnvironment,
  createExtensionLifecycle,
  createReadonlyBytes,
  createStaticCallerProvider,
  type CapabilityOffer,
  type CapabilitySnapshot,
  type CallerContext,
  type ExtensionLifecycle,
  type HolmExtension,
  HolmError,
  runtimeEnvelopeProtocol,
  type RuntimeAdapter,
  type CoreEnvironment,
  type SerializedHolmError,
  type WireValue,
} from "@holmhq/sdk";

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
const runtime: RuntimeAdapter = {
  id: "runtime-test",
  surface: "test",
  clock: { now: () => 1 },
  async invoke(request) {
    return { requestId: request.requestId, payload: null };
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
void invalidEnvironment;
