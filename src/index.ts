export {
  assertWireValue,
  canonicalEncodeWireValue,
  copyWireValue,
  createCoreEnvironment,
  createReadonlyBytes,
  HolmError,
  isHolmError,
  isReadonlyBytes,
  isWireValue,
  serializeHolmError,
} from "./core/index.js";
export type {
  CoreEnvironment,
  HolmBytesTag,
  HolmErrorKind,
  HolmErrorOptions,
  ReadonlyBytes,
  SerializedHolmError,
  WireArray,
  WireObject,
  WireScalar,
  WireValue,
} from "./core/index.js";
