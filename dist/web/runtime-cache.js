import { CancelledError, throwIfCancelled } from "../core/cancellation.js";
import { createTransportCache, } from "../transports/index.js";
export function createWebRuntimeCache(options, clock, scheduler, diagnostics) {
    if (options === false) {
        return undefined;
    }
    const policy = Object.freeze({
        ttlMs: normalizeCacheDuration(options?.ttlMs ?? 30_000, "ttlMs"),
        swrMs: normalizeCacheDuration(options?.swrMs ?? 60_000, "swrMs"),
    });
    return Object.freeze({
        instance: createTransportCache({
            clock,
            scheduler,
            maxEntries: options?.maxEntries ?? 100,
            ...(diagnostics === undefined ? {} : { diagnostics }),
        }),
        policy,
    });
}
export function waitForWebResponse(response, cancellation) {
    if (cancellation === undefined) {
        return response;
    }
    throwIfCancelled(cancellation);
    return new Promise((resolve, reject) => {
        let settled = false;
        const unsubscribe = cancellation.onCancel(() => {
            finish(() => reject(new CancelledError(cancellation.reason === undefined ? {} : { reason: cancellation.reason })));
        });
        const finish = (complete) => {
            if (settled) {
                return;
            }
            settled = true;
            unsubscribe();
            complete();
        };
        response.then((value) => finish(() => resolve(value)), (error) => finish(() => reject(error)));
    });
}
export function rebindResponseRequestId(response, requestId) {
    return Object.freeze({
        ...response,
        requestId,
    });
}
function normalizeCacheDuration(value, label) {
    if (!Number.isFinite(value) || value < 0) {
        throw new TypeError(`Web runtime cache ${label} must be a non-negative finite number.`);
    }
    return value;
}
//# sourceMappingURL=runtime-cache.js.map