export function createCoreEnvironment() {
    return "core";
}
export { assertWireValue, canonicalEncodeWireValue, copyWireValue, createReadonlyBytes, isReadonlyBytes, isWireValue, } from "./wire-value.js";
export { HolmError, isHolmError, serializeHolmError, } from "./errors.js";
export { CapabilityVersionError, createCapabilityRegistry, DuplicateCapabilityOfferError, InvalidCapabilityRequirementError, negotiateCapability, UnsupportedCapabilityError, } from "./capabilities.js";
//# sourceMappingURL=index.js.map