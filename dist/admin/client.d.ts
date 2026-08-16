import { type WireValue } from "../core/wire-value.js";
import { type AdminGeneratedApi, type AdminMethodName } from "./generated.js";
import type { AdminHttpClient } from "./http.js";
import type { AdminDBRetentionOperationOptions, AdminDBRetentionReport, AdminDBRetentionStatus, AdminMethodDescriptor, AdminOperationOptions, AdminPathValues, AdminUploadService } from "./types.js";
type AdminDBRetentionMethodName = "system.dbRetentionStatus" | "system.dbRetentionRun";
type AdminInvokeInput<Name extends AdminMethodName> = [
    Name
] extends [AdminDBRetentionMethodName] ? AdminDBRetentionOperationOptions : AdminOperationOptions<AdminPathValues>;
type AdminInvokeResult<Name extends AdminMethodName, Result> = [
    Name
] extends ["system.dbRetentionStatus"] ? Promise<AdminDBRetentionStatus> : [Name] extends ["system.dbRetentionRun"] ? Promise<AdminDBRetentionReport> : Promise<Result> | string;
export type AdminApi = AdminGeneratedApi & {
    readonly methodNames: readonly AdminMethodName[];
    describe(name: AdminMethodName): AdminMethodDescriptor;
    invoke<Result = WireValue, Name extends AdminMethodName = AdminMethodName>(name: Name, input?: AdminInvokeInput<Name>): AdminInvokeResult<Name, Result>;
};
export declare function createAdminApi(http: AdminHttpClient, uploads?: AdminUploadService): AdminApi;
export {};
//# sourceMappingURL=client.d.ts.map