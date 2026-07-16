import type { ExtensionSetupContext } from "../core/extensions.js";
import type { InvocationControl, OperationResponse } from "../core/runtime.js";
import type { WireValue } from "../core/wire-value.js";
import { type TransportHeaders, type TransportParams, type TransportRequestInput, type TransportResponseMode, type TransportSensitivityInput } from "../transports/index.js";
export interface AppHttpInvocationOptions {
    readonly control?: InvocationControl;
    readonly reason?: string;
}
export interface AppHttpRequestOptions extends AppHttpInvocationOptions {
    readonly params?: TransportParams;
    readonly headers?: TransportHeaders;
    readonly responseMode?: TransportResponseMode;
    readonly timeoutMs?: number;
    readonly sensitive?: TransportSensitivityInput;
}
export interface AppHttpClient {
    request<Result = WireValue>(input: TransportRequestInput, options?: AppHttpInvocationOptions): Promise<Result>;
    requestRaw(input: TransportRequestInput, options?: AppHttpInvocationOptions): Promise<OperationResponse>;
    get<Result = WireValue>(url: string, options?: AppHttpRequestOptions): Promise<Result>;
    post<Result = WireValue>(url: string, body: unknown, options?: AppHttpRequestOptions): Promise<Result>;
    put<Result = WireValue>(url: string, body: unknown, options?: AppHttpRequestOptions): Promise<Result>;
    patch<Result = WireValue>(url: string, body: unknown, options?: AppHttpRequestOptions): Promise<Result>;
    delete<Result = WireValue>(url: string, options?: AppHttpRequestOptions): Promise<Result>;
    invalidateCache(): Promise<void>;
}
export type AppRequestIdFactory = (sequence: number) => string;
export declare function createAppHttpClient(context: ExtensionSetupContext, requestIdFactory: AppRequestIdFactory): AppHttpClient;
//# sourceMappingURL=http.d.ts.map