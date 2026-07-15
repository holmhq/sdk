import type { HolmDiagnosticsSink } from "./diagnostics.js";
import type { Clock, OperationResponse } from "./runtime.js";
export type InvocationResponseOutcome = "accepted" | "duplicate" | "late";
export interface InvocationResponseHandle {
    readonly requestId: string;
    accept(response: OperationResponse): InvocationResponseOutcome;
    cancel(): void;
    fail(): void;
}
export interface InvocationResponseTracker {
    begin(requestId: string): InvocationResponseHandle;
    clear(): void;
}
export interface InvocationResponseTrackerOptions {
    readonly clock: Clock;
    readonly diagnostics?: HolmDiagnosticsSink;
    readonly maxTerminalRequests?: number;
}
export declare function createInvocationResponseTracker(options: InvocationResponseTrackerOptions): InvocationResponseTracker;
export declare function normalizeInvocationRequestId(requestId: string): string;
//# sourceMappingURL=correlation.d.ts.map