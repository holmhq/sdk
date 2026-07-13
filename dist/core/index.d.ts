export type CoreEnvironment = "core";
export declare function createCoreEnvironment(): CoreEnvironment;
export { assertWireValue, canonicalEncodeWireValue, copyWireValue, createReadonlyBytes, isReadonlyBytes, isWireValue, } from "./wire-value.js";
export type { HolmBytesTag, ReadonlyBytes, WireArray, WireObject, WireScalar, WireValue } from "./wire-value.js";
export { HolmError, isHolmError, serializeHolmError } from "./errors.js";
export type { HolmErrorKind, HolmErrorOptions, SerializedHolmError } from "./errors.js";
//# sourceMappingURL=index.d.ts.map