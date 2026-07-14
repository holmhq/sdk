import { HolmError, LifecycleError } from "../core/index.js";
import { createResourceController, } from "./resource.js";
export function createDerivedResource(options) {
    const resourceId = normalizeResourceId(options.id);
    const dependencies = normalizeDependencies(options.dependencies);
    const controller = createResourceController({
        ...(options.clock === undefined ? {} : { clock: options.clock }),
        ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
        id: resourceId,
        ...(options.copy === undefined ? {} : { copy: options.copy }),
    });
    let disposed = false;
    let unsubscribes = dependencies.map((dependency) => dependency.subscribe(() => {
        if (!disposed) {
            evaluate();
        }
    }));
    const derived = Object.freeze({
        getSnapshot() {
            return controller.resource.getSnapshot();
        },
        subscribe(listener) {
            return controller.resource.subscribe(listener);
        },
        refresh() {
            assertNotDisposed();
            return evaluate();
        },
        dispose() {
            dispose();
        },
    });
    evaluate();
    return derived;
    function evaluate() {
        assertNotDisposed();
        const snapshots = dependencies.map((dependency) => dependency.getSnapshot());
        if (snapshots.some((snapshot) => snapshot.phase === "disposed")) {
            return dispose();
        }
        const errorSnapshot = snapshots.find((snapshot) => snapshot.phase === "error" && snapshot.error !== undefined);
        if (errorSnapshot?.error !== undefined) {
            const current = controller.getSnapshot();
            return controller.setError(errorSnapshot.error, {
                stale: snapshots.some((snapshot) => snapshot.stale) || current.data !== undefined,
                refreshing: false,
                retainData: current.data !== undefined,
            });
        }
        const hasEveryDependencyData = snapshots.every((snapshot) => snapshot.data !== undefined);
        if (!hasEveryDependencyData) {
            if (snapshots.some((snapshot) => snapshot.phase === "loading" || snapshot.refreshing)) {
                const current = controller.getSnapshot();
                return controller.setLoading({
                    stale: snapshots.some((snapshot) => snapshot.stale) || current.data !== undefined,
                    refreshing: snapshots.some((snapshot) => snapshot.refreshing),
                    retainData: current.data !== undefined,
                });
            }
            return controller.setIdle();
        }
        try {
            const data = options.derive(snapshots);
            return controller.setReady(data, {
                stale: snapshots.some((snapshot) => snapshot.stale),
                refreshing: snapshots.some((snapshot) => snapshot.refreshing),
            });
        }
        catch (error) {
            const normalized = normalizeDerivedError(error, resourceId);
            const current = controller.getSnapshot();
            return controller.setError(normalized, {
                stale: snapshots.some((snapshot) => snapshot.stale) || current.data !== undefined,
                refreshing: false,
                retainData: current.data !== undefined,
            });
        }
    }
    function dispose() {
        if (disposed) {
            return controller.getSnapshot();
        }
        disposed = true;
        for (const unsubscribe of unsubscribes) {
            unsubscribe();
        }
        unsubscribes = [];
        return controller.dispose();
    }
    function assertNotDisposed() {
        if (!disposed && controller.getSnapshot().phase !== "disposed") {
            return;
        }
        throw new LifecycleError({
            code: "state_derived_disposed",
            message: "State derived resource has been disposed.",
        });
    }
}
function normalizeDependencies(dependencies) {
    if (!Array.isArray(dependencies) || dependencies.length === 0) {
        throw new TypeError("Derived resource dependencies must be a non-empty resource array.");
    }
    for (const dependency of dependencies) {
        if (typeof dependency?.getSnapshot !== "function" || typeof dependency.subscribe !== "function") {
            throw new TypeError("Derived resource dependencies must be state resources.");
        }
    }
    return Object.freeze([...dependencies]);
}
function normalizeDerivedError(error, resourceId) {
    if (error instanceof HolmError) {
        return error;
    }
    return new HolmError({
        kind: "protocol",
        code: "state_derived_compute_error",
        message: "State derived resource computation failed.",
        details: { resourceId },
    });
}
function normalizeResourceId(value) {
    if (value === undefined) {
        return "derived";
    }
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError("State derived id must be a non-empty string when provided.");
    }
    return normalized;
}
//# sourceMappingURL=derived.js.map