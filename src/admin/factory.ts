import type { CallerPartitionListener, CallerProvider } from "../core/caller.js";
import type { HolmDiagnosticsSink } from "../core/diagnostics.js";
import { createHolm, type Holm } from "../core/create-holm.js";
import type { ExtensionNamespaces, HolmExtension } from "../core/extensions.js";
import type { RuntimeAdapter } from "../core/runtime.js";
import type { AdminApi } from "./client.js";
import {
  createAdminExtension,
  type AdminExtensionOptions,
} from "./extension.js";

export interface AdminClientOptions extends AdminExtensionOptions {
  readonly runtime: RuntimeAdapter;
  readonly caller: CallerProvider;
  readonly diagnostics?: HolmDiagnosticsSink;
  readonly onCallerPartition?: CallerPartitionListener;
}

type AdminClientExtension = HolmExtension<AdminApi, "admin">;
type AdminClientExtensions = readonly [AdminClientExtension];

export type AdminClient = Holm<AdminClientExtensions> & ExtensionNamespaces<AdminClientExtensions>;

export function createAdminClient(options: AdminClientOptions): AdminClient {
  const extension = createAdminExtension({
    ...(options.requestId === undefined ? {} : { requestId: options.requestId }),
    ...(options.uploads === undefined ? {} : { uploads: options.uploads }),
  });
  return createHolm({
    runtime: options.runtime,
    caller: options.caller,
    extensions: [extension] as const,
    ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
    ...(options.onCallerPartition === undefined ? {} : { onCallerPartition: options.onCallerPartition }),
  });
}
