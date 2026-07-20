import type { HolmExtension } from "../core/extensions.js";
import { type AdminApi } from "./client.js";
import { type AdminRequestIdFactory } from "./http.js";
import type { AdminUploadService } from "./types.js";
export interface AdminExtensionOptions {
    readonly requestId?: AdminRequestIdFactory;
    readonly uploads?: AdminUploadService;
}
export declare function createAdminExtension(options?: AdminExtensionOptions): HolmExtension<AdminApi, "admin">;
//# sourceMappingURL=extension.d.ts.map