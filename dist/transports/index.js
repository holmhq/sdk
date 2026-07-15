export { createTransportCache, createTransportCacheKey, } from "./cache.js";
export { decodeTransportResponse, ProtocolError, RemoteError } from "./response.js";
export { UploadError, composeResumableUpload, createReadonlyBytesUploadSource, createUploadFile, redactUploadChunk, redactUploadRequest, } from "./upload.js";
import { CancelledError } from "../core/cancellation.js";
import { HolmError } from "../core/errors.js";
import { canonicalEncodeWireValue, copyWireValue, createReadonlyBytes, } from "../core/wire-value.js";
export class TransportError extends HolmError {
    constructor(options = {}) {
        super({
            kind: "transport",
            code: options.code ?? "transport_failure",
            message: options.message ?? "Transport request failed.",
            details: options.details,
            retryable: options.retryable ?? true,
            cause: options.cause,
        });
        this.name = "TransportError";
    }
}
export function createTransportRequest(input) {
    const method = normalizeMethod(input.method);
    const url = normalizeUrl(input.url);
    const params = normalizeParams(input.params ?? {});
    const headers = normalizeHeaders(input.headers ?? {});
    const responseMode = normalizeResponseMode(input.responseMode ?? "json");
    validateTimeout(input.timeoutMs);
    return Object.freeze({
        method,
        url,
        params,
        headers,
        ...(input.body === undefined ? {} : { body: normalizeBody(input.body) }),
        responseMode,
        ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs }),
    });
}
export function canonicalTransportKey(request) {
    return canonicalEncodeWireValue({
        method: request.method,
        url: request.url,
        params: request.params,
        responseMode: request.responseMode,
        ...(request.body === undefined ? {} : { body: transportBodyKey(request.body) }),
        ...(request.timeoutMs === undefined ? {} : { timeoutMs: request.timeoutMs }),
    });
}
export function encodeTransportBody(body) {
    const normalized = normalizeBody(body);
    switch (normalized.mode) {
        case "json":
            return Object.freeze({
                contentType: "application/json",
                body: canonicalEncodeWireValue(normalized.value),
            });
        case "raw":
            return Object.freeze({ contentType: "text/plain;charset=utf-8", body: normalized.value });
        case "binary":
            return Object.freeze({ contentType: "application/octet-stream", body: createReadonlyBytes(normalized.value) });
    }
}
export function normalizeTransportError(error, context = {}) {
    if (error instanceof HolmError) {
        return error;
    }
    if (context.cancellation?.cancelled) {
        return new CancelledError(context.cancellation.reason === undefined ? {} : { reason: context.cancellation.reason });
    }
    if (isAbortLike(error)) {
        return new CancelledError({ reason: "aborted" });
    }
    return new TransportError({
        details: Object.freeze({
            thrown: describeThrown(error),
            ...(context.request === undefined ? {} : { request: redactTransportRequest(context.request) }),
        }),
        cause: error,
    });
}
export async function applyTransportAuth(request, provider) {
    const proof = await provider.current();
    if (proof === undefined) {
        return Object.freeze({ request, privateProof: undefined, diagnostic: redactTransportRequest(request) });
    }
    const privateProof = normalizeAuthProof(proof);
    const authenticated = Object.freeze({
        ...request,
        headers: applyProofToHeaders(request.headers, privateProof),
    });
    return Object.freeze({
        request: authenticated,
        privateProof,
        diagnostic: redactAuthenticatedRequest(authenticated, privateProof),
    });
}
export function redactTransportRequest(request) {
    return Object.freeze({
        method: request.method,
        url: request.url,
        params: request.params,
        headers: redactHeaders(request.headers),
        ...(request.body === undefined ? {} : { body: redactBody(request.body) }),
        responseMode: request.responseMode,
        ...(request.timeoutMs === undefined ? {} : { timeoutMs: request.timeoutMs }),
    });
}
export function redactAuthenticatedTransport(applied) {
    return applied.diagnostic;
}
function redactAuthenticatedRequest(request, proof) {
    return Object.freeze({
        ...redactTransportRequest(request),
        auth: redactAuthProof(proof),
    });
}
function normalizeMethod(method) {
    const normalized = method.trim().toUpperCase();
    if (normalized === "") {
        throw new TypeError("Transport method must be a non-empty string.");
    }
    return normalized;
}
function normalizeUrl(url) {
    const normalized = url.trim();
    if (normalized === "") {
        throw new TypeError("Transport URL must be a non-empty string.");
    }
    return normalized;
}
function normalizeParams(params) {
    const normalized = {};
    for (const key of Object.keys(params).sort()) {
        const value = params[key];
        if (value === null || typeof value === "string" || typeof value === "boolean") {
            normalized[key] = value;
        }
        else if (typeof value === "number" && Number.isFinite(value)) {
            normalized[key] = value;
        }
        else {
            throw new TypeError(`Transport param ${key} must be a finite scalar value.`);
        }
    }
    return Object.freeze(normalized);
}
function normalizeHeaders(headers) {
    const normalized = {};
    for (const key of Object.keys(headers).sort()) {
        const name = key.trim().toLowerCase();
        const value = headers[key]?.trim();
        if (name === "" || value === undefined) {
            throw new TypeError("Transport headers must have non-empty names and string values.");
        }
        normalized[name] = value;
    }
    return Object.freeze(normalized);
}
function normalizeResponseMode(mode) {
    if (mode !== "json" && mode !== "raw" && mode !== "binary") {
        throw new TypeError(`Unknown transport response mode: ${String(mode)}`);
    }
    return mode;
}
function normalizeBody(body) {
    switch (body.mode) {
        case "json":
            return Object.freeze({ mode: "json", value: copyWireValue(body.value) });
        case "raw":
            if (typeof body.value !== "string") {
                throw new TypeError("Raw transport body must be a string.");
            }
            return Object.freeze({ mode: "raw", value: body.value });
        case "binary":
            return Object.freeze({ mode: "binary", value: createReadonlyBytes(body.value) });
    }
}
function validateTimeout(timeoutMs) {
    if (timeoutMs !== undefined && (!Number.isFinite(timeoutMs) || timeoutMs < 0)) {
        throw new TypeError("Transport timeout must be a non-negative finite number.");
    }
}
function transportBodyKey(body) {
    switch (body.mode) {
        case "json":
            return Object.freeze({ mode: "json", value: body.value });
        case "raw":
            return Object.freeze({ mode: "raw", value: body.value });
        case "binary":
            return Object.freeze({ mode: "binary", value: body.value });
    }
}
function normalizeAuthProof(proof) {
    switch (proof.kind) {
        case "web-session":
            if (proof.credentials !== "same-origin" && proof.credentials !== "include" && proof.credentials !== "omit") {
                throw new TypeError("Web session credentials must be same-origin, include, or omit.");
            }
            return Object.freeze({ kind: "web-session", credentials: proof.credentials });
        case "bearer":
            return Object.freeze({ kind: "bearer", scheme: normalizeTokenPart(proof.scheme, "scheme"), token: normalizeTokenPart(proof.token, "token") });
        case "header":
            return Object.freeze({ kind: "header", name: normalizeHeaderName(proof.name), value: normalizeTokenPart(proof.value, "header value") });
    }
}
function applyProofToHeaders(headers, proof) {
    switch (proof.kind) {
        case "web-session":
            return headers;
        case "bearer":
            return normalizeHeaders({ ...headers, authorization: `${proof.scheme} ${proof.token}` });
        case "header":
            return normalizeHeaders({ ...headers, [proof.name]: proof.value });
    }
}
function redactAuthProof(proof) {
    switch (proof.kind) {
        case "web-session":
            return Object.freeze({ kind: "web-session", credentials: proof.credentials });
        case "bearer":
            return Object.freeze({ kind: "bearer", scheme: proof.scheme });
        case "header":
            return Object.freeze({ kind: "header", header: normalizeHeaderName(proof.name) });
    }
}
function redactHeaders(headers) {
    const output = {};
    for (const key of Object.keys(headers).sort()) {
        output[key] = isSensitiveHeader(key) ? "[redacted]" : headers[key];
    }
    return Object.freeze(output);
}
function redactBody(body) {
    switch (body.mode) {
        case "json":
            return Object.freeze({ mode: "json", value: "[redacted]" });
        case "raw":
            return Object.freeze({ mode: "raw", value: "[redacted]" });
        case "binary":
            return Object.freeze({ mode: "binary", byteLength: body.value.byteLength });
    }
}
function isSensitiveHeader(name) {
    return /authorization|cookie|credential|password|secret|token|x-api-key/i.test(name);
}
function normalizeHeaderName(name) {
    const normalized = name.trim().toLowerCase();
    if (normalized === "") {
        throw new TypeError("Auth header name must be non-empty.");
    }
    return normalized;
}
function normalizeTokenPart(value, label) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError(`Auth ${label} must be non-empty.`);
    }
    return normalized;
}
function isAbortLike(error) {
    if (typeof error !== "object" || error === null) {
        return false;
    }
    const record = error;
    return record.name === "AbortError" || record.code === "ABORT_ERR";
}
function describeThrown(error) {
    if (error instanceof Error) {
        return copyWireValue({ kind: "error", name: error.name || "Error" });
    }
    return copyWireValue({ kind: typeof error });
}
//# sourceMappingURL=index.js.map