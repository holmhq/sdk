import { type CacheSourceIdentity } from "../core/cache-key.js";
import type { Clock, OperationResponse, Scheduler } from "../core/runtime.js";
import type { TransportRequest } from "./index.js";
export type TransportCacheMode = "default" | "reload" | "no-store";
export interface TransportCachePolicy {
    readonly ttlMs: number;
    readonly swrMs?: number;
    readonly mode?: TransportCacheMode;
}
export interface TransportCachePartition {
    readonly source: CacheSourceIdentity;
    readonly callerFingerprint: string;
}
export interface TransportCacheKeyInput {
    readonly partition: TransportCachePartition;
    readonly request: TransportRequest;
}
export interface TransportCacheGetInput extends TransportCacheKeyInput {
    readonly policy: TransportCachePolicy;
}
export interface TransportCacheBackgroundErrorEvent extends TransportCacheKeyInput {
    readonly key: string;
    readonly error: unknown;
}
export interface TransportCacheOptions {
    readonly clock: Clock;
    readonly scheduler: Scheduler;
    readonly maxEntries: number;
    readonly onBackgroundError?: (event: TransportCacheBackgroundErrorEvent) => void;
}
export type TransportCacheLoader = () => OperationResponse | Promise<OperationResponse>;
export interface TransportCache {
    readonly size: number;
    getOrLoad(input: TransportCacheGetInput, loader: TransportCacheLoader): Promise<OperationResponse>;
    read(input: TransportCacheKeyInput): OperationResponse | undefined;
    delete(input: TransportCacheKeyInput): boolean;
    clear(): void;
}
export declare function createTransportCache(options: TransportCacheOptions): TransportCache;
export declare function createTransportCacheKey(input: TransportCacheKeyInput): string;
//# sourceMappingURL=cache.d.ts.map