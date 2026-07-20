import { type WireValue } from "../core/wire-value.js";
import { type AdminGeneratedApi, type AdminMethodName } from "./generated.js";
import type { AdminHttpClient } from "./http.js";
import type { AdminMethodDescriptor, AdminOperationOptions, AdminPathValues, AdminUploadService } from "./types.js";
export type AdminApi = AdminGeneratedApi & {
    readonly methodNames: readonly AdminMethodName[];
    describe(name: AdminMethodName): AdminMethodDescriptor;
    invoke<Result = WireValue>(name: AdminMethodName, input?: AdminOperationOptions<AdminPathValues>): Promise<Result> | string;
};
export declare function createAdminApi(http: AdminHttpClient, uploads?: AdminUploadService): AdminApi;
//# sourceMappingURL=client.d.ts.map