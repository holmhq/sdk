import { type CacheSourceIdentity } from "../core/cache-key.js";
import type { HolmDiagnosticsSink } from "../core/diagnostics.js";
import { type SerializedHolmError } from "../core/errors.js";
import type { Clock, OperationResponse, Scheduler } from "../core/runtime.js";
import type { RedactedTransportDiagnostic, TransportRequest } from "./index.js";
export type TransportCacheMode = "default" | "reload" | "no-store";
export type TransportCacheInvalidationReason = "explicit" | "mutation";
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
    readonly tags?: readonly string[];
}
export interface TransportCacheInvalidationInput {
    readonly partition?: TransportCachePartition;
    readonly tags?: readonly string[];
    readonly prefixes?: readonly string[];
    readonly requests?: readonly TransportCacheKeyInput[];
}
export interface TransportCacheMutationInvalidation extends TransportCacheInvalidationInput {
}
export interface TransportCacheInvalidationResult {
    readonly removed: number;
    readonly keys: readonly string[];
}
export interface TransportCacheUpdateEvent {
    readonly key: string;
    readonly partition: TransportCachePartition;
    readonly request: RedactedTransportDiagnostic;
    readonly tags: readonly string[];
    readonly storedAt: number;
    readonly expiresAt: number;
    readonly staleUntil: number;
}
export interface TransportCacheInvalidationEvent extends TransportCacheInvalidationResult {
    readonly reason: TransportCacheInvalidationReason;
    readonly tags: readonly string[];
    readonly prefixes: readonly string[];
    readonly partition?: TransportCachePartition;
}
export interface TransportCacheBackgroundErrorEvent {
    readonly key: string;
    readonly partition: TransportCachePartition;
    readonly request: RedactedTransportDiagnostic;
    readonly tags: readonly string[];
    readonly error: SerializedHolmError;
}
export interface TransportCacheOptions {
    readonly clock: Clock;
    readonly scheduler: Scheduler;
    readonly maxEntries: number;
    readonly diagnostics?: HolmDiagnosticsSink;
    readonly onUpdate?: (event: TransportCacheUpdateEvent) => void;
    readonly onInvalidate?: (event: TransportCacheInvalidationEvent) => void;
    readonly onBackgroundError?: (event: TransportCacheBackgroundErrorEvent) => void;
}
export type TransportCacheLoader = () => OperationResponse | Promise<OperationResponse>;
export interface TransportCache {
    readonly size: number;
    getOrLoad(input: TransportCacheGetInput, loader: TransportCacheLoader): Promise<OperationResponse>;
    read(input: TransportCacheKeyInput): OperationResponse | undefined;
    delete(input: TransportCacheKeyInput): boolean;
    invalidate(input: TransportCacheInvalidationInput): TransportCacheInvalidationResult;
    invalidateForMutation(input: TransportCacheMutationInvalidation): TransportCacheInvalidationResult;
    clear(): void;
}
export declare function createTransportCache(options: TransportCacheOptions): TransportCache;
export declare function createTransportCacheKey(input: TransportCacheKeyInput): string;
//# sourceMappingURL=cache.d.ts.map