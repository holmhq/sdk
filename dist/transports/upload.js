import { CancelledError, throwIfCancelled } from "../core/cancellation.js";
import { HolmError } from "../core/errors.js";
import { copyWireValue, createReadonlyBytes, } from "../core/wire-value.js";
export class UploadError extends HolmError {
    constructor(options) {
        super({
            kind: "transport",
            code: options.code,
            message: options.message,
            ...(options.details === undefined ? {} : { details: options.details }),
            ...(options.retryable === undefined ? {} : { retryable: options.retryable }),
            ...(options.cause === undefined ? {} : { cause: options.cause }),
        });
        this.name = "UploadError";
    }
}
export function createReadonlyBytesUploadSource(input) {
    const bytes = createReadonlyBytes(input);
    return Object.freeze({
        byteLength: bytes.byteLength,
        slice(start, end) {
            const normalized = normalizeSlice(start, end, bytes.byteLength);
            const data = bytes.toUint8Array().slice(normalized.start, normalized.end);
            const body = createReadonlyBytes(data);
            return Object.freeze({ byteLength: body.byteLength, body });
        },
    });
}
export function createUploadFile(input) {
    const sourceBytes = normalizeByteCount(input.source.byteLength, "upload source byteLength");
    const size = normalizeByteCount(input.size ?? sourceBytes, "upload file size");
    return Object.freeze({
        field: normalizeUploadName(input.field, "upload field"),
        name: normalizeUploadName(input.name, "upload file name"),
        type: normalizeUploadType(input.type ?? "application/octet-stream"),
        size,
        source: input.source,
    });
}
export function redactUploadRequest(input) {
    const fields = normalizeFields(input.fields ?? []).map((field) => Object.freeze({
        name: field.name,
        value: "[redacted]",
    }));
    const files = input.files.map((file) => {
        const normalized = normalizeUploadFile(file);
        return Object.freeze({
            field: normalized.field,
            name: normalized.name,
            type: normalized.type,
            size: normalized.size,
        });
    });
    return Object.freeze({
        path: normalizeUploadPath(input.path),
        fields: Object.freeze(fields),
        files: Object.freeze(files),
        totalBytes: totalUploadBytes(files),
    });
}
export function redactUploadChunk(chunk) {
    return Object.freeze({ byteLength: normalizeByteCount(chunk.byteLength, "upload chunk byteLength") });
}
export async function composeResumableUpload(input, adapter) {
    const request = normalizeUploadRequest(input);
    const control = createUploadControl(request);
    const handoff = {};
    const total = totalUploadBytes(request.files);
    let acknowledgedBytes = 0;
    let lastReportedBytes = -1;
    validateUniqueUploadFields(request.files);
    const emitProgress = (loaded) => {
        const normalizedLoaded = Math.max(0, Math.min(total, loaded));
        if (normalizedLoaded === lastReportedBytes) {
            return;
        }
        lastReportedBytes = normalizedLoaded;
        request.onProgress?.(Object.freeze({
            loaded: normalizedLoaded,
            total,
            percent: total > 0 ? Math.round((normalizedLoaded / total) * 100) : 100,
        }));
    };
    for (const file of request.files) {
        throwIfCancelled(request.signal);
        const session = await adapter.createSession(file, control);
        throwIfCancelled(request.signal);
        if (isUploadUnavailable(session)) {
            throw new UploadError({
                code: "upload_unavailable",
                message: "Resumable uploads are unavailable.",
                retryable: false,
            });
        }
        let offset = initialSessionOffset(session, file.size);
        emitProgress(acknowledgedBytes + offset);
        while (offset < file.size) {
            throwIfCancelled(request.signal);
            const chunkEnd = Math.min(file.size, offset + normalizeChunkSize(session.chunkSize, file.size - offset));
            const chunk = await file.source.slice(offset, chunkEnd);
            validateChunk(chunk, offset, chunkEnd);
            try {
                const ack = await adapter.uploadChunk(Object.freeze({ path: request.path, file, session, offset, chunk }), control);
                throwIfCancelled(request.signal);
                offset = nextAcknowledgedOffset(ack, offset, chunk.byteLength, file.size);
                emitProgress(acknowledgedBytes + offset);
            }
            catch (cause) {
                if (request.signal?.cancelled) {
                    throw new CancelledError(request.signal.reason === undefined ? {} : { reason: request.signal.reason });
                }
                if (adapter.fetchStatus === undefined) {
                    throw cause;
                }
                const status = await adapter.fetchStatus(Object.freeze({ path: request.path, file, session, offset }), control);
                throwIfCancelled(request.signal);
                const resumedOffset = nextStatusOffset(status, file.size);
                if (resumedOffset <= offset) {
                    throw cause;
                }
                offset = resumedOffset;
                emitProgress(acknowledgedBytes + offset);
            }
        }
        const completion = await adapter.completeSession(file, session, control);
        throwIfCancelled(request.signal);
        handoff[file.field] = createHandoffEntry(file, session, completion);
        acknowledgedBytes += file.size;
        emitProgress(acknowledgedBytes);
    }
    const finalized = Object.freeze({
        path: request.path,
        fields: request.fields,
        files: request.files,
        handoff: Object.freeze(handoff),
    });
    throwIfCancelled(request.signal);
    if (adapter.finalize === undefined) {
        return finalized.handoff;
    }
    const result = await adapter.finalize(finalized, control);
    throwIfCancelled(request.signal);
    return result;
}
function normalizeUploadRequest(input) {
    const files = input.files.map((file) => normalizeUploadFile(file));
    return Object.freeze({
        path: normalizeUploadPath(input.path),
        fields: Object.freeze(normalizeFields(input.fields ?? [])),
        files: Object.freeze(files),
        ...(input.signal === undefined ? {} : { signal: input.signal }),
        ...(input.onProgress === undefined ? {} : { onProgress: input.onProgress }),
    });
}
function normalizeUploadFile(file) {
    return createUploadFile(file);
}
function normalizeFields(fields) {
    return Object.freeze(fields.map((field) => Object.freeze({
        name: normalizeUploadName(field.name, "upload field name"),
        value: copyWireValue(field.value),
    })));
}
function createUploadControl(request) {
    return Object.freeze({
        path: request.path,
        ...(request.signal === undefined ? {} : { signal: request.signal }),
    });
}
function validateUniqueUploadFields(files) {
    const seen = new Set();
    for (const file of files) {
        if (seen.has(file.field)) {
            throw new UploadError({
                code: "upload_field_conflict",
                message: `Duplicate upload field: ${file.field}`,
                retryable: false,
            });
        }
        seen.add(file.field);
    }
}
function createHandoffEntry(file, session, completion) {
    const uploadId = normalizeUploadName(completion.uploadId ?? completion.id ?? session.id, "upload id");
    const tempRef = completion.tempRef ?? completion.temp_ref;
    const name = completion.name === undefined ? file.name : normalizeUploadName(completion.name, "upload completion name");
    const type = normalizeUploadType(completion.type ?? completion.mimeType ?? completion.mime_type ?? file.type);
    const size = normalizeByteCount(completion.size ?? completion.sizeBytes ?? completion.size_bytes ?? file.size, "upload completion size");
    return Object.freeze({
        upload_id: uploadId,
        ...(tempRef === undefined ? {} : { temp_ref: normalizeUploadName(tempRef, "upload temp ref") }),
        name,
        type,
        size,
    });
}
function initialSessionOffset(session, fileSize) {
    return clampOffset(session.nextOffset ?? session.receivedBytes ?? 0, fileSize, "upload session offset");
}
function nextAcknowledgedOffset(ack, previousOffset, chunkBytes, fileSize) {
    return clampOffset(ack.nextOffset ?? ack.receivedBytes ?? previousOffset + chunkBytes, fileSize, "upload chunk offset");
}
function nextStatusOffset(status, fileSize) {
    return clampOffset(status.nextOffset ?? status.receivedBytes ?? 0, fileSize, "upload status offset");
}
function normalizeChunkSize(chunkSize, remaining) {
    if (chunkSize === undefined) {
        return remaining;
    }
    const normalized = normalizeByteCount(chunkSize, "upload chunk size");
    if (normalized <= 0) {
        throw new UploadError({
            code: "upload_invalid_chunk_size",
            message: "Upload chunk size must be greater than zero.",
            retryable: false,
        });
    }
    return Math.min(normalized, remaining);
}
function validateChunk(chunk, start, end) {
    const expected = end - start;
    const byteLength = normalizeByteCount(chunk.byteLength, "upload chunk byteLength");
    if (byteLength !== expected || chunk.body.byteLength !== byteLength) {
        throw new UploadError({
            code: "upload_invalid_chunk",
            message: "Upload source returned a chunk with an unexpected byte length.",
            details: { expected, actual: byteLength },
            retryable: false,
        });
    }
}
function normalizeSlice(start, end, byteLength) {
    const normalizedStart = clampOffset(start, byteLength, "upload slice start");
    const normalizedEnd = clampOffset(end, byteLength, "upload slice end");
    if (normalizedEnd < normalizedStart) {
        throw new RangeError("Upload slice end must be greater than or equal to start.");
    }
    return Object.freeze({ start: normalizedStart, end: normalizedEnd });
}
function normalizeUploadPath(path) {
    const normalized = path.trim();
    if (normalized === "") {
        throw new TypeError("Upload path must be a non-empty string.");
    }
    return normalized;
}
function normalizeUploadName(value, label) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError(`${label} must be a non-empty string.`);
    }
    return normalized;
}
function normalizeUploadType(value) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError("Upload content type must be a non-empty string.");
    }
    return normalized;
}
function normalizeByteCount(value, label) {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new TypeError(`${label} must be a non-negative safe integer.`);
    }
    return value;
}
function clampOffset(value, max, label) {
    const normalized = normalizeByteCount(value, label);
    if (normalized > max) {
        throw new UploadError({
            code: "upload_invalid_offset",
            message: `${label} cannot exceed upload size.`,
            details: { offset: normalized, size: max },
            retryable: false,
        });
    }
    return normalized;
}
function totalUploadBytes(files) {
    return files.reduce((total, file) => total + file.size, 0);
}
function isUploadUnavailable(session) {
    return "unavailable" in session && session.unavailable === true;
}
//# sourceMappingURL=upload.js.map