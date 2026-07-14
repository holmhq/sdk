import {} from "../core/index.js";
export function createResourceHistory(resource, options = {}) {
    const resourceId = normalizeResourceId(options.id);
    const capacity = normalizeCapacity(options.capacity);
    const entries = [];
    let disposed = false;
    const unsubscribe = resource.subscribe(() => {
        if (!disposed) {
            record(resource.getSnapshot());
        }
    });
    if (options.includeInitial === true) {
        record(resource.getSnapshot());
    }
    return Object.freeze({
        getEntries() {
            return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
        },
        dispose() {
            if (disposed) {
                return;
            }
            disposed = true;
            unsubscribe();
        },
    });
    function record(snapshot) {
        const at = timestamp(options.clock);
        const entry = Object.freeze({
            resourceId,
            revision: snapshot.revision,
            phase: snapshot.phase,
            stale: snapshot.stale,
            refreshing: snapshot.refreshing,
            hasData: snapshot.data !== undefined,
            ...(at === undefined ? {} : { at }),
            ...(snapshot.updatedAt === undefined ? {} : { updatedAt: snapshot.updatedAt }),
            ...(snapshot.error?.code === undefined ? {} : { errorCode: snapshot.error.code }),
        });
        entries.push(entry);
        while (entries.length > capacity) {
            entries.shift();
        }
        emitHistoryDiagnostic(options.diagnostics, entry);
    }
}
function emitHistoryDiagnostic(diagnostics, entry) {
    if (diagnostics === undefined) {
        return;
    }
    try {
        diagnostics.emit({
            channel: "state.history",
            code: "state_resource_history_recorded",
            severity: "debug",
            message: "State resource history entry recorded.",
            details: entry,
        });
    }
    catch {
        // History is observational and must not alter resource delivery.
    }
}
function timestamp(clock) {
    if (clock === undefined) {
        return undefined;
    }
    const value = clock.now();
    if (!Number.isFinite(value)) {
        throw new TypeError("State resource history clock must return a finite timestamp.");
    }
    return value;
}
function normalizeCapacity(value) {
    if (value === undefined) {
        return 100;
    }
    if (!Number.isInteger(value) || value <= 0) {
        throw new TypeError("State resource history capacity must be a positive integer.");
    }
    return value;
}
function normalizeResourceId(value) {
    if (value === undefined) {
        return "resource";
    }
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError("State resource history id must be a non-empty string when provided.");
    }
    return normalized;
}
//# sourceMappingURL=diagnostics.js.map