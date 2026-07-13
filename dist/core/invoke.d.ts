import { type CapabilityRegistry, type CapabilityRequirement } from "./capabilities.js";
import { type CallerPartitionListener, type CallerProvider } from "./caller.js";
import type { InvocationControl, OperationResponse, RuntimeAdapter } from "./runtime.js";
export interface InvokeRuntimeOptions {
    readonly runtime: RuntimeAdapter;
    readonly capabilities: CapabilityRegistry;
    readonly caller: CallerProvider;
    readonly capability: CapabilityRequirement;
    readonly operation: string;
    readonly payload: unknown;
    readonly requestId: string;
    readonly reason?: string;
    readonly control?: InvocationControl;
    readonly onCallerPartition?: CallerPartitionListener;
}
export declare function invokeRuntime(options: InvokeRuntimeOptions): Promise<OperationResponse>;
//# sourceMappingURL=invoke.d.ts.map