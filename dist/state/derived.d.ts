import { HolmError, type HolmDiagnosticsSink } from "../core/index.js";
import type { Clock } from "../core/runtime.js";
import { type Resource, type ResourceSnapshot, type ResourceValueCopier } from "./resource.js";
type DependencySnapshots<TDependencies extends readonly Resource<unknown, HolmError>[]> = {
    readonly [Index in keyof TDependencies]: TDependencies[Index] extends Resource<infer TData, infer TError> ? ResourceSnapshot<TData, TError> : never;
};
export type DerivedResourceCompute<TData, TDependencies extends readonly Resource<unknown, HolmError>[]> = (snapshots: DependencySnapshots<TDependencies>) => TData;
export interface DerivedResourceOptions<TData, TDependencies extends readonly Resource<unknown, HolmError>[]> {
    readonly dependencies: TDependencies;
    readonly derive: DerivedResourceCompute<TData, TDependencies>;
    readonly clock?: Clock;
    readonly diagnostics?: HolmDiagnosticsSink;
    readonly id?: string;
    readonly copy?: ResourceValueCopier<TData>;
}
export interface DerivedResource<TData, E extends HolmError = HolmError> extends Resource<TData, E> {
    refresh(): ResourceSnapshot<TData, E>;
    dispose(): void;
}
export declare function createDerivedResource<TData, const TDependencies extends readonly Resource<unknown, HolmError>[], E extends HolmError = HolmError>(options: DerivedResourceOptions<TData, TDependencies>): DerivedResource<TData, E>;
export {};
//# sourceMappingURL=derived.d.ts.map