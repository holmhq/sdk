/**
 * v0.1-web support label for the Sobek adapter subpath.
 *
 * `@holmhq/sdk/sobek` ships for tests and bounded injected-runtime use, but it
 * is preview/not frozen; production host APIs and generated CLI projection stay
 * Holm-owned or future work.
 */
export const sobekRuntimeSupport = Object.freeze({
    packageName: "@holmhq/sdk/sobek",
    status: "preview",
    compatibility: "not frozen",
    production: "not production",
});
export { APP_HTTP_INVALIDATE_OPERATION, APP_HTTP_REQUEST_OPERATION, HOLM_APP_HTTP_CAPABILITY, SOBEK_HTTP_REQUEST_OPERATION, UnsupportedSobekRuntimeServiceError, createFakeSobekInjectedRuntime, sobekRuntime, } from "./runtime.js";
//# sourceMappingURL=index.js.map