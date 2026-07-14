import {} from "../core/index.js";
import { createReadonlyBytesUploadSource, createUploadFile, } from "../transports/upload.js";
export function createNodeUploadFile(options) {
    return createUploadFile({
        field: options.field,
        name: options.name,
        type: options.type ?? "application/octet-stream",
        source: createReadonlyBytesUploadSource(options.bytes),
    });
}
//# sourceMappingURL=upload.js.map