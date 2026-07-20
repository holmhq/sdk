import { createAdminApi } from "./client.js";
import { createAdminHttpClient } from "./http.js";
import { HOLM_ADMIN_HTTP_CAPABILITY } from "./protocol.js";
export function createAdminExtension(options = {}) {
    const requestId = options.requestId ?? defaultAdminRequestId;
    return Object.freeze({
        id: "sdk.admin",
        namespace: "admin",
        version: Object.freeze({ major: 1, minor: 0 }),
        requiresCapabilities: Object.freeze([HOLM_ADMIN_HTTP_CAPABILITY]),
        setup(context) {
            const http = createAdminHttpClient(context, requestId);
            return { api: createAdminApi(http, options.uploads) };
        },
    });
}
function defaultAdminRequestId(sequence) {
    return `admin-${sequence}`;
}
//# sourceMappingURL=extension.js.map