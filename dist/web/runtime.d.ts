import type { Clock, RuntimeAdapter, Scheduler } from "../core/runtime.js";
import { type TransportAuthProvider } from "../transports/index.js";
export declare const HOLM_APP_HTTP_CAPABILITY: Readonly<{
    id: "holm.http.app";
    major: 1;
}>;
export declare const WEB_HTTP_REQUEST_OPERATION = "request";
export interface WebRuntimeOptions {
    readonly id?: string;
    readonly baseUrl?: string | URL;
    readonly fetch?: typeof fetch;
    readonly auth?: TransportAuthProvider;
    readonly clock?: Clock;
    readonly scheduler?: Scheduler;
}
export declare function webRuntime(options?: WebRuntimeOptions): RuntimeAdapter;
//# sourceMappingURL=runtime.d.ts.map