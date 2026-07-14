export { createWebUploadFile, createWebUploadSource, } from "./upload.js";
export type { WebUploadBlobLike, WebUploadBlobPartLike, WebUploadChunkBody, WebUploadFileOptions, } from "./upload.js";
import type { TransportAuthProvider } from "../transports/index.js";
export type WebSessionCredentials = "same-origin" | "include" | "omit";
export interface WebSessionAuthOptions {
    readonly credentials?: WebSessionCredentials;
}
export declare function createWebSessionAuth(options?: WebSessionAuthOptions): TransportAuthProvider;
//# sourceMappingURL=index.d.ts.map