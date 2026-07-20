import type { ExtensionSetupContext } from "../core/extensions.js";
import type { InvocationControl, OperationResponse } from "../core/runtime.js";
import type { WireValue } from "../core/wire-value.js";
import { type TransportRequestInput } from "../transports/index.js";
export interface AdminHttpInvocationOptions {
    readonly control?: InvocationControl;
    readonly reason?: string;
}
export interface AdminHttpClient {
    request<Result = WireValue>(input: TransportRequestInput, options?: AdminHttpInvocationOptions): Promise<Result>;
    requestRaw(input: TransportRequestInput, options?: AdminHttpInvocationOptions): Promise<OperationResponse>;
    preflight(reason?: string): Promise<void>;
    invalidateCache(): Promise<void>;
}
export type AdminRequestIdFactory = (sequence: number) => string;
export declare function createAdminHttpClient(context: ExtensionSetupContext, requestIdFactory: AdminRequestIdFactory): AdminHttpClient;
//# sourceMappingURL=http.d.ts.map