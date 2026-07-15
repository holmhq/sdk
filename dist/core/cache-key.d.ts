import type { SurfaceKind } from "./runtime.js";
export interface CacheSourceIdentity {
    readonly id: string;
    readonly surface?: SurfaceKind;
}
export interface CallerPartitionedCacheKeyInput {
    readonly source: CacheSourceIdentity;
    readonly callerFingerprint: string;
    readonly operation: unknown;
    readonly namespace?: string;
}
export declare function createCallerPartitionedCacheKey(input: CallerPartitionedCacheKeyInput): string;
export declare function createOpaqueCacheIdentity(value: unknown): string;
export declare function normalizeCacheSourceIdentity(source: CacheSourceIdentity): CacheSourceIdentity;
//# sourceMappingURL=cache-key.d.ts.map