import { CapabilityVersionError, UnsupportedCapabilityError, } from "./capabilities.js";
import { createCallerFingerprint, createInvocationContext, resolveCallerContext, } from "./caller.js";
import { copyWireValue } from "./wire-value.js";
export async function invokeRuntime(options) {
    const capability = requireRuntimeCapability(options);
    const caller = await resolveCallerContext(options.caller);
    const callerFingerprint = createCallerFingerprint(caller);
    const request = Object.freeze({
        requestId: options.requestId,
        capability,
        operation: options.operation,
        caller: createInvocationContext(caller, options.requestId, options.runtime.clock.now(), options.reason),
        callerFingerprint,
        payload: copyWireValue(options.payload),
    });
    const control = Object.freeze({ ...(options.control ?? {}) });
    options.onCallerPartition?.(Object.freeze({
        runtime: Object.freeze({ id: options.runtime.id, surface: options.runtime.surface }),
        capability,
        operation: options.operation,
        caller,
        fingerprint: callerFingerprint,
    }));
    return copyOperationResponse(await options.runtime.invoke(request, control));
}
function requireRuntimeCapability(options) {
    try {
        const offer = options.capabilities.require(options.capability);
        return Object.freeze({
            id: offer.id,
            major: options.capability.major,
            ...(options.capability.minMinor === undefined ? {} : { minMinor: options.capability.minMinor }),
        });
    }
    catch (error) {
        if (error instanceof UnsupportedCapabilityError) {
            throw new UnsupportedCapabilityError({
                id: options.capability.id,
                requirement: options.capability,
                offered: options.capabilities.getSnapshot().offers,
                adapter: options.runtime.id,
                surface: options.runtime.surface,
            });
        }
        if (error instanceof CapabilityVersionError) {
            throw new CapabilityVersionError({
                id: options.capability.id,
                requirement: options.capability,
                offered: options.capabilities.getSnapshot().offers.filter((offer) => offer.id === options.capability.id),
                adapter: options.runtime.id,
                surface: options.runtime.surface,
            });
        }
        throw error;
    }
}
function copyOperationResponse(response) {
    return Object.freeze({
        requestId: response.requestId,
        payload: copyWireValue(response.payload),
        ...(response.metadata === undefined ? {} : { metadata: copyWireValue(response.metadata) }),
    });
}
//# sourceMappingURL=invoke.js.map