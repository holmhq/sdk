/**
 * Compatibility label for the first audited admin/operator migration.
 *
 * The implementation is fully gated and released, while the convenience API
 * remains preview so its standardized operation-input shape can evolve from
 * real operator-client feedback without weakening stable web contracts.
 */
export declare const adminSupport: Readonly<{
    readonly packageName: "@holmhq/sdk/admin";
    readonly status: "preview";
    readonly compatibility: "not frozen";
    readonly production: "operator authorization required";
}>;
export { ADMIN_HTTP_INVALIDATE_OPERATION, ADMIN_HTTP_PREFLIGHT_OPERATION, ADMIN_HTTP_REQUEST_OPERATION, HOLM_ADMIN_HTTP_CAPABILITY, } from "./protocol.js";
export { createAdminClient } from "./factory.js";
export type { AdminClient, AdminClientOptions } from "./factory.js";
export { createAdminExtension } from "./extension.js";
export { adminMethodDescriptors } from "./generated.js";
export { adminOperationProtocol } from "./types.js";
export type { AdminMethodName, AdminGeneratedApi } from "./generated.js";
export type { AdminApi } from "./client.js";
export type { AdminExtensionOptions } from "./extension.js";
export type { AdminAuthorityRoute, AdminCommandDescriptor, AdminMethodDescriptor, AdminMethodKind, AdminOperationInput, AdminOperationOptions, AdminPathValue, AdminPathValues, AdminRouteMethod, AdminUploadInput, AdminUploadService, AdminUrlHelper, } from "./types.js";
export type { AdminHttpClient, AdminHttpInvocationOptions, AdminRequestIdFactory, } from "./http.js";
//# sourceMappingURL=index.d.ts.map