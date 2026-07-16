import type { AppUploadService } from "../app/upload.js";
import { type WireValue } from "../core/wire-value.js";
import { type TransportAuthProvider, type UploadRequest } from "../transports/index.js";
export declare const WEB_UPLOAD_PROGRESS_MODE = "acknowledged-resumable+coarse-multipart-fallback";
export interface WebUploadServiceOptions {
    readonly baseUrl?: string | URL;
    readonly fetch?: typeof fetch;
    readonly auth?: TransportAuthProvider;
}
export interface WebUploadService extends AppUploadService {
    readonly progressMode: typeof WEB_UPLOAD_PROGRESS_MODE;
    upload(request: UploadRequest): Promise<WireValue>;
}
export declare function createWebUploadService(options?: WebUploadServiceOptions): WebUploadService;
//# sourceMappingURL=upload-service.d.ts.map