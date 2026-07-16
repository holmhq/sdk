import { UnsupportedCapabilityError } from "../core/capabilities.js";
export function createAppUpload(service, onSuccess) {
    return async function upload(request) {
        if (service === undefined) {
            throw new UnsupportedCapabilityError({
                id: "sdk.app.upload",
                message: "App uploads require an explicit runtime upload service.",
            });
        }
        const result = await service.upload(request);
        await onSuccess?.();
        return result;
    };
}
export function withUploadPath(path, request) {
    return Object.freeze({
        ...request,
        path,
    });
}
//# sourceMappingURL=upload.js.map