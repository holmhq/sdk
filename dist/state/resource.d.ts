import { type HolmDiagnosticsSink } from "../core/index.js";
import type { HolmError } from "../core/errors.js";
import type { ReadonlyDeep } from "../core/extensions.js";
import type { Clock } from "../core/runtime.js";
export type ResourcePhase = "idle" | "loading" | "ready" | "error" | "disposed";
export interface ResourceSnapshot<T, E = HolmError> {
    readonly revision: number;
    readonly phase: ResourcePhase;
    readonly data?: ReadonlyDeep<T>;
    readonly error?: E;
    readonly stale: boolean;
    readonly refreshing: boolean;
    readonly updatedAt?: number;
}
export type ResourceSnapshotListener = () => void;
export type ResourceUnsubscribe = () => void;
export interface Resource<T, E = HolmError> {
    getSnapshot(): ResourceSnapshot<T, E>;
    subscribe(listener: ResourceSnapshotListener): ResourceUnsubscribe;
    dispose(): void;
}
export type ResourceValueCopier<T> = (value: T) => T;
export interface ResourceControllerOptions<T> {
    readonly clock?: Clock;
    readonly diagnostics?: HolmDiagnosticsSink;
    readonly id?: string;
    readonly copy?: ResourceValueCopier<T>;
}
export interface ResourceLoadingOptions {
    readonly stale?: boolean;
    readonly refreshing?: boolean;
    readonly retainData?: boolean;
}
export interface ResourceReadyOptions {
    readonly stale?: boolean;
    readonly refreshing?: boolean;
}
export interface ResourceErrorOptions {
    readonly stale?: boolean;
    readonly refreshing?: boolean;
    readonly retainData?: boolean;
}
export interface ResourceController<T, E = HolmError> {
    readonly resource: Resource<T, E>;
    getSnapshot(): ResourceSnapshot<T, E>;
    setIdle(): ResourceSnapshot<T, E>;
    setLoading(options?: ResourceLoadingOptions): ResourceSnapshot<T, E>;
    setReady(data: T, options?: ResourceReadyOptions): ResourceSnapshot<T, E>;
    setError(error: E, options?: ResourceErrorOptions): ResourceSnapshot<T, E>;
    setStale(stale?: boolean): ResourceSnapshot<T, E>;
    dispose(): ResourceSnapshot<T, E>;
}
export declare function createResourceController<T, E = HolmError>(options?: ResourceControllerOptions<T>): ResourceController<T, E>;
//# sourceMappingURL=resource.d.ts.map