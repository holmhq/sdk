import { HolmError } from "./errors.js";
export class CancelledError extends HolmError {
    constructor(options = {}) {
        super({
            kind: "cancellation",
            code: "operation_cancelled",
            message: options.message ?? "Operation was cancelled.",
            details: options.reason === undefined ? undefined : Object.freeze({ reason: options.reason }),
        });
        this.name = "CancelledError";
    }
}
export class TimeoutError extends HolmError {
    constructor(options) {
        super({
            kind: "timeout",
            code: "operation_timeout",
            message: options.message ?? `Operation timed out after ${options.timeoutMs}ms.`,
            details: Object.freeze({ timeoutMs: options.timeoutMs }),
        });
        this.name = "TimeoutError";
    }
}
export function createCancellationController() {
    let cancelled = false;
    let reason;
    const listeners = new Set();
    const signal = Object.freeze({
        get cancelled() {
            return cancelled;
        },
        get reason() {
            return reason;
        },
        onCancel(listener) {
            if (cancelled) {
                listener();
                return () => undefined;
            }
            listeners.add(listener);
            let active = true;
            return () => {
                if (!active) {
                    return;
                }
                active = false;
                listeners.delete(listener);
            };
        },
    });
    return Object.freeze({
        signal,
        cancel(nextReason) {
            if (cancelled) {
                return;
            }
            cancelled = true;
            reason = nextReason;
            const current = [...listeners];
            listeners.clear();
            for (const listener of current) {
                listener();
            }
        },
    });
}
export function throwIfCancelled(signal) {
    if (signal?.cancelled) {
        throw new CancelledError(signal.reason === undefined ? {} : { reason: signal.reason });
    }
}
export function validateTimeoutMs(timeoutMs) {
    if (timeoutMs === undefined) {
        return;
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
        throw new TimeoutError({
            timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 0,
            message: "Timeout must be a non-negative finite number.",
        });
    }
}
export function createCancellationScope(options) {
    validateTimeoutMs(options.timeoutMs);
    throwIfCancelled(options.external);
    throwIfCancelled(options.owner);
    const controller = createCancellationController();
    let timeoutTask;
    const cleanupCallbacks = [];
    if (options.external) {
        cleanupCallbacks.push(options.external.onCancel(() => {
            controller.cancel(options.external?.reason);
        }));
    }
    if (options.owner) {
        cleanupCallbacks.push(options.owner.onCancel(() => {
            controller.cancel(options.owner?.reason);
        }));
    }
    if (options.timeoutMs !== undefined) {
        timeoutTask = options.scheduler.schedule(options.timeoutMs, () => {
            controller.cancel(timeoutReason(options.timeoutMs));
        });
    }
    return Object.freeze({
        signal: controller.signal,
        cancel(reason) {
            controller.cancel(reason);
        },
        async race(work) {
            if (controller.signal.cancelled) {
                throw cancellationError(controller.signal, options.timeoutMs);
            }
            return await new Promise((resolve, reject) => {
                let settled = false;
                const unsubscribe = controller.signal.onCancel(() => {
                    finish(() => {
                        reject(cancellationError(controller.signal, options.timeoutMs));
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
                    finish(() => {
                        resolve(value);
                    });
                }, (error) => {
                    finish(() => {
                        reject(error);
                    });
                });
            });
        },
        cleanup() {
            timeoutTask?.cancel();
            timeoutTask = undefined;
            for (const cleanup of cleanupCallbacks.splice(0)) {
                cleanup();
            }
        },
    });
}
function cancellationError(signal, timeoutMs) {
    if (timeoutMs !== undefined && signal.reason === timeoutReason(timeoutMs)) {
        return new TimeoutError({ timeoutMs });
    }
    return new CancelledError(signal.reason === undefined ? {} : { reason: signal.reason });
}
function timeoutReason(timeoutMs) {
    return `timeout:${timeoutMs}`;
}
//# sourceMappingURL=cancellation.js.map