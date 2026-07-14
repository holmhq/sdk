import { HolmError, type CacheSourceIdentity, type CallerContext, type CallerProvider, type CancellationSignal, type HolmDiagnosticsSink, type WireValue } from "../core/index.js";
import type { Clock } from "../core/runtime.js";
import { type Resource, type ResourceSnapshot, type ResourceValueCopier } from "./resource.js";
export type QueryKey = readonly unknown[];
export interface QueryLoadContext {
    readonly key: readonly WireValue[];
    readonly source: CacheSourceIdentity;
    readonly caller: CallerContext;
    readonly callerFingerprint: string;
    readonly cacheKey: string;
    readonly cancellation: CancellationSignal;
    readonly stale: boolean;
    readonly reason?: string;
}
export type QueryLoader<T> = (context: QueryLoadContext) => T | Promise<T>;
export interface QueryRefreshOptions {
    readonly cancellation?: CancellationSignal;
    readonly force?: boolean;
    readonly reason?: string;
}
export interface QueryResetOptions {
    readonly source?: CacheSourceIdentity;
    readonly caller?: CallerProvider;
    readonly reason?: string;
}
export interface QueryResourceOptions<T> {
    readonly key: QueryKey;
    readonly source: CacheSourceIdentity;
    readonly caller: CallerProvider;
    readonly load: QueryLoader<T>;
    readonly clock?: Clock;
    readonly diagnostics?: HolmDiagnosticsSink;
    readonly id?: string;
    readonly copy?: ResourceValueCopier<T>;
}
export interface QueryResource<T, E extends HolmError = HolmError> extends Resource<T, E> {
    refresh(options?: QueryRefreshOptions): Promise<ResourceSnapshot<T, E>>;
    currentLoad(): Promise<ResourceSnapshot<T, E>>;
    markStale(): ResourceSnapshot<T, E>;
    reset(options?: QueryResetOptions): ResourceSnapshot<T, E>;
    dispose(): void;
}
export declare function createQueryResource<T, E extends HolmError = HolmError>(options: QueryResourceOptions<T>): QueryResource<T, E>;
//# sourceMappingURL=query.d.ts.map