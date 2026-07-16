import type { HolmDiagnosticsSink } from "../core/diagnostics.js";
import type { Clock, RuntimeAdapter, Scheduler } from "../core/runtime.js";
import { type TransportAuthProvider } from "../transports/index.js";
import { type WebRuntimeCacheOptions } from "./runtime-cache.js";
export type { WebRuntimeCacheOptions } from "./runtime-cache.js";
export { APP_HTTP_INVALIDATE_OPERATION, APP_HTTP_REQUEST_OPERATION, HOLM_APP_HTTP_CAPABILITY, } from "../app/protocol.js";
export declare const WEB_HTTP_REQUEST_OPERATION = "request";
export interface WebRuntimeOptions {
    readonly id?: string;
    readonly baseUrl?: string | URL;
    readonly fetch?: typeof fetch;
    readonly auth?: TransportAuthProvider;
    readonly clock?: Clock;
    readonly scheduler?: Scheduler;
    readonly cache?: false | WebRuntimeCacheOptions;
    readonly diagnostics?: HolmDiagnosticsSink;
}
export declare function webRuntime(options?: WebRuntimeOptions): RuntimeAdapter;
//# sourceMappingURL=runtime.d.ts.map