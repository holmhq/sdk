export function createCoreEnvironment() {
    return "core";
}
export { assertWireValue, canonicalEncodeWireValue, copyWireValue, createReadonlyBytes, isReadonlyBytes, isWireValue, } from "./wire-value.js";
export { HolmError, isHolmError, serializeHolmError, } from "./errors.js";
export { CapabilityVersionError, createCapabilityRegistry, DuplicateCapabilityOfferError, InvalidCapabilityRequirementError, negotiateCapability, UnsupportedCapabilityError, } from "./capabilities.js";
export { createCallerFingerprint, createInvocationContext, createStaticCallerProvider, normalizeCallerContext, resolveCallerContext, } from "./caller.js";
export { invokeRuntime } from "./invoke.js";
export { createLifecycleController, LifecycleError, } from "./lifecycle.js";
export { createExtensionGraph, createExtensionLifecycle, ExtensionError, } from "./extensions.js";
export { runtimeEnvelopeProtocol } from "./runtime.js";
//# sourceMappingURL=index.js.map