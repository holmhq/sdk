import { HolmError } from "./errors.js";
import type { CancellationSignal, Scheduler } from "./runtime.js";
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
export declare class CancelledError extends HolmError {
    constructor(options?: CancelledErrorOptions);
}
export declare class TimeoutError extends HolmError {
    constructor(options: TimeoutErrorOptions);
}
export declare function createCancellationController(): CancellationController;
export declare function throwIfCancelled(signal: CancellationSignal | undefined): void;
export declare function validateTimeoutMs(timeoutMs: number | undefined): void;
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
export declare function createCancellationScope(options: CancellationScopeOptions): CancellationScope;
//# sourceMappingURL=cancellation.d.ts.map