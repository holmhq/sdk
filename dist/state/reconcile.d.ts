import { type CapabilityRegistry, type HolmDiagnosticsSink } from "../core/index.js";
import type { HolmError } from "../core/errors.js";
import type { ResourceSnapshot } from "./resource.js";
import type { QueryResource } from "./query.js";
export declare const REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY: Readonly<{
    readonly id: "holm.realtime.public.subscribe";
    readonly major: 1;
    readonly minMinor: 0;
}>;
export type RealtimePublicSubscribeRequirement = typeof REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY;
export interface RealtimeHookSupports {
    readonly publicSubscribe: true;
    readonly privateChannels: false;
    readonly presence: false;
    readonly collaboration: false;
    readonly durableReplay: false;
}
export interface RealtimeInvalidateHint {
    readonly kind: "invalidate";
    readonly reason?: string;
    readonly refresh?: false;
}
export interface RealtimeInvalidateAndRefreshHint {
    readonly kind: "invalidate";
    readonly reason?: string;
    readonly refresh: true;
}
export interface RealtimeReconcileHint<TData> {
    readonly kind: "reconcile";
    readonly data: TData;
    readonly reason?: string;
}
export type RealtimeResourceHint<TData> = RealtimeInvalidateHint | RealtimeInvalidateAndRefreshHint | RealtimeReconcileHint<TData>;
export interface RealtimeReconcileHook<TData, E extends HolmError = HolmError> {
    readonly durable: false;
    readonly supports: RealtimeHookSupports;
    handle(hint: RealtimeInvalidateAndRefreshHint): Promise<ResourceSnapshot<TData, E>>;
    handle(hint: RealtimeInvalidateHint | RealtimeReconcileHint<TData>): ResourceSnapshot<TData, E>;
    dispose(): void;
}
export interface RealtimeReconcileHookOptions<TData, E extends HolmError = HolmError> {
    readonly query: QueryResource<TData, E>;
    readonly capabilities: CapabilityRegistry;
    readonly requirement?: RealtimePublicSubscribeRequirement;
    readonly diagnostics?: HolmDiagnosticsSink;
    readonly id?: string;
}
export declare function createRealtimeReconcileHook<TData, E extends HolmError = HolmError>(options: RealtimeReconcileHookOptions<TData, E>): RealtimeReconcileHook<TData, E>;
//# sourceMappingURL=reconcile.d.ts.map