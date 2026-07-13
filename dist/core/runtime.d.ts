import type { CapabilityRequirement } from "./capabilities.js";
import type { InvocationContext } from "./caller.js";
import type { WireValue } from "./wire-value.js";
export declare const runtimeEnvelopeProtocol = "holm.sdk.runtime/1";
export type SurfaceKind = "web" | "cli" | "server" | "desktop" | "mobile" | "test";
export interface Clock {
    now(): number;
}
export interface CancellationSignal {
    readonly cancelled: boolean;
    readonly reason?: string;
    onCancel(listener: () => void): () => void;
}
export interface InvocationControl {
    readonly cancellation?: CancellationSignal;
    readonly timeoutMs?: number;
}
export interface OperationRequest {
    readonly requestId: string;
    readonly capability: CapabilityRequirement;
    readonly operation: string;
    readonly caller: InvocationContext;
    readonly callerFingerprint: string;
    readonly payload: WireValue;
}
export interface OperationResponse {
    readonly requestId: string;
    readonly payload: WireValue;
    readonly metadata?: WireValue;
}
export interface RuntimeAdapter {
    readonly id: string;
    readonly surface: SurfaceKind;
    readonly clock: Clock;
    invoke(request: OperationRequest, control: InvocationControl): Promise<OperationResponse>;
}
//# sourceMappingURL=runtime.d.ts.map