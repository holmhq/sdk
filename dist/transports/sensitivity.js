import { createOpaqueCacheIdentity } from "../core/cache-key.js";
const redacted = "[redacted]";
export function normalizeTransportSensitivity(input = {}) {
    return Object.freeze({
        url: input.url === true,
        params: normalizeMarkers(input.params ?? [], "param", false),
        headers: normalizeMarkers(input.headers ?? [], "header", true),
    });
}
export function addSensitiveTransportHeader(sensitivity, name) {
    return Object.freeze({
        ...sensitivity,
        headers: normalizeMarkers([...sensitivity.headers, name], "header", true),
    });
}
export function createOpaqueTransportKey(request) {
    return `transport:v1:${createOpaqueCacheIdentity({
        method: request.method,
        url: request.url,
        params: request.params,
        responseMode: request.responseMode,
        ...(request.body === undefined ? {} : { body: transportBodyKey(request.body) }),
        ...(request.timeoutMs === undefined ? {} : { timeoutMs: request.timeoutMs }),
    })}`;
}
export function redactTransportRequestMetadata(request) {
    return Object.freeze({
        method: request.method,
        url: request.sensitive.url ? redacted : request.url,
        params: redactParams(request.params, request.sensitive.params),
        headers: redactHeaders(request.headers, request.sensitive.headers),
        ...(request.body === undefined ? {} : { body: redactBody(request.body) }),
        responseMode: request.responseMode,
        ...(request.timeoutMs === undefined ? {} : { timeoutMs: request.timeoutMs }),
    });
}
function normalizeMarkers(values, label, lowercase) {
    const normalized = values.map((value) => {
        const marker = value.trim();
        if (marker === "") {
            throw new TypeError(`Sensitive transport ${label} names must be non-empty.`);
        }
        return lowercase ? marker.toLowerCase() : marker;
    });
    return Object.freeze([...new Set(normalized)].sort());
}
function redactParams(params, sensitive) {
    const markers = new Set(sensitive);
    const output = {};
    for (const key of Object.keys(params).sort()) {
        output[key] = markers.has(key) ? redacted : params[key];
    }
    return Object.freeze(output);
}
function redactHeaders(headers, sensitive) {
    const markers = new Set(sensitive);
    const output = {};
    for (const key of Object.keys(headers).sort()) {
        output[key] = markers.has(key) || isSensitiveHeader(key) ? redacted : headers[key];
    }
    return Object.freeze(output);
}
function redactBody(body) {
    switch (body.mode) {
        case "json":
            return Object.freeze({ mode: "json", value: redacted });
        case "raw":
            return Object.freeze({ mode: "raw", value: redacted });
        case "binary":
            return Object.freeze({ mode: "binary", byteLength: body.value.byteLength });
    }
}
function transportBodyKey(body) {
    // Transport keys are diagnostic/cache identities, not secret verifiers. Body
    // contents are intentionally reduced to shape so logged keys cannot become an
    // offline oracle for low-entropy request secrets.
    switch (body.mode) {
        case "json":
            return Object.freeze({ mode: "json", value: redacted });
        case "raw":
            return Object.freeze({ mode: "raw", value: redacted });
        case "binary":
            return Object.freeze({ mode: "binary", byteLength: body.value.byteLength });
    }
}
function isSensitiveHeader(name) {
    return /authorization|auth|cookie|credential|password|secret|signature|token|x-api-key|api[-_]?key/i.test(name);
}
//# sourceMappingURL=sensitivity.js.map