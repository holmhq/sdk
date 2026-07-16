import type { HolmExtension } from "../core/extensions.js";
import { type AppAuthApi, type AppNavigationService } from "./auth.js";
import { type AppHttpClient, type AppRequestIdFactory } from "./http.js";
import { type AppLinksApi } from "./links.js";
import { type AppPaginate } from "./pagination.js";
import { type AppSurfaceApi, type AppSurfaceBootstrap } from "./surface.js";
import { type AppUpload, type AppUploadService } from "./upload.js";
export interface AppApi {
    readonly http: AppHttpClient;
    readonly auth: AppAuthApi;
    readonly links: AppLinksApi;
    readonly surface: AppSurfaceApi;
    readonly paginate: AppPaginate;
    readonly upload: AppUpload;
}
export interface AppExtensionOptions {
    readonly requestId?: AppRequestIdFactory;
    readonly navigation?: AppNavigationService;
    readonly surfaces?: AppSurfaceBootstrap;
    readonly uploads?: AppUploadService;
}
export declare function createAppExtension(options?: AppExtensionOptions): HolmExtension<AppApi, "app">;
//# sourceMappingURL=extension.d.ts.map