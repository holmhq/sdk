export function createCoreEnvironment() {
    return "core";
}
export { createCallerPartitionedCacheKey, normalizeCacheSourceIdentity, } from "./cache-key.js";
export { assertWireValue, canonicalEncodeWireValue, copyWireValue, createReadonlyBytes, isReadonlyBytes, isWireValue, } from "./wire-value.js";
export { HolmError, isHolmError, serializeHolmError, } from "./errors.js";
export { createDiagnosticsSink, createHolmDiagnosticEvent, } from "./diagnostics.js";
export { CapabilityVersionError, createCapabilityRegistry, DuplicateCapabilityOfferError, InvalidCapabilityRequirementError, negotiateCapability, UnsupportedCapabilityError, } from "./capabilities.js";
export { createCallerFingerprint, createInvocationContext, createStaticCallerProvider, normalizeCallerContext, onCallerTransition, resolveCallerContext, } from "./caller.js";
export { invokeRuntime } from "./invoke.js";
export { CancelledError, createCancellationController, TimeoutError, } from "./cancellation.js";
export { createHolm, } from "./create-holm.js";
export { createLifecycleController, LifecycleError, } from "./lifecycle.js";
export { createExtensionGraph, createExtensionLifecycle, ExtensionError, } from "./extensions.js";
export { runtimeEnvelopeProtocol } from "./runtime.js";
//# sourceMappingURL=index.js.map