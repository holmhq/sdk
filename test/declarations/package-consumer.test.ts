import {
  canonicalEncodeWireValue,
  createCoreEnvironment,
  createReadonlyBytes,
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

// @ts-expect-error Declaration consumers must not widen the core fixture value.
const invalidEnvironment: CoreEnvironment = "browser";

void environment;
void encoded;
void serialized;
void invalidEnvironment;
