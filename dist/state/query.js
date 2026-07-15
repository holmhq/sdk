import { CancelledError, createCallerFingerprint, createCallerPartitionedCacheKey, createCancellationController, HolmError, LifecycleError, normalizeCacheSourceIdentity, onCallerTransition, resolveCallerContext, } from "../core/index.js";
import { copyWireValue } from "../core/wire-value.js";
import { createResourceController, } from "./resource.js";
export function createQueryResource(options) {
    const key = normalizeQueryKey(options.key);
    const controller = createResourceController({
        ...(options.clock === undefined ? {} : { clock: options.clock }),
        ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
        ...(options.id === undefined ? {} : { id: options.id }),
        ...(options.copy === undefined ? {} : { copy: options.copy }),
    });
    let source = normalizeCacheSourceIdentity(options.source);
    let caller = options.caller;
    let callerUnsubscribe = subscribeToCaller(caller);
    let active;
    let disposed = false;
    const query = Object.freeze({
        getSnapshot() {
            return controller.resource.getSnapshot();
        },
        subscribe(listener) {
            return controller.resource.subscribe(listener);
        },
        refresh(input = {}) {
            return refresh(input);
        },
        currentLoad() {
            return active?.promise ?? Promise.resolve(controller.getSnapshot());
        },
        markStale() {
            assertNotDisposed();
            return controller.setStale(true);
        },
        reconcile(data, input = {}) {
            return reconcile(data, input);
        },
        reset(input = {}) {
            return reset(input);
        },
        dispose() {
            dispose();
        },
    });
    function refresh(input = {}) {
        assertNotDisposed();
        if (active !== undefined && input.force !== true) {
            return active.promise;
        }
        if (active !== undefined) {
            cancelActive("query refresh replaced");
        }
        const before = controller.getSnapshot();
        const hasData = before.data !== undefined;
        controller.setLoading({
            stale: before.stale || hasData,
            refreshing: hasData,
            retainData: hasData,
        });
        const cancellation = createCancellationController();
        const cleanupExternal = attachExternalCancellation(cancellation, input.cancellation);
        const token = Object.freeze({});
        const promise = Promise.resolve().then(() => runLoad(token, cancellation.signal, input)).finally(() => {
            if (active?.token === token) {
                active = undefined;
            }
            cleanupExternal();
        });
        active = Object.freeze({
            token,
            promise,
            cancellation,
            cleanup: cleanupExternal,
        });
        return promise;
    }
    async function runLoad(token, signal, input) {
        try {
            throwIfQueryCancelled(signal);
            const resolvedCaller = await resolveCallerContext(caller);
            throwIfQueryCancelled(signal);
            const callerFingerprint = createCallerFingerprint(resolvedCaller);
            const cacheKey = createQueryCacheKey(source, callerFingerprint, key);
            const context = Object.freeze({
                key,
                source,
                caller: resolvedCaller,
                callerFingerprint,
                cacheKey,
                cancellation: signal,
                stale: controller.getSnapshot().stale,
                ...(input.reason === undefined ? {} : { reason: input.reason }),
            });
            const data = await raceWithCancellation(invokeLoader(options.load, context), signal);
            if (!isActive(token)) {
                throw new CancelledError({ reason: signal.reason ?? "query load superseded" });
            }
            return controller.setReady(data);
        }
        catch (error) {
            const normalized = normalizeQueryError(error);
            if (!isActive(token)) {
                throw normalized;
            }
            const current = controller.getSnapshot();
            return controller.setError(normalized, {
                stale: current.data !== undefined || current.stale,
                refreshing: false,
                retainData: current.data !== undefined,
            });
        }
    }
    function reconcile(data, input) {
        assertNotDisposed();
        const snapshot = controller.setReady(data, {
            stale: input.stale ?? false,
            refreshing: input.refreshing ?? false,
        });
        reportReconcile(input.reason, snapshot);
        return snapshot;
    }
    function reset(input = {}) {
        assertNotDisposed();
        const shouldReload = controller.getSnapshot().phase !== "idle";
        cancelActive("query reset");
        if (input.source !== undefined) {
            source = normalizeCacheSourceIdentity(input.source);
        }
        if (input.caller !== undefined) {
            callerUnsubscribe();
            caller = input.caller;
            callerUnsubscribe = subscribeToCaller(caller);
        }
        controller.setIdle();
        if (shouldReload) {
            void refresh({ force: true, ...(input.reason === undefined ? {} : { reason: input.reason }) }).catch(() => undefined);
        }
        return controller.getSnapshot();
    }
    function dispose() {
        if (disposed) {
            return;
        }
        disposed = true;
        callerUnsubscribe();
        cancelActive("query disposed");
        controller.dispose();
    }
    function cancelActive(reason) {
        const pending = active;
        if (pending === undefined) {
            return;
        }
        active = undefined;
        pending.cleanup();
        pending.cancellation.cancel(reason);
    }
    function subscribeToCaller(provider) {
        return onCallerTransition(provider, () => {
            if (disposed) {
                return;
            }
            const snapshot = reset({ reason: "caller changed" });
            if (snapshot.phase === "loading") {
                active?.promise.catch(() => undefined);
            }
        });
    }
    function isActive(token) {
        return !disposed && active?.token === token;
    }
    function reportReconcile(reason, snapshot) {
        if (options.diagnostics === undefined) {
            return;
        }
        try {
            options.diagnostics.emit({
                channel: "state.query",
                code: "state_query_reconciled",
                severity: "debug",
                message: "State query resource reconciled with an authoritative payload.",
                details: {
                    resourceId: options.id ?? "query",
                    revision: snapshot.revision,
                    phase: snapshot.phase,
                    ...(reason === undefined ? {} : { reason }),
                },
            });
        }
        catch {
            // Diagnostics are observational and must not alter reconciliation.
        }
    }
    function assertNotDisposed() {
        if (!disposed && controller.getSnapshot().phase !== "disposed") {
            return;
        }
        throw new LifecycleError({
            code: "state_query_disposed",
            message: "State query resource has been disposed.",
        });
    }
    return query;
}
function normalizeQueryKey(key) {
    if (!Array.isArray(key)) {
        throw new TypeError("Query key must be a canonical tuple array.");
    }
    return Object.freeze(copyWireValue(key));
}
function createQueryCacheKey(source, callerFingerprint, key) {
    return createCallerPartitionedCacheKey({
        namespace: "state.query",
        source,
        callerFingerprint,
        operation: key,
    });
}
function attachExternalCancellation(cancellation, external) {
    if (external === undefined) {
        return noop;
    }
    if (external.cancelled) {
        cancellation.cancel(external.reason);
        return noop;
    }
    return external.onCancel(() => {
        cancellation.cancel(external.reason);
    });
}
function invokeLoader(loader, context) {
    try {
        return Promise.resolve(loader(context));
    }
    catch (error) {
        return Promise.reject(error);
    }
}
function raceWithCancellation(work, signal) {
    if (signal.cancelled) {
        return Promise.reject(new CancelledError(signal.reason === undefined ? {} : { reason: signal.reason }));
    }
    return new Promise((resolve, reject) => {
        let settled = false;
        const unsubscribe = signal.onCancel(() => {
            finish(() => {
                reject(new CancelledError(signal.reason === undefined ? {} : { reason: signal.reason }));
            });
        });
        const finish = (callback) => {
            if (settled) {
                return;
            }
            settled = true;
            unsubscribe();
            callback();
        };
        work.then((value) => {
            finish(() => resolve(value));
        }, (error) => {
            finish(() => reject(error));
        });
    });
}
function throwIfQueryCancelled(signal) {
    if (signal.cancelled) {
        throw new CancelledError(signal.reason === undefined ? {} : { reason: signal.reason });
    }
}
function normalizeQueryError(error) {
    if (error instanceof HolmError) {
        return error;
    }
    return new HolmError({
        kind: "protocol",
        code: "state_query_loader_error",
        message: "State query loader failed.",
    });
}
function noop() {
    // Intentionally empty.
}
//# sourceMappingURL=query.js.map