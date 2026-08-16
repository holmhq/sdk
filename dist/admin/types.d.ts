import type { InvocationControl } from "../core/runtime.js";
import type { WireValue } from "../core/wire-value.js";
import type { TransportHeaders, TransportParams, TransportResponseMode, TransportSensitivityInput, UploadRequest } from "../transports/index.js";
export declare const adminOperationProtocol: "holm.sdk.admin-operation/1";
export type AdminPathValue = string | number;
export type AdminPathValues = Readonly<Record<string, AdminPathValue>>;
export type AdminUploadInput = Omit<UploadRequest, "path">;
/** Exact Holm `DBRetentionFamilyStatusReport` JSON contract at v0.207.0. */
export interface AdminDBRetentionFamilyStatusReport {
    readonly family: string;
    readonly last_status: string;
    readonly last_run_ms: number;
    readonly updated_at: number;
}
/** Read-only governed retention status returned to an authenticated operator. */
export interface AdminDBRetentionStatus {
    readonly automatic: boolean;
    readonly last_status: string;
    readonly backup_marker: string;
    readonly families: readonly AdminDBRetentionFamilyStatusReport[];
}
/** Bounded upload-orphan evidence emitted by a retention dry-run. */
export interface AdminDBRetentionCandidate {
    readonly upload_id?: string;
    readonly reason: string;
    readonly size_bytes: number;
    readonly age_ms: number;
}
/** Exact Holm `DBRetentionFamilyReport` JSON contract at v0.207.0. */
export interface AdminDBRetentionFamilyReport {
    readonly family: string;
    readonly rows: number;
    readonly bytes: number;
    readonly cutoff_ms: number;
    readonly oldest_age_ms: number;
    readonly bytes_source?: string;
    readonly table_bytes?: number;
    readonly index_bytes?: number;
    readonly deleted?: number;
    readonly candidates?: readonly AdminDBRetentionCandidate[];
}
/**
 * Remote retention result. The authenticated HTTP operation is permanently
 * narrowed to dry-run behavior even though Holm's internal report also serves
 * local apply workflows.
 */
export interface AdminDBRetentionReport {
    readonly dry_run: true;
    readonly applied: false;
    readonly rows: number;
    readonly bytes: number;
    readonly deleted: number;
    readonly rewritten: number;
    readonly has_more: boolean;
    readonly backup_marker?: string;
    readonly families: readonly AdminDBRetentionFamilyReport[];
}
export interface AdminOperationOptions<Path extends AdminPathValues = Record<never, AdminPathValue>> {
    /** Values substituted into audited `{parameter}` and `{path...}` route templates. */
    readonly path?: Path;
    /** Selects one authority route when a compatibility method maps to multiple routes. */
    readonly route?: string;
    readonly params?: TransportParams;
    readonly headers?: TransportHeaders;
    readonly body?: WireValue;
    /** Arguments appended after a generated `/api/cmd` namespace/operation prefix. */
    readonly args?: readonly string[];
    /** Required only by the raw `system.cmd` method. */
    readonly command?: string;
    readonly responseMode?: TransportResponseMode;
    readonly timeoutMs?: number;
    readonly sensitive?: TransportSensitivityInput;
    readonly upload?: AdminUploadInput;
    readonly control?: InvocationControl;
    readonly reason?: string;
}
/** Request controls allowed by the bodyless remote retention operations. */
export type AdminDBRetentionOperationOptions = Pick<AdminOperationOptions<Record<never, AdminPathValue>>, "headers" | "timeoutMs" | "sensitive" | "control" | "reason">;
export type AdminOperationInput<Path extends AdminPathValues, RequiresPath extends boolean> = RequiresPath extends true ? Omit<AdminOperationOptions<Path>, "path"> & {
    readonly path: Path;
} : AdminOperationOptions<Path>;
export type AdminMethodArguments<Path extends AdminPathValues, RequiresPath extends boolean, RequiresInput extends boolean> = RequiresInput extends true ? readonly [input: AdminOperationInput<Path, RequiresPath>] : readonly [input?: AdminOperationInput<Path, RequiresPath>];
export type AdminRouteMethod<Name extends string, Path extends AdminPathValues = Record<never, AdminPathValue>, RequiresPath extends boolean = false, RequiresInput extends boolean = RequiresPath> = Name extends string ? <Result = WireValue>(...args: AdminMethodArguments<Path, RequiresPath, RequiresInput>) => Promise<Result> : never;
export type AdminDBRetentionStatusMethod = (input?: AdminDBRetentionOperationOptions) => Promise<AdminDBRetentionStatus>;
export type AdminDBRetentionRunMethod = (input?: AdminDBRetentionOperationOptions) => Promise<AdminDBRetentionReport>;
export type AdminUrlHelper<Name extends string, Path extends AdminPathValues = Record<never, AdminPathValue>, RequiresPath extends boolean = false, RequiresInput extends boolean = RequiresPath> = Name extends string ? (...args: AdminMethodArguments<Path, RequiresPath, RequiresInput>) => string : never;
export interface AdminAuthorityRoute {
    readonly method: string;
    readonly path: string;
    readonly sourceKey: string;
}
export type AdminMethodKind = "request" | "url" | "upload" | "composite-upload";
export interface AdminCommandDescriptor {
    readonly name: string;
    readonly prefix: readonly string[];
}
export interface AdminMethodDescriptor {
    readonly name: string;
    readonly kind: AdminMethodKind;
    readonly routes: readonly AdminAuthorityRoute[];
    readonly command?: AdminCommandDescriptor;
    readonly responseMode?: TransportResponseMode;
    readonly requestBody?: "forbidden";
}
export interface AdminUploadService {
    upload(request: UploadRequest): WireValue | Promise<WireValue>;
}
//# sourceMappingURL=types.d.ts.map