import type { WireValue } from "../core/wire-value.js";
import type { TransportParams } from "../transports/index.js";
import type { AppHttpClient } from "./http.js";
import { type AppLinkImportRequest, type AppUpload } from "./upload.js";
export interface AppLinksApi {
    list<Result = WireValue>(appId: string, filters?: TransportParams): Promise<Result>;
    get<Result = WireValue>(appId: string, idOrSlug: string): Promise<Result>;
    create<Result = WireValue>(appId: string, data: unknown): Promise<Result>;
    update<Result = WireValue>(appId: string, idOrSlug: string, data: unknown): Promise<Result>;
    delete<Result = WireValue>(appId: string, idOrSlug: string): Promise<Result>;
    import<Result = WireValue>(appId: string, request: AppLinkImportRequest): Promise<Result>;
}
export declare function createAppLinksApi(http: AppHttpClient, upload: AppUpload): AppLinksApi;
//# sourceMappingURL=links.d.ts.map