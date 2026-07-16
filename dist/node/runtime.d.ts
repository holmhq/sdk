import type { HolmDiagnosticsSink } from "../core/diagnostics.js";
import type { Clock, RuntimeAdapter, Scheduler } from "../core/runtime.js";
import { type TransportAuthProvider, type TransportHeaders } from "../transports/index.js";
import { type NodeEnvironmentService, type NodeRuntimeServices, type NodeSecureStoreService } from "./services.js";
export { APP_HTTP_INVALIDATE_OPERATION, APP_HTTP_REQUEST_OPERATION, HOLM_APP_HTTP_CAPABILITY, } from "../app/protocol.js";
export declare const NODE_HTTP_REQUEST_OPERATION = "request";
export interface NodeRuntimeAbortSignal {
    readonly aborted: boolean;
    readonly reason?: unknown;
    readonly onabort?: unknown;
    throwIfAborted?(): void;
    addEventListener?(type: string, listener: unknown, options?: unknown): void;
    removeEventListener?(type: string, listener: unknown, options?: unknown): void;
    dispatchEvent?(event: unknown): boolean;
}
export interface NodeRuntimeFetchInit {
    readonly method: string;
    readonly headers: TransportHeaders;
    readonly body?: string | Uint8Array;
    readonly signal?: NodeRuntimeAbortSignal;
}
export interface NodeRuntimeFetchHeaders {
    forEach?(callback: (value: string, key: string) => void): void;
    entries?(): IterableIterator<readonly [string, string]>;
}
export interface NodeRuntimeFetchResponse {
    readonly status: number;
    readonly url?: string;
    readonly headers?: NodeRuntimeFetchHeaders | Iterable<readonly [string, string]>;
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
}
export type NodeRuntimeFetch = (input: string, init?: NodeRuntimeFetchInit) => Promise<NodeRuntimeFetchResponse>;
export interface NodeRuntimeCacheOptions {
    readonly ttlMs?: number;
    readonly swrMs?: number;
    readonly maxEntries?: number;
}
export interface NodeRuntimeOptions {
    readonly id?: string;
    readonly baseUrl?: string;
    readonly fetch?: NodeRuntimeFetch;
    readonly auth?: TransportAuthProvider;
    readonly clock?: Clock;
    readonly scheduler?: Scheduler;
    readonly cache?: false | NodeRuntimeCacheOptions;
    readonly diagnostics?: HolmDiagnosticsSink;
    readonly environment?: NodeEnvironmentService;
    readonly secureStore?: NodeSecureStoreService;
}
export interface NodeRuntimeAdapter extends RuntimeAdapter {
    readonly surface: "cli";
    readonly services: NodeRuntimeServices;
}
export declare function nodeRuntime(options?: NodeRuntimeOptions): NodeRuntimeAdapter;
//# sourceMappingURL=runtime.d.ts.map