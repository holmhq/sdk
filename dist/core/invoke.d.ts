import { type CapabilityRequirement, type CapabilityView } from "./capabilities.js";
import { type CallerPartitionListener, type CallerProvider } from "./caller.js";
import { type InvocationResponseTracker } from "./correlation.js";
import type { InvocationControl, OperationResponse, RuntimeAdapter } from "./runtime.js";
export { createInvocationResponseTracker } from "./correlation.js";
export type { InvocationResponseHandle, InvocationResponseOutcome, InvocationResponseTracker, InvocationResponseTrackerOptions, } from "./correlation.js";
export interface InvokeRuntimeOptions {
    readonly runtime: RuntimeAdapter;
    readonly capabilities: CapabilityView;
    readonly caller: CallerProvider;
    readonly capability: CapabilityRequirement;
    readonly operation: string;
    readonly payload: unknown;
    readonly requestId: string;
    readonly reason?: string;
    readonly control?: InvocationControl;
    readonly onCallerPartition?: CallerPartitionListener;
}
export declare function invokeRuntime(options: InvokeRuntimeOptions, responses?: InvocationResponseTracker): Promise<OperationResponse>;
//# sourceMappingURL=invoke.d.ts.map