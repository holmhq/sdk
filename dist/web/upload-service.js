import { throwIfCancelled } from "../core/cancellation.js";
import { canonicalEncodeWireValue, } from "../core/wire-value.js";
import { RemoteError, UploadError, applyTransportAuth, composeResumableUpload, createTransportRequest, decodeTransportResponse, normalizeTransportError, } from "../transports/index.js";
import { createWebSessionAuth } from "./auth.js";
import { resolveWebRequestUrl } from "./url.js";
export const WEB_UPLOAD_PROGRESS_MODE = "acknowledged-resumable+coarse-multipart-fallback";
const resumableUnavailableStatuses = new Set([404, 405, 501]);
export function createWebUploadService(options = {}) {
    const fetchImplementation = resolveFetch(options.fetch);
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    const auth = options.auth ?? createWebSessionAuth();
    let sequence = 0;
    function nextRequestId() {
        sequence += 1;
        return `web-upload-${sequence}`;
    }
    async function request(context) {
        const url = resolveWebRequestUrl(context.path, baseUrl);
        const transportRequest = createTransportRequest({
            method: context.method,
            url: context.path,
            headers: {
                accept: "application/json",
                ...(context.contentType === undefined ? {} : { "content-type": context.contentType }),
            },
            responseMode: "json",
        });
        let authenticated;
        try {
            throwIfCancelled(context.signal);
            authenticated = await applyTransportAuth(transportRequest, auth);
            throwIfCancelled(context.signal);
        }
        catch (error) {
            throw normalizeTransportError(error, {
                request: transportRequest,
                ...(context.signal === undefined ? {} : { cancellation: context.signal }),
            });
        }
        const controller = new AbortController();
        const unsubscribe = context.signal?.onCancel(() => controller.abort());
        try {
            const response = await fetchImplementation(url, {
                method: context.method,
                headers: new Headers(authenticated.request.headers),
                ...(context.body === undefined ? {} : { body: context.body }),
                ...(authenticated.privateProof?.kind === "web-session"
                    ? { credentials: authenticated.privateProof.credentials }
                    : {}),
                signal: controller.signal,
            });
            throwIfCancelled(context.signal);
            const body = await response.text();
            throwIfCancelled(context.signal);
            if (response.ok && body.trim() === "") {
                return null;
            }
            return decodeTransportResponse({
                requestId: context.requestId,
                status: response.status,
                body,
                responseMode: "json",
                headers: responseHeaders(response.headers),
                url: response.url || url,
            }).payload;
        }
        catch (error) {
            throw normalizeTransportError(error, {
                request: authenticated.request,
                ...(context.signal === undefined ? {} : { cancellation: context.signal }),
            });
        }
        finally {
            unsubscribe?.();
        }
    }
    async function requestJson(method, path, value, signal) {
        return request({
            requestId: nextRequestId(),
            method,
            path,
            body: canonicalEncodeWireValue(value),
            contentType: "application/json",
            ...(signal === undefined ? {} : { signal }),
        });
    }
    async function requestBody(method, path, body, signal) {
        return request({
            requestId: nextRequestId(),
            method,
            path,
            body,
            ...(signal === undefined ? {} : { signal }),
        });
    }
    const adapter = {
        async createSession(file, control) {
            try {
                const payload = await requestJson("POST", "/api/uploads", {
                    name: file.name,
                    mime_type: file.type,
                    size_bytes: file.size,
                    purpose: "runtime",
                }, control.signal);
                return uploadSession(payload);
            }
            catch (error) {
                if (error instanceof RemoteError && resumableUnavailableStatuses.has(error.status ?? 0)) {
                    return Object.freeze({ unavailable: true });
                }
                throw error;
            }
        },
        async uploadChunk(input, control) {
            const payload = await request({
                requestId: nextRequestId(),
                method: "PUT",
                path: `/api/uploads/${encodeURIComponent(input.session.id)}/chunk?offset=${input.offset}`,
                body: webChunkBlob(input.chunk.body),
                contentType: "application/octet-stream",
                ...(control.signal === undefined ? {} : { signal: control.signal }),
            });
            return uploadStatus(payload);
        },
        async fetchStatus(input, control) {
            const payload = await request({
                requestId: nextRequestId(),
                method: "GET",
                path: `/api/uploads/${encodeURIComponent(input.session.id)}`,
                ...(control.signal === undefined ? {} : { signal: control.signal }),
            });
            return uploadStatus(payload);
        },
        async completeSession(_file, session, control) {
            const payload = await requestJson("POST", `/api/uploads/${encodeURIComponent(session.id)}/complete`, {}, control.signal);
            return uploadCompletion(payload);
        },
        async finalize(input, control) {
            return requestBody("POST", input.path, createHandoffFormData(input), control.signal);
        },
    };
    return Object.freeze({
        progressMode: WEB_UPLOAD_PROGRESS_MODE,
        async upload(input) {
            resolveWebRequestUrl(input.path, baseUrl);
            const webInput = input;
            await validateWebUploadFiles(webInput);
            try {
                return await composeResumableUpload(webInput, adapter);
            }
            catch (error) {
                if (!(error instanceof UploadError) || error.code !== "upload_unavailable") {
                    throw error;
                }
                return uploadMultipartFallback(webInput, requestBody);
            }
        },
    });
}
async function validateWebUploadFiles(input) {
    for (const file of input.files) {
        throwIfCancelled(input.signal);
        const probeEnd = Math.min(file.size, 1);
        const probe = await file.source.slice(0, probeEnd);
        webChunkBlob(probe.body);
    }
}
async function uploadMultipartFallback(input, send) {
    throwIfCancelled(input.signal);
    const total = input.files.reduce((sum, file) => sum + file.size, 0);
    input.onProgress?.(Object.freeze({ loaded: 0, total, percent: total === 0 ? 100 : 0 }));
    const form = new FormData();
    for (const field of input.fields ?? []) {
        appendFormValue(form, field.name, field.value);
    }
    for (const file of input.files) {
        const chunk = await file.source.slice(0, file.size);
        throwIfCancelled(input.signal);
        form.append(file.field, webMultipartFileBlob(chunk.body, file.type), file.name);
    }
    const result = await send("POST", input.path, form, input.signal);
    throwIfCancelled(input.signal);
    input.onProgress?.(Object.freeze({ loaded: total, total, percent: 100 }));
    return result;
}
function createHandoffFormData(input) {
    const form = new FormData();
    for (const field of input.fields) {
        appendFormValue(form, field.name, field.value);
    }
    form.append("__holm_uploads", canonicalEncodeWireValue(input.handoff));
    return form;
}
function appendFormValue(form, name, value) {
    form.append(name, typeof value === "string" ? value : canonicalEncodeWireValue(value));
}
function webChunkBlob(body) {
    if (!(body.blob instanceof Blob)) {
        throw new UploadError({
            code: "web_upload_blob_required",
            message: "Web upload chunks require Blob-backed bodies.",
            retryable: false,
        });
    }
    return body.blob;
}
function webMultipartFileBlob(body, type) {
    const blob = webChunkBlob(body);
    return blob.slice(0, blob.size, type);
}
function uploadSession(value) {
    const record = wireRecord(value, "upload session");
    return Object.freeze({
        id: requiredString(record.id, "upload session id"),
        ...optionalNumber(record.chunk_size ?? record.chunkSize, "upload chunk size", "chunkSize"),
        ...optionalNumber(record.received_bytes ?? record.receivedBytes, "upload received bytes", "receivedBytes"),
        ...optionalNumber(record.next_offset ?? record.nextOffset, "upload next offset", "nextOffset"),
    });
}
function uploadStatus(value) {
    const record = wireRecord(value, "upload status");
    return Object.freeze({
        ...optionalNumber(record.received_bytes ?? record.receivedBytes, "upload received bytes", "receivedBytes"),
        ...optionalNumber(record.next_offset ?? record.nextOffset, "upload next offset", "nextOffset"),
    });
}
function uploadCompletion(value) {
    return wireRecord(value, "upload completion");
}
function wireRecord(value, label) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new UploadError({
            code: "invalid_web_upload_response",
            message: `Holm ${label} must be an object.`,
            retryable: false,
        });
    }
    return value;
}
function requiredString(value, label) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new UploadError({
            code: "invalid_web_upload_response",
            message: `Holm ${label} must be a non-empty string.`,
            retryable: false,
        });
    }
    return value;
}
function optionalNumber(value, label, key) {
    if (value === undefined) {
        return Object.freeze({});
    }
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new UploadError({
            code: "invalid_web_upload_response",
            message: `Holm ${label} must be a non-negative safe integer.`,
            retryable: false,
        });
    }
    return Object.freeze({ [key]: value });
}
function resolveFetch(injected) {
    const implementation = injected ?? globalThis.fetch;
    if (typeof implementation !== "function") {
        throw new TypeError("The web upload service requires a Fetch implementation.");
    }
    return implementation;
}
function normalizeBaseUrl(value) {
    if (value === undefined) {
        return undefined;
    }
    try {
        return new URL(value);
    }
    catch (cause) {
        throw new TypeError("Web upload baseUrl must be an absolute URL.", { cause });
    }
}
function responseHeaders(headers) {
    const output = {};
    headers.forEach((value, key) => {
        output[key] = value;
    });
    return output;
}
//# sourceMappingURL=upload-service.js.map