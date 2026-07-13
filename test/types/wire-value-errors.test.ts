import type { HolmErrorKind, SerializedHolmError } from "../../src/core/errors.js";
import {
  createReadonlyBytes,
  type ReadonlyBytes,
  type WireValue,
} from "../../src/core/wire-value.js";

const bytes = createReadonlyBytes(new Uint8Array([1, 2, 3]));
const validValue: WireValue = {
  ok: [null, true, 1, "text", bytes],
};
const serialized: SerializedHolmError = {
  $holm: "error",
  kind: "serialization",
  code: "invalid_wire_value",
  message: "Invalid wire value",
  details: validValue,
};
const kind: HolmErrorKind = serialized.kind;

// @ts-expect-error undefined is not a wire value.
const invalidUndefined: WireValue = undefined;

// @ts-expect-error bigint is not a wire value.
const invalidBigInt: WireValue = 1n;

// @ts-expect-error mutable byte arrays are not SDK-owned readonly bytes.
const invalidBytes: ReadonlyBytes = new Uint8Array([1]);

void validValue;
void kind;
void invalidUndefined;
void invalidBigInt;
void invalidBytes;
