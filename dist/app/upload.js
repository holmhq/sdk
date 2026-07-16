import { UnsupportedCapabilityError } from "../core/capabilities.js";
export function createAppUpload(service) {
    return async function upload(request) {
        if (service === undefined) {
            throw new UnsupportedCapabilityError({
                id: "sdk.app.upload",
                message: "App uploads require an explicit runtime upload service.",
            });
        }
        return await service.upload(request);
    };
}
export function withUploadPath(path, request) {
    return Object.freeze({
        ...request,
        path,
    });
}
//# sourceMappingURL=upload.js.map