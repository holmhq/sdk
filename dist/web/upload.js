import { createUploadFile, } from "../transports/upload.js";
export function createWebUploadFile(options) {
    const type = normalizeWebUploadType(options.type ?? options.blob.type ?? "application/octet-stream");
    return createUploadFile({
        field: options.field,
        name: options.name ?? "blob",
        type,
        source: createWebUploadSource(options.blob, type),
    });
}
export function createWebUploadSource(blob, contentType = "application/octet-stream") {
    const byteLength = normalizeWebUploadSize(blob.size);
    const normalizedType = normalizeWebUploadType(contentType);
    return Object.freeze({
        byteLength,
        slice(start, end) {
            const normalizedStart = normalizeWebUploadOffset(start, byteLength, "start");
            const normalizedEnd = normalizeWebUploadOffset(end, byteLength, "end");
            if (normalizedEnd < normalizedStart) {
                throw new RangeError("Web upload slice end must be greater than or equal to start.");
            }
            const sliced = blob.slice(normalizedStart, normalizedEnd, "application/octet-stream");
            const chunkBytes = normalizeWebUploadSize(sliced.size);
            const body = Object.freeze({
                byteLength: chunkBytes,
                size: chunkBytes,
                type: normalizeWebUploadType(sliced.type ?? normalizedType),
                blob: sliced,
            });
            return Object.freeze({ byteLength: chunkBytes, body });
        },
    });
}
function normalizeWebUploadSize(value) {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new TypeError("Web upload blob size must be a non-negative safe integer.");
    }
    return value;
}
function normalizeWebUploadOffset(value, max, label) {
    const normalized = normalizeWebUploadSize(value);
    if (normalized > max) {
        throw new RangeError(`Web upload slice ${label} exceeds blob size.`);
    }
    return normalized;
}
function normalizeWebUploadType(value) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError("Web upload content type must be a non-empty string.");
    }
    return normalized;
}
//# sourceMappingURL=upload.js.map