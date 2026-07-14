import { type UploadChunkBody, type UploadFile, type UploadSource } from "../transports/upload.js";
export interface WebUploadBlobPartLike {
    readonly size: number;
    readonly type?: string;
}
export interface WebUploadBlobLike extends WebUploadBlobPartLike {
    slice(start: number, end: number, contentType?: string): WebUploadBlobPartLike;
}
export interface WebUploadChunkBody extends UploadChunkBody {
    readonly byteLength: number;
    readonly size: number;
    readonly type: string;
    readonly blob: WebUploadBlobPartLike;
}
export interface WebUploadFileOptions {
    readonly field: string;
    readonly blob: WebUploadBlobLike;
    readonly name?: string;
    readonly type?: string;
}
export declare function createWebUploadFile(options: WebUploadFileOptions): UploadFile<WebUploadChunkBody>;
export declare function createWebUploadSource(blob: WebUploadBlobLike, contentType?: string): UploadSource<WebUploadChunkBody>;
//# sourceMappingURL=upload.d.ts.map