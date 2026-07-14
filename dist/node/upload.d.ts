import { type ReadonlyBytes } from "../core/index.js";
import { type UploadFile } from "../transports/upload.js";
export interface NodeUploadFileOptions {
    readonly field: string;
    readonly name: string;
    readonly bytes: ArrayLike<number> | Iterable<number> | ReadonlyBytes;
    readonly type?: string;
}
export declare function createNodeUploadFile(options: NodeUploadFileOptions): UploadFile<ReadonlyBytes>;
//# sourceMappingURL=upload.d.ts.map