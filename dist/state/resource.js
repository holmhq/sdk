import { LifecycleError, } from "../core/index.js";
import { copyWireValue } from "../core/wire-value.js";
export function createResourceController(options = {}) {
    const listeners = new Set();
    const resourceId = normalizeResourceId(options.id);
    let snapshot = freezeSnapshot({ revision: 0, phase: "idle", stale: false, refreshing: false });
    const resource = Object.freeze({
        getSnapshot: () => snapshot,
        subscribe(listener) {
            if (typeof listener !== "function") {
                throw new TypeError("State resource listener must be a function.");
            }
            if (snapshot.phase === "disposed") {
                return noop;
            }
            listeners.add(listener);
            let subscribed = true;
            return () => {
                if (!subscribed) {
                    return;
                }
                subscribed = false;
                listeners.delete(listener);
            };
        },
        dispose() {
            dispose();
        },
    });
    function getSnapshot() {
        return snapshot;
    }
    function setLoading(input = {}) {
        assertActive(snapshot);
        const retainData = input.retainData ?? input.refreshing === true;
        return install({
            phase: "loading",
            stale: input.stale ?? false,
            refreshing: input.refreshing ?? false,
            ...(retainData && snapshot.data !== undefined ? { data: copyResourceValue(snapshot.data, options.copy) } : {}),
        });
    }
    function setReady(data, input = {}) {
        assertActive(snapshot);
        const updatedAt = timestamp(options.clock);
        return install({
            phase: "ready",
            data: copyResourceValue(data, options.copy),
            stale: input.stale ?? false,
            refreshing: input.refreshing ?? false,
            ...(updatedAt === undefined ? {} : { updatedAt }),
        });
    }
    function setError(error, input = {}) {
        assertActive(snapshot);
        const retainData = input.retainData ?? snapshot.data !== undefined;
        const updatedAt = timestamp(options.clock);
        return install({
            phase: "error",
            error,
            stale: input.stale ?? false,
            refreshing: input.refreshing ?? false,
            ...(updatedAt === undefined ? {} : { updatedAt }),
            ...(retainData && snapshot.data !== undefined ? { data: copyResourceValue(snapshot.data, options.copy) } : {}),
        });
    }
    function dispose() {
        if (snapshot.phase === "disposed") {
            return snapshot;
        }
        const updatedAt = timestamp(options.clock);
        const next = freezeSnapshot({
            revision: snapshot.revision + 1,
            phase: "disposed",
            stale: false,
            refreshing: false,
            ...(updatedAt === undefined ? {} : { updatedAt }),
        });
        snapshot = next;
        const currentListeners = [...listeners];
        listeners.clear();
        notify(currentListeners);
        return snapshot;
    }
    function install(input) {
        const next = freezeSnapshot({ revision: snapshot.revision + 1, ...input });
        snapshot = next;
        notify([...listeners]);
        return snapshot;
    }
    function notify(currentListeners) {
        currentListeners.forEach((listener, index) => {
            try {
                listener();
            }
            catch (error) {
                reportListenerError(options.diagnostics, resourceId, snapshot, index, error);
            }
        });
    }
    return Object.freeze({
        resource,
        getSnapshot,
        setLoading,
        setReady,
        setError,
        dispose,
    });
}
function assertActive(snapshot) {
    if (snapshot.phase !== "disposed") {
        return;
    }
    throw new LifecycleError({
        code: "state_resource_disposed",
        message: "State resource has been disposed.",
    });
}
function copyResourceValue(value, copier) {
    if (copier !== undefined) {
        return deepFreeze(copier(value), new WeakSet());
    }
    return copyWireValue(value);
}
function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) {
        return value;
    }
    if (seen.has(value)) {
        return value;
    }
    seen.add(value);
    for (const key of Object.keys(value)) {
        deepFreeze(value[key], seen);
    }
    return Object.freeze(value);
}
function freezeSnapshot(draft) {
    const cleaned = {
        revision: draft.revision,
        phase: draft.phase,
        stale: draft.stale,
        refreshing: draft.refreshing,
    };
    if (draft.data !== undefined) {
        cleaned.data = draft.data;
    }
    if (draft.error !== undefined) {
        cleaned.error = draft.error;
    }
    if (draft.updatedAt !== undefined) {
        cleaned.updatedAt = draft.updatedAt;
    }
    return Object.freeze(cleaned);
}
function timestamp(clock) {
    if (clock === undefined) {
        return undefined;
    }
    const at = clock.now();
    if (!Number.isFinite(at)) {
        throw new TypeError("State resource clock must return a finite timestamp.");
    }
    return at;
}
function normalizeResourceId(value) {
    if (value === undefined) {
        return "resource";
    }
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError("State resource id must be a non-empty string when provided.");
    }
    return normalized;
}
function reportListenerError(diagnostics, resourceId, snapshot, listenerIndex, error) {
    if (diagnostics === undefined) {
        return;
    }
    try {
        diagnostics.emit({
            channel: "state.resource",
            code: "state_resource_listener_error",
            severity: "error",
            message: "State resource listener failed.",
            details: {
                resourceId,
                phase: snapshot.phase,
                revision: snapshot.revision,
                listenerIndex,
            },
            error,
        });
    }
    catch {
        // Diagnostics are observational and must not alter resource delivery.
    }
}
function noop() {
    // Intentionally empty.
}
//# sourceMappingURL=resource.js.map