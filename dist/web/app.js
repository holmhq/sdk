import { createAppExtension, } from "../app/index.js";
import { createHolm, } from "../core/create-holm.js";
import { readWebAppSurfaceBootstrap } from "./bootstrap.js";
import { createWebCaller } from "./caller.js";
import { createWebNavigation } from "./navigation.js";
import { webRuntime } from "./runtime.js";
import { createWebUploadService } from "./upload-service.js";
const hasOwn = Object.prototype.hasOwnProperty;
export function createWebApp(options = {}) {
    const runtimeOptions = options.runtime ?? {};
    const runtime = webRuntime(runtimeOptions);
    const caller = resolveCaller(options.caller);
    const navigation = resolveNavigation(options.navigation);
    const uploads = resolveUploads(options.uploads, runtimeOptions);
    const surfaces = hasOwn.call(options, "surfaces")
        ? (options.surfaces ?? {})
        : readWebAppSurfaceBootstrap(options.surfaceBootstrap);
    const extension = createAppExtension({
        ...(options.requestId === undefined ? {} : { requestId: options.requestId }),
        ...(navigation === undefined ? {} : { navigation }),
        ...(uploads === undefined ? {} : { uploads }),
        surfaces,
    });
    return createHolm({
        runtime,
        caller,
        extensions: [extension],
        ...((options.diagnostics ?? runtimeOptions.diagnostics) === undefined
            ? {}
            : { diagnostics: options.diagnostics ?? runtimeOptions.diagnostics }),
    });
}
function resolveCaller(caller) {
    if (caller !== undefined && typeof caller.current === "function") {
        return caller;
    }
    return createWebCaller(caller);
}
function resolveNavigation(navigation) {
    if (navigation === false) {
        return undefined;
    }
    if (navigation !== undefined) {
        return navigation;
    }
    try {
        return createWebNavigation();
    }
    catch {
        return undefined;
    }
}
function resolveUploads(uploads, runtime) {
    if (uploads === false) {
        return undefined;
    }
    if (uploads !== undefined) {
        return uploads;
    }
    return createWebUploadService({
        ...(runtime.baseUrl === undefined ? {} : { baseUrl: runtime.baseUrl }),
        ...(runtime.fetch === undefined ? {} : { fetch: runtime.fetch }),
        ...(runtime.auth === undefined ? {} : { auth: runtime.auth }),
    });
}
//# sourceMappingURL=app.js.map