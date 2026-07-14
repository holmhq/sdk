import { LifecycleError, } from "../core/index.js";
export const REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY = Object.freeze({
    id: "holm.realtime.public.subscribe",
    major: 1,
    minMinor: 0,
});
const realtimeHookSupports = Object.freeze({
    publicSubscribe: true,
    privateChannels: false,
    presence: false,
    collaboration: false,
    durableReplay: false,
});
export function createRealtimeReconcileHook(options) {
    const resourceId = normalizeResourceId(options.id);
    const requirement = normalizePublicRequirement(options.requirement ?? REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY);
    let disposed = false;
    function handle(hint) {
        assertNotDisposed(disposed);
        options.capabilities.require(requirement);
        if (hint.kind === "invalidate") {
            const invalidated = options.query.markStale();
            emitHookDiagnostic(options.diagnostics, resourceId, hint.kind, hint.reason, invalidated);
            if (hint.refresh === true) {
                return options.query.refresh({ force: true, ...(hint.reason === undefined ? {} : { reason: hint.reason }) });
            }
            return invalidated;
        }
        const reconciled = options.query.reconcile(hint.data, hint.reason === undefined ? {} : { reason: hint.reason });
        emitHookDiagnostic(options.diagnostics, resourceId, hint.kind, hint.reason, reconciled);
        return reconciled;
    }
    return Object.freeze({
        durable: false,
        supports: realtimeHookSupports,
        handle,
        dispose() {
            disposed = true;
        },
    });
}
function normalizePublicRequirement(requirement) {
    if (requirement.id !== REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY.id ||
        requirement.major !== REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY.major ||
        (requirement.minMinor ?? 0) !== REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY.minMinor) {
        throw new TypeError("Realtime resource hooks are limited to public realtime subscribe invalidation/reconcile boundaries.");
    }
    return REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY;
}
function emitHookDiagnostic(diagnostics, resourceId, kind, reason, snapshot) {
    if (diagnostics === undefined) {
        return;
    }
    try {
        diagnostics.emit({
            channel: "state.realtime",
            code: kind === "invalidate" ? "state_realtime_invalidated" : "state_realtime_reconciled",
            severity: "debug",
            message: kind === "invalidate"
                ? "Realtime event invalidated a query resource."
                : "Realtime event reconciled a query resource.",
            details: {
                resourceId,
                phase: snapshot.phase,
                revision: snapshot.revision,
                ...(reason === undefined ? {} : { reason }),
            },
        });
    }
    catch {
        // Realtime hook diagnostics are observational only.
    }
}
function assertNotDisposed(disposed) {
    if (!disposed) {
        return;
    }
    throw new LifecycleError({
        code: "state_realtime_hook_disposed",
        message: "State realtime reconcile hook has been disposed.",
    });
}
function normalizeResourceId(value) {
    if (value === undefined) {
        return "realtime";
    }
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError("State realtime hook id must be a non-empty string when provided.");
    }
    return normalized;
}
//# sourceMappingURL=reconcile.js.map