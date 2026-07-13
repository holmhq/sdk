import { HolmError } from "./errors.js";
import type { CancellationSignal, Scheduler, ScheduledTask } from "./runtime.js";

export interface CancellationController {
  readonly signal: CancellationSignal;
  cancel(reason?: string): void;
}

export interface CancelledErrorOptions {
  readonly reason?: string;
  readonly message?: string;
}

export interface TimeoutErrorOptions {
  readonly timeoutMs: number;
  readonly message?: string;
}

export class CancelledError extends HolmError {
  constructor(options: CancelledErrorOptions = {}) {
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
  constructor(options: TimeoutErrorOptions) {
    super({
      kind: "timeout",
      code: "operation_timeout",
      message: options.message ?? `Operation timed out after ${options.timeoutMs}ms.`,
      details: Object.freeze({ timeoutMs: options.timeoutMs }),
    });
    this.name = "TimeoutError";
  }
}

export function createCancellationController(): CancellationController {
  let cancelled = false;
  let reason: string | undefined;
  const listeners = new Set<() => void>();
  const signal = Object.freeze({
    get cancelled(): boolean {
      return cancelled;
    },
    get reason(): string | undefined {
      return reason;
    },
    onCancel(listener: () => void): () => void {
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
  }) satisfies CancellationSignal;

  return Object.freeze({
    signal,
    cancel(nextReason?: string): void {
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

export function throwIfCancelled(signal: CancellationSignal | undefined): void {
  if (signal?.cancelled) {
    throw new CancelledError(signal.reason === undefined ? {} : { reason: signal.reason });
  }
}

export function validateTimeoutMs(timeoutMs: number | undefined): void {
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

export interface CancellationScope {
  readonly signal: CancellationSignal;
  race<T>(work: Promise<T>): Promise<T>;
  cancel(reason?: string): void;
  cleanup(): void;
}

export interface CancellationScopeOptions {
  readonly scheduler: Scheduler;
  readonly timeoutMs?: number;
  readonly external?: CancellationSignal;
  readonly owner?: CancellationSignal;
}

export function createCancellationScope(options: CancellationScopeOptions): CancellationScope {
  validateTimeoutMs(options.timeoutMs);
  throwIfCancelled(options.external);
  throwIfCancelled(options.owner);

  const controller = createCancellationController();
  let timeoutTask: ScheduledTask | undefined;
  const cleanupCallbacks: (() => void)[] = [];

  if (options.external) {
    cleanupCallbacks.push(
      options.external.onCancel(() => {
        controller.cancel(options.external?.reason);
      }),
    );
  }
  if (options.owner) {
    cleanupCallbacks.push(
      options.owner.onCancel(() => {
        controller.cancel(options.owner?.reason);
      }),
    );
  }
  if (options.timeoutMs !== undefined) {
    timeoutTask = options.scheduler.schedule(options.timeoutMs, () => {
      controller.cancel(timeoutReason(options.timeoutMs as number));
    });
  }

  return Object.freeze({
    signal: controller.signal,
    cancel(reason?: string): void {
      controller.cancel(reason);
    },
    async race<T>(work: Promise<T>): Promise<T> {
      if (controller.signal.cancelled) {
        throw cancellationError(controller.signal, options.timeoutMs);
      }
      return await new Promise<T>((resolve, reject) => {
        let settled = false;
        const unsubscribe = controller.signal.onCancel(() => {
          finish(() => {
            reject(cancellationError(controller.signal, options.timeoutMs));
          });
        });
        const finish = (callback: () => void): void => {
          if (settled) {
            return;
          }
          settled = true;
          unsubscribe();
          callback();
        };
        work.then(
          (value) => {
            finish(() => {
              resolve(value);
            });
          },
          (error: unknown) => {
            finish(() => {
              reject(error);
            });
          },
        );
      });
    },
    cleanup(): void {
      timeoutTask?.cancel();
      timeoutTask = undefined;
      for (const cleanup of cleanupCallbacks.splice(0)) {
        cleanup();
      }
    },
  });
}

function cancellationError(signal: CancellationSignal, timeoutMs: number | undefined): HolmError {
  if (timeoutMs !== undefined && signal.reason === timeoutReason(timeoutMs)) {
    return new TimeoutError({ timeoutMs });
  }
  return new CancelledError(signal.reason === undefined ? {} : { reason: signal.reason });
}

function timeoutReason(timeoutMs: number): string {
  return `timeout:${timeoutMs}`;
}
