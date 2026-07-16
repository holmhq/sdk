import { createAppAuthApi, } from "./auth.js";
import { createAppHttpClient, } from "./http.js";
import { createAppLinksApi } from "./links.js";
import { createAppPaginate } from "./pagination.js";
import { HOLM_APP_HTTP_CAPABILITY } from "./protocol.js";
import { createAppSurfaceApi, } from "./surface.js";
import { createAppUpload, } from "./upload.js";
export function createAppExtension(options = {}) {
    const requestId = options.requestId ?? defaultAppRequestId;
    return Object.freeze({
        id: "sdk.app",
        namespace: "app",
        version: Object.freeze({ major: 1, minor: 0 }),
        requiresCapabilities: Object.freeze([HOLM_APP_HTTP_CAPABILITY]),
        setup(context) {
            const http = createAppHttpClient(context, requestId);
            const auth = createAppAuthApi(http, options.navigation);
            const upload = createAppUpload(options.uploads, () => http.invalidateCache());
            const links = createAppLinksApi(http, upload);
            const surface = createAppSurfaceApi(options.surfaces);
            const paginate = createAppPaginate(http);
            return {
                api: Object.freeze({ http, auth, links, surface, paginate, upload }),
            };
        },
    });
}
function defaultAppRequestId(sequence) {
    return `app-${sequence}`;
}
//# sourceMappingURL=extension.js.map