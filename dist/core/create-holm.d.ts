import { type CapabilityRequirement, type CapabilityView } from "./capabilities.js";
import type { HolmDiagnosticsSink } from "./diagnostics.js";
import type { CallerPartitionListener, CallerProvider } from "./caller.js";
import { type ExtensionLifecycle, type ExtensionNamespaces, type HolmExtension } from "./extensions.js";
import { type LifecycleSnapshot } from "./lifecycle.js";
import type { InvocationControl, OperationResponse, RuntimeAdapter } from "./runtime.js";
export interface HolmOptions<Extensions extends readonly HolmExtension[] = readonly HolmExtension[]> {
    readonly runtime: RuntimeAdapter;
    readonly caller: CallerProvider;
    readonly extensions?: Extensions;
    readonly diagnostics?: HolmDiagnosticsSink;
    readonly onCallerPartition?: CallerPartitionListener;
}
export interface HolmInvokeOptions {
    readonly capability: CapabilityRequirement;
    readonly operation: string;
    readonly payload: unknown;
    readonly requestId: string;
    readonly reason?: string;
    readonly control?: InvocationControl;
}
export interface Holm<Extensions extends readonly HolmExtension[] = readonly HolmExtension[]> {
    readonly lifecycle: LifecycleSnapshot;
    readonly capabilities: CapabilityView;
    readonly extensions: ExtensionLifecycle<ExtensionNamespaces<Extensions>>;
    start(): Promise<void>;
    invoke(options: HolmInvokeOptions): Promise<OperationResponse>;
    dispose(): Promise<void>;
}
export declare function createHolm<const Extensions extends readonly HolmExtension[] = readonly []>(options: HolmOptions<Extensions>): Holm<Extensions> & ExtensionNamespaces<Extensions>;
//# sourceMappingURL=create-holm.d.ts.map