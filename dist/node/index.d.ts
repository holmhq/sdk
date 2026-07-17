/**
 * v0.1-web support label for the Node adapter subpath.
 *
 * `@holmhq/sdk/node` ships for tests and operator-oriented composition, but it
 * is preview/not frozen; higher-level CLI ergonomics and cross-Node-version
 * compatibility are intentionally outside the stable `0.1.x` surface.
 */
export declare const nodeRuntimeSupport: Readonly<{
    readonly packageName: "@holmhq/sdk/node";
    readonly status: "preview";
    readonly compatibility: "not frozen";
    readonly production: "not production";
}>;
export { createNodeUploadFile } from "./upload.js";
export type { NodeUploadFileOptions } from "./upload.js";
export { createNodeOperatorCaller, createNodeRuntimeServices, createNodeTokenAuth, UnsupportedNodeRuntimeServiceError, } from "./services.js";
export type { NodeEnvironmentService, NodeOperatorCallerOptions, NodeRuntimeServices, NodeSecureStoreService, NodeTokenAuthOptions, } from "./services.js";
export { APP_HTTP_INVALIDATE_OPERATION, APP_HTTP_REQUEST_OPERATION, HOLM_APP_HTTP_CAPABILITY, NODE_HTTP_REQUEST_OPERATION, nodeRuntime, } from "./runtime.js";
export type { NodeRuntimeAbortSignal, NodeRuntimeAdapter, NodeRuntimeCacheOptions, NodeRuntimeFetch, NodeRuntimeFetchHeaders, NodeRuntimeFetchInit, NodeRuntimeFetchResponse, NodeRuntimeOptions, } from "./runtime.js";
//# sourceMappingURL=index.d.ts.map