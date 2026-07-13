import {
  canonicalEncodeWireValue,
  createCapabilityRegistry,
  createCoreEnvironment,
  createReadonlyBytes,
  type CapabilityOffer,
  type CapabilitySnapshot,
  HolmError,
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

// @ts-expect-error Declaration consumers must not widen the core fixture value.
const invalidEnvironment: CoreEnvironment = "browser";

void environment;
void encoded;
void serialized;
void capability;
void capabilitySnapshot;
void invalidEnvironment;
