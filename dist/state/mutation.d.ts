import { HolmError, type CacheSourceIdentity, type CallerContext, type CallerProvider, type CancellationSignal, type HolmDiagnosticsSink } from "../core/index.js";
import type { ReadonlyDeep } from "../core/extensions.js";
import type { Clock } from "../core/runtime.js";
import { type Resource, type ResourceSnapshot, type ResourceValueCopier } from "./resource.js";
export interface MutationInvalidation {
    readonly tags?: readonly string[];
    readonly prefixes?: readonly string[];
}
export interface MutationExecuteOptions {
    readonly cancellation?: CancellationSignal;
    readonly reason?: string;
}
export interface MutationExecuteContext<TPayload> {
    readonly payload: ReadonlyDeep<TPayload>;
    readonly source: CacheSourceIdentity;
    readonly caller: CallerContext;
    readonly callerFingerprint: string;
    readonly cancellation: CancellationSignal;
    readonly reason?: string;
}
export type MutationExecutor<TPayload, TResult> = (payload: ReadonlyDeep<TPayload>, context: MutationExecuteContext<TPayload>) => TResult | Promise<TResult>;
export type MutationOptimisticUpdate<TPayload, TResult> = (payload: ReadonlyDeep<TPayload>, context: MutationExecuteContext<TPayload>) => TResult | undefined;
export type MutationInvalidationDeclaration<TPayload, TResult> = readonly MutationInvalidation[] | ((result: ReadonlyDeep<TResult>, payload: ReadonlyDeep<TPayload>, context: MutationExecuteContext<TPayload>) => readonly MutationInvalidation[]);
export interface MutationInvalidationEvent<TPayload, TResult> {
    readonly source: CacheSourceIdentity;
    readonly caller: CallerContext;
    readonly callerFingerprint: string;
    readonly payload: ReadonlyDeep<TPayload>;
    readonly result: ReadonlyDeep<TResult>;
    readonly invalidations: readonly MutationInvalidation[];
    readonly reason?: string;
}
export type MutationInvalidationHook<TPayload, TResult> = (event: MutationInvalidationEvent<TPayload, TResult>) => void | PromiseLike<void>;
export type MutationErrorNormalizer<TPayload, E extends HolmError> = (error: unknown, context: MutationExecuteContext<TPayload>) => E;
export interface MutationResourceOptions<TPayload, TResult, E extends HolmError = HolmError> {
    readonly source: CacheSourceIdentity;
    readonly caller: CallerProvider;
    readonly execute: MutationExecutor<TPayload, TResult>;
    readonly optimistic?: MutationOptimisticUpdate<TPayload, TResult>;
    readonly invalidates?: MutationInvalidationDeclaration<TPayload, TResult>;
    readonly onInvalidate?: MutationInvalidationHook<TPayload, TResult>;
    readonly normalizeError?: MutationErrorNormalizer<TPayload, E>;
    readonly clock?: Clock;
    readonly diagnostics?: HolmDiagnosticsSink;
    readonly id?: string;
    readonly copy?: ResourceValueCopier<TResult>;
}
export interface MutationResource<TPayload, TResult, E extends HolmError = HolmError> extends Resource<TResult, E> {
    execute(payload: TPayload, options?: MutationExecuteOptions): Promise<ResourceSnapshot<TResult, E>>;
    currentExecution(): Promise<ResourceSnapshot<TResult, E>>;
    reset(): ResourceSnapshot<TResult, E>;
    dispose(): void;
}
export declare function createMutationResource<TPayload, TResult, E extends HolmError = HolmError>(options: MutationResourceOptions<TPayload, TResult, E>): MutationResource<TPayload, TResult, E>;
//# sourceMappingURL=mutation.d.ts.map