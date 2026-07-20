import type { ExtensionSetupContext, HolmExtension } from "../core/extensions.js";
import { createAdminApi, type AdminApi } from "./client.js";
import { createAdminHttpClient, type AdminRequestIdFactory } from "./http.js";
import { HOLM_ADMIN_HTTP_CAPABILITY } from "./protocol.js";
import type { AdminUploadService } from "./types.js";

export interface AdminExtensionOptions {
  readonly requestId?: AdminRequestIdFactory;
  readonly uploads?: AdminUploadService;
}

export function createAdminExtension(
  options: AdminExtensionOptions = {},
): HolmExtension<AdminApi, "admin"> {
  const requestId = options.requestId ?? defaultAdminRequestId;
  return Object.freeze({
    id: "sdk.admin",
    namespace: "admin",
    version: Object.freeze({ major: 1, minor: 0 }),
    requiresCapabilities: Object.freeze([HOLM_ADMIN_HTTP_CAPABILITY]),
    setup(context: ExtensionSetupContext) {
      const http = createAdminHttpClient(context, requestId);
      return { api: createAdminApi(http, options.uploads) };
    },
  });
}

function defaultAdminRequestId(sequence: number): string {
  return `admin-${sequence}`;
}
