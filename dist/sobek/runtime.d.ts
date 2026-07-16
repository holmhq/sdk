import { type InvocationContext } from "../core/caller.js";
import { HolmError } from "../core/errors.js";
import type { Clock, InvocationControl, RuntimeAdapter, Scheduler } from "../core/runtime.js";
import { type WireObject, type WireValue } from "../core/wire-value.js";
export { APP_HTTP_INVALIDATE_OPERATION, APP_HTTP_REQUEST_OPERATION, HOLM_APP_HTTP_CAPABILITY, } from "../app/protocol.js";
export declare const SOBEK_HTTP_REQUEST_OPERATION = "request";
export type SobekRequestMethod = "GET" | "POST";
export type SobekHeaders = {
    readonly [name: string]: readonly string[];
};
export interface SobekInjectedRequest {
    readonly requestId: string;
    readonly method: SobekRequestMethod;
    readonly path: string;
    readonly params?: WireObject;
    readonly query: WireObject;
    readonly headers: SobekHeaders;
    readonly body?: WireValue;
    readonly files?: WireValue;
    readonly caller: InvocationContext;
    readonly idempotencyKey?: string;
    readonly approval?: WireValue;
}
export interface SobekStableError {
    readonly code: string;
    readonly message: string;
    readonly details?: WireValue;
    readonly retryable?: boolean;
}
export interface SobekInjectedResponse {
    readonly status?: number;
    readonly headers?: SobekHeaders;
    readonly body?: WireValue;
    readonly error?: SobekStableError;
}
export type SobekInjectedRuntimeHandler = (request: SobekInjectedRequest, control: InvocationControl) => SobekInjectedResponse | Promise<SobekInjectedResponse>;
export interface SobekInjectedRuntime {
    invoke(request: SobekInjectedRequest, control: InvocationControl): SobekInjectedResponse | Promise<SobekInjectedResponse>;
}
export type SobekRuntimeServiceName = "runtime" | "clock" | "scheduler";
export interface SobekRuntimeServiceErrorOptions {
    readonly adapter: string;
    readonly service: SobekRuntimeServiceName;
    readonly message?: string;
}
export declare class UnsupportedSobekRuntimeServiceError extends HolmError {
    constructor(options: SobekRuntimeServiceErrorOptions);
}
export interface SobekRuntimeOptions {
    readonly id?: string;
    readonly runtime?: SobekInjectedRuntime;
    readonly clock?: Clock;
    readonly scheduler?: Scheduler;
}
export interface SobekRuntimeAdapter extends RuntimeAdapter {
    readonly surface: "server";
}
export interface FakeSobekInvocation {
    readonly request: SobekInjectedRequest;
    readonly control: InvocationControl;
}
export interface FakeSobekInjectedRuntime extends SobekInjectedRuntime {
    readonly invocations: readonly FakeSobekInvocation[];
    setHandler(handler: SobekInjectedRuntimeHandler): void;
}
export interface FakeSobekInjectedRuntimeOptions {
    readonly handler?: SobekInjectedRuntimeHandler;
}
export declare function sobekRuntime(options?: SobekRuntimeOptions): SobekRuntimeAdapter;
export declare function createFakeSobekInjectedRuntime(options?: FakeSobekInjectedRuntimeOptions): FakeSobekInjectedRuntime;
//# sourceMappingURL=runtime.d.ts.map