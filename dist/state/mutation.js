import { CancelledError, createCallerFingerprint, createCancellationController, HolmError, LifecycleError, normalizeCacheSourceIdentity, resolveCallerContext, } from "../core/index.js";
import { copyWireValue } from "../core/wire-value.js";
import { createResourceController, } from "./resource.js";
export function createMutationResource(options) {
    const resourceId = normalizeResourceId(options.id);
    const controller = createResourceController({
        ...(options.clock === undefined ? {} : { clock: options.clock }),
        ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
        id: resourceId,
        ...(options.copy === undefined ? {} : { copy: options.copy }),
    });
    const source = normalizeCacheSourceIdentity(options.source);
    let active;
    let disposed = false;
    const mutation = Object.freeze({
        getSnapshot() {
            return controller.resource.getSnapshot();
        },
        subscribe(listener) {
            return controller.resource.subscribe(listener);
        },
        execute(payload, input = {}) {
            return execute(payload, input);
        },
        currentExecution() {
            return active?.promise ?? Promise.resolve(controller.getSnapshot());
        },
        reset() {
            return reset();
        },
        dispose() {
            dispose();
        },
    });
    function execute(payload, input) {
        assertNotDisposed();
        if (active !== undefined) {
            throw new LifecycleError({
                code: "state_mutation_busy",
                message: "State mutation resource already has an active execution.",
            });
        }
        const copiedPayload = copyMutationPayload(payload);
        const before = controller.getSnapshot();
        controller.setLoading({
            stale: before.data !== undefined || before.stale,
            refreshing: false,
            retainData: before.data !== undefined,
        });
        const cancellation = createCancellationController();
        const cleanupExternal = attachExternalCancellation(cancellation, input.cancellation);
        const token = Object.freeze({});
        const promise = Promise.resolve()
            .then(() => runMutation(token, before, copiedPayload, cancellation.signal, input))
            .finally(() => {
            if (active?.token === token) {
                active = undefined;
            }
            cleanupExternal();
        });
        active = Object.freeze({ token, promise, cancellation, cleanup: cleanupExternal });
        return promise;
    }
    async function runMutation(token, before, payload, signal, input) {
        let context;
        let optimisticApplied = false;
        try {
            throwIfMutationCancelled(signal);
            const caller = await resolveCallerContext(options.caller);
            throwIfMutationCancelled(signal);
            const callerFingerprint = createCallerFingerprint(caller);
            context = Object.freeze({
                payload,
                source,
                caller,
                callerFingerprint,
                cancellation: signal,
                ...(input.reason === undefined ? {} : { reason: input.reason }),
            });
            if (options.optimistic !== undefined) {
                const optimistic = options.optimistic(payload, context);
                if (optimistic !== undefined) {
                    optimisticApplied = true;
                    controller.setReady(optimistic, { stale: true, refreshing: true });
                }
            }
            const result = await raceWithCancellation(invokeExecutor(options.execute, payload, context), signal);
            if (!isActive(token)) {
                throw new CancelledError({ reason: signal.reason ?? "mutation execution superseded" });
            }
            const ready = controller.setReady(result);
            await emitInvalidation(ready, payload, context);
            if (!isActive(token)) {
                throw new CancelledError({ reason: signal.reason ?? "mutation execution superseded" });
            }
            return ready;
        }
        catch (error) {
            const normalized = normalizeMutationError(error, context, payload);
            if (!isActive(token)) {
                throw normalized;
            }
            if (optimisticApplied) {
                return rollbackToError(before, normalized);
            }
            const current = controller.getSnapshot();
            return controller.setError(normalized, {
                stale: current.data !== undefined || before.stale,
                refreshing: false,
                retainData: current.data !== undefined,
            });
        }
    }
    function rollbackToError(before, error) {
        if (before.data !== undefined) {
            controller.setReady(before.data, { stale: before.stale, refreshing: before.refreshing });
            return controller.setError(error, { stale: true, refreshing: false, retainData: true });
        }
        if (before.phase === "idle") {
            controller.setIdle();
        }
        return controller.setError(error, { stale: before.stale, refreshing: false, retainData: false });
    }
    async function emitInvalidation(ready, payload, context) {
        if (options.onInvalidate === undefined || ready.data === undefined) {
            return;
        }
        const invalidations = resolveInvalidations(options.invalidates, ready.data, payload, context);
        if (invalidations.length === 0) {
            return;
        }
        const event = Object.freeze({
            source,
            caller: context.caller,
            callerFingerprint: context.callerFingerprint,
            payload,
            result: ready.data,
            invalidations,
            ...(context.reason === undefined ? {} : { reason: context.reason }),
        });
        try {
            await options.onInvalidate(event);
        }
        catch (error) {
            reportInvalidationHookError(error, invalidations, context);
        }
    }
    function reset() {
        assertNotDisposed();
        cancelActive("mutation reset");
        return controller.setIdle();
    }
    function dispose() {
        if (disposed) {
            return;
        }
        disposed = true;
        cancelActive("mutation disposed");
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
    function normalizeMutationError(error, context, payload) {
        if (context !== undefined && options.normalizeError !== undefined) {
            return options.normalizeError(error, context);
        }
        if (error instanceof HolmError) {
            return error;
        }
        return new HolmError({
            kind: "protocol",
            code: "state_mutation_execute_error",
            message: "State mutation executor failed.",
            details: { resourceId, payload },
        });
    }
    function reportInvalidationHookError(error, invalidations, context) {
        options.diagnostics?.emit({
            channel: "state.mutation",
            code: "state_mutation_invalidate_hook_error",
            severity: "error",
            message: "State mutation invalidation hook failed.",
            details: {
                resourceId,
                callerFingerprint: context.callerFingerprint,
                invalidations,
            },
            error,
        });
    }
    function isActive(token) {
        return !disposed && active?.token === token;
    }
    function assertNotDisposed() {
        if (!disposed && controller.getSnapshot().phase !== "disposed") {
            return;
        }
        throw new LifecycleError({
            code: "state_mutation_disposed",
            message: "State mutation resource has been disposed.",
        });
    }
    return mutation;
}
function copyMutationPayload(payload) {
    return copyWireValue(payload);
}
function resolveInvalidations(declaration, result, payload, context) {
    const invalidations = typeof declaration === "function"
        ? declaration(result, payload, context)
        : declaration ?? [];
    return Object.freeze(invalidations.map(normalizeInvalidation));
}
function normalizeInvalidation(input) {
    const tags = normalizeStrings(input.tags ?? [], "tag");
    const prefixes = normalizeStrings(input.prefixes ?? [], "prefix");
    if (tags.length === 0 && prefixes.length === 0) {
        throw new TypeError("Mutation invalidation requires a tag or prefix.");
    }
    return Object.freeze({
        ...(prefixes.length === 0 ? {} : { prefixes }),
        ...(tags.length === 0 ? {} : { tags }),
    });
}
function normalizeStrings(values, label) {
    const normalized = [...new Set(values.map((value) => normalizeNonEmpty(value, label)))].sort();
    return Object.freeze(normalized);
}
function normalizeNonEmpty(value, label) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError(`Mutation invalidation ${label} must be a non-empty string.`);
    }
    return normalized;
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
function invokeExecutor(executor, payload, context) {
    try {
        return Promise.resolve(executor(payload, context));
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
function throwIfMutationCancelled(signal) {
    if (signal.cancelled) {
        throw new CancelledError(signal.reason === undefined ? {} : { reason: signal.reason });
    }
}
function normalizeResourceId(value) {
    if (value === undefined) {
        return "mutation";
    }
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError("State mutation id must be a non-empty string when provided.");
    }
    return normalized;
}
function noop() {
    // Intentionally empty.
}
//# sourceMappingURL=mutation.js.map