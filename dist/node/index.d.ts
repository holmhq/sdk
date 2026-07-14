export { createNodeUploadFile } from "./upload.js";
export type { NodeUploadFileOptions } from "./upload.js";
import type { TransportAuthProvider } from "../transports/index.js";
export interface NodeTokenAuthOptions {
    readonly token: string | (() => string);
    readonly scheme?: string;
}
export declare function createNodeTokenAuth(options: NodeTokenAuthOptions): TransportAuthProvider;
//# sourceMappingURL=index.d.ts.map