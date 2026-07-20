import type { CallerPartitionListener, CallerProvider } from "../core/caller.js";
import type { HolmDiagnosticsSink } from "../core/diagnostics.js";
import { type Holm } from "../core/create-holm.js";
import type { ExtensionNamespaces, HolmExtension } from "../core/extensions.js";
import type { RuntimeAdapter } from "../core/runtime.js";
import type { AdminApi } from "./client.js";
import { type AdminExtensionOptions } from "./extension.js";
export interface AdminClientOptions extends AdminExtensionOptions {
    readonly runtime: RuntimeAdapter;
    readonly caller: CallerProvider;
    readonly diagnostics?: HolmDiagnosticsSink;
    readonly onCallerPartition?: CallerPartitionListener;
}
type AdminClientExtension = HolmExtension<AdminApi, "admin">;
type AdminClientExtensions = readonly [AdminClientExtension];
export type AdminClient = Holm<AdminClientExtensions> & ExtensionNamespaces<AdminClientExtensions>;
export declare function createAdminClient(options: AdminClientOptions): AdminClient;
export {};
//# sourceMappingURL=factory.d.ts.map