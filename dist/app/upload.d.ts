import type { WireValue } from "../core/wire-value.js";
import type { UploadRequest } from "../transports/index.js";
export type AppUploadRequest = UploadRequest;
export type AppLinkImportRequest = Omit<AppUploadRequest, "path">;
export interface AppUploadService {
    upload(request: AppUploadRequest): WireValue | Promise<WireValue>;
}
export type AppUpload = <Result = WireValue>(request: AppUploadRequest) => Promise<Result>;
export declare function createAppUpload(service: AppUploadService | undefined, onSuccess?: () => void | Promise<void>): AppUpload;
export declare function withUploadPath(path: string, request: AppLinkImportRequest): AppUploadRequest;
//# sourceMappingURL=upload.d.ts.map