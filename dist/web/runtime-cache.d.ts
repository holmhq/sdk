import type { HolmDiagnosticsSink } from "../core/diagnostics.js";
import type { CancellationSignal, Clock, OperationResponse, Scheduler } from "../core/runtime.js";
import { type TransportCache, type TransportCachePolicy } from "../transports/index.js";
export interface WebRuntimeCacheOptions {
    readonly ttlMs?: number;
    readonly swrMs?: number;
    readonly maxEntries?: number;
}
export interface WebRuntimeCacheState {
    readonly instance: TransportCache;
    readonly policy: TransportCachePolicy;
}
export declare function createWebRuntimeCache(options: false | WebRuntimeCacheOptions | undefined, clock: Clock, scheduler: Scheduler, diagnostics: HolmDiagnosticsSink | undefined): WebRuntimeCacheState | undefined;
export declare function waitForWebResponse(response: Promise<OperationResponse>, cancellation: CancellationSignal | undefined): Promise<OperationResponse>;
export declare function rebindResponseRequestId(response: OperationResponse, requestId: string): OperationResponse;
//# sourceMappingURL=runtime-cache.d.ts.map