import { CancelledError, throwIfCancelled } from "../core/cancellation.js";
import { ProtocolError } from "../core/errors.js";
import { LifecycleError } from "../core/lifecycle.js";
import { isReadonlyBytes } from "../core/wire-value.js";
import { applyTransportAuth, createTransportRequest, decodeTransportResponse, encodeTransportBody, normalizeTransportError, } from "../transports/index.js";
export const HOLM_APP_HTTP_CAPABILITY = Object.freeze({
    id: "holm.http.app",
    major: 1,
});
export const WEB_HTTP_REQUEST_OPERATION = "request";
const appHttpOffer = Object.freeze({
    id: HOLM_APP_HTTP_CAPABILITY.id,
    version: Object.freeze({ major: HOLM_APP_HTTP_CAPABILITY.major, minor: 0 }),
    origin: "runtime",
});
const appHttpOffers = Object.freeze([appHttpOffer]);
const defaultWebSessionProof = Object.freeze({
    kind: "web-session",
    credentials: "same-origin",
});
const defaultWebSessionAuth = Object.freeze({
    current() {
        return defaultWebSessionProof;
    },
});
export function webRuntime(options = {}) {
    const id = normalizeRuntimeId(options.id ?? "web-fetch");
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    const fetchImplementation = resolveFetch(options.fetch);
    const auth = options.auth ?? defaultWebSessionAuth;
    const clock = options.clock ?? createWebClock();
    const scheduler = options.scheduler ?? createWebScheduler();
    const active = new Set();
    let started = false;
    let disposed = false;
    return Object.freeze({
        id,
        surface: "web",
        clock,
        scheduler,
        async start() {
            assertNotDisposed(disposed, "start");
            started = true;
            return appHttpOffers;
        },
        async invoke(request, control) {
            assertReady(started, disposed);
            assertHttpOperation(request);
            const transportRequest = transportRequestFromPayload(request.payload);
            const authenticated = await authenticateWebRequest(transportRequest, auth, control.cancellation);
            throwIfRuntimeDisposed(disposed);
            const url = createWebRequestUrl(authenticated.request, baseUrl);
            const controller = new AbortController();
            active.add(controller);
            const unsubscribe = control.cancellation?.onCancel(() => controller.abort());
            try {
                const response = await fetchImplementation(url, createFetchInit(authenticated.request, authenticated.privateProof, controller.signal));
                throwIfCancelled(control.cancellation);
                throwIfRuntimeDisposed(disposed);
                const body = await readFetchResponseBody(response, authenticated.request.responseMode);
                throwIfCancelled(control.cancellation);
                throwIfRuntimeDisposed(disposed);
                return decodeTransportResponse({
                    requestId: request.requestId,
                    status: response.status,
                    body,
                    responseMode: authenticated.request.responseMode,
                    headers: readFetchResponseHeaders(response.headers),
                    url: response.url || url,
                });
            }
            catch (error) {
                throw normalizeTransportError(error, {
                    request: authenticated.request,
                    ...(control.cancellation === undefined ? {} : { cancellation: control.cancellation }),
                });
            }
            finally {
                unsubscribe?.();
                active.delete(controller);
            }
        },
        async dispose() {
            if (disposed) {
                return;
            }
            disposed = true;
            started = false;
            for (const controller of active) {
                controller.abort();
            }
            active.clear();
        },
    });
}
async function authenticateWebRequest(request, auth, cancellation) {
    try {
        throwIfCancelled(cancellation);
        const authenticated = await applyTransportAuth(request, auth);
        throwIfCancelled(cancellation);
        return authenticated;
    }
    catch (error) {
        throw normalizeTransportError(error, {
            request,
            ...(cancellation === undefined ? {} : { cancellation }),
        });
    }
}
function throwIfRuntimeDisposed(disposed) {
    if (disposed) {
        throw new CancelledError({ reason: "disposed" });
    }
}
function resolveFetch(injected) {
    const implementation = injected ?? globalThis.fetch;
    if (typeof implementation !== "function") {
        throw new TypeError("The web runtime requires a Fetch implementation.");
    }
    return implementation;
}
function normalizeRuntimeId(value) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError("Web runtime id must be a non-empty string.");
    }
    return normalized;
}
function normalizeBaseUrl(value) {
    if (value === undefined) {
        return undefined;
    }
    try {
        return new URL(value);
    }
    catch (cause) {
        throw new TypeError("Web runtime baseUrl must be an absolute URL.", { cause });
    }
}
function createWebClock() {
    return Object.freeze({
        now() {
            return Date.now();
        },
    });
}
function createWebScheduler() {
    return Object.freeze({
        schedule(delayMs, task) {
            if (!Number.isFinite(delayMs) || delayMs < 0) {
                throw new TypeError("Web scheduler delay must be a non-negative finite number.");
            }
            const handle = globalThis.setTimeout(task, delayMs);
            return Object.freeze({
                cancel() {
                    globalThis.clearTimeout(handle);
                },
            });
        },
    });
}
function assertNotDisposed(disposed, operation) {
    if (!disposed) {
        return;
    }
    throw new LifecycleError({
        code: "web_runtime_disposed",
        message: `Cannot ${operation} a disposed web runtime.`,
        state: "disposed",
    });
}
function assertReady(started, disposed) {
    assertNotDisposed(disposed, "invoke");
    if (started) {
        return;
    }
    throw new LifecycleError({
        code: "web_runtime_not_started",
        message: "Cannot invoke the web runtime before start().",
        state: "created",
    });
}
function assertHttpOperation(request) {
    if (request.capability.id !== HOLM_APP_HTTP_CAPABILITY.id ||
        request.capability.major !== HOLM_APP_HTTP_CAPABILITY.major ||
        request.operation !== WEB_HTTP_REQUEST_OPERATION) {
        throw new ProtocolError({
            code: "unsupported_web_runtime_operation",
            message: "The web runtime only accepts holm.http.app request operations.",
            details: {
                capability: request.capability.id,
                major: request.capability.major,
                operation: request.operation,
            },
        });
    }
}
function transportRequestFromPayload(payload) {
    try {
        if (!isWireObject(payload)) {
            throw new TypeError("payload must be an object");
        }
        const input = {
            method: requireString(payload.method, "method"),
            url: requireString(payload.url, "url"),
            ...(payload.params === undefined ? {} : { params: readParams(payload.params) }),
            ...(payload.headers === undefined ? {} : { headers: readHeaders(payload.headers) }),
            ...(payload.body === undefined ? {} : { body: readBody(payload.body) }),
            ...(payload.responseMode === undefined ? {} : { responseMode: readResponseMode(payload.responseMode) }),
            ...(payload.timeoutMs === undefined ? {} : { timeoutMs: requireNumber(payload.timeoutMs, "timeoutMs") }),
            ...(payload.sensitive === undefined ? {} : { sensitive: readSensitivity(payload.sensitive) }),
        };
        return createTransportRequest(input);
    }
    catch (cause) {
        throw new ProtocolError({
            code: "invalid_web_http_request",
            message: "Invalid web HTTP operation payload.",
            details: { reason: cause instanceof Error ? cause.message : "invalid payload" },
            cause,
        });
    }
}
function isWireObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value) && !isReadonlyBytes(value);
}
function readParams(value) {
    if (!isWireObject(value)) {
        throw new TypeError("params must be an object");
    }
    const params = {};
    for (const [key, item] of Object.entries(value)) {
        if (item === null || typeof item === "string" || typeof item === "boolean" || typeof item === "number") {
            params[key] = item;
        }
        else {
            throw new TypeError(`param ${key} must be a scalar`);
        }
    }
    return params;
}
function readHeaders(value) {
    if (!isWireObject(value)) {
        throw new TypeError("headers must be an object");
    }
    const headers = {};
    for (const [key, item] of Object.entries(value)) {
        headers[key] = requireString(item, `header ${key}`);
    }
    return headers;
}
function readBody(value) {
    if (!isWireObject(value)) {
        throw new TypeError("body must be an object");
    }
    switch (value.mode) {
        case "json":
            if (value.value === undefined) {
                throw new TypeError("json body value is required");
            }
            return { mode: "json", value: value.value };
        case "raw":
            return { mode: "raw", value: requireString(value.value, "raw body value") };
        case "binary":
            if (!isReadonlyBytes(value.value)) {
                throw new TypeError("binary body value must be readonly bytes");
            }
            return { mode: "binary", value: value.value };
        default:
            throw new TypeError("body mode must be json, raw, or binary");
    }
}
function readResponseMode(value) {
    if (value === "json" || value === "raw" || value === "binary") {
        return value;
    }
    throw new TypeError("responseMode must be json, raw, or binary");
}
function readSensitivity(value) {
    if (!isWireObject(value)) {
        throw new TypeError("sensitive must be an object");
    }
    return {
        ...(value.url === undefined ? {} : { url: requireBoolean(value.url, "sensitive.url") }),
        ...(value.params === undefined ? {} : { params: readStringArray(value.params, "sensitive.params") }),
        ...(value.headers === undefined ? {} : { headers: readStringArray(value.headers, "sensitive.headers") }),
    };
}
function readStringArray(value, label) {
    if (!Array.isArray(value)) {
        throw new TypeError(`${label} must be an array`);
    }
    return value.map((item, index) => requireString(item, `${label}[${index}]`));
}
function requireString(value, label) {
    if (typeof value !== "string") {
        throw new TypeError(`${label} must be a string`);
    }
    return value;
}
function requireNumber(value, label) {
    if (typeof value !== "number") {
        throw new TypeError(`${label} must be a number`);
    }
    return value;
}
function requireBoolean(value, label) {
    if (typeof value !== "boolean") {
        throw new TypeError(`${label} must be a boolean`);
    }
    return value;
}
function createWebRequestUrl(request, baseUrl) {
    if (baseUrl !== undefined || isAbsoluteUrl(request.url)) {
        const url = baseUrl === undefined ? new URL(request.url) : new URL(request.url, baseUrl);
        appendSearchParams(url.searchParams, request.params);
        return url.href;
    }
    const query = createSearchParams(request.params).toString();
    if (query === "") {
        return request.url;
    }
    const hashIndex = request.url.indexOf("#");
    const beforeHash = hashIndex === -1 ? request.url : request.url.slice(0, hashIndex);
    const hash = hashIndex === -1 ? "" : request.url.slice(hashIndex);
    return `${beforeHash}${beforeHash.includes("?") ? "&" : "?"}${query}${hash}`;
}
function isAbsoluteUrl(value) {
    return /^[A-Za-z][A-Za-z\d+.-]*:/.test(value);
}
function createSearchParams(params) {
    const search = new URLSearchParams();
    appendSearchParams(search, params);
    return search;
}
function appendSearchParams(search, params) {
    for (const key of Object.keys(params).sort()) {
        const value = params[key];
        if (value !== null && value !== undefined) {
            search.append(key, String(value));
        }
    }
    search.sort();
}
function createFetchInit(request, proof, signal) {
    const headers = new Headers(request.headers);
    if (!headers.has("accept")) {
        headers.set("accept", request.responseMode === "json" ? "application/json" : "*/*");
    }
    const body = request.body === undefined ? undefined : encodeTransportBody(request.body);
    if (body !== undefined && !headers.has("content-type")) {
        headers.set("content-type", body.contentType);
    }
    return {
        method: request.method,
        headers,
        ...(body === undefined ? {} : { body: typeof body.body === "string" ? body.body : copyBytesToArrayBuffer(body.body.toUint8Array()) }),
        ...(proof?.kind === "web-session" ? { credentials: proof.credentials } : {}),
        signal,
    };
}
function copyBytesToArrayBuffer(bytes) {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
}
async function readFetchResponseBody(response, mode) {
    if (mode === "binary") {
        return new Uint8Array(await response.arrayBuffer());
    }
    return response.text();
}
function readFetchResponseHeaders(headers) {
    const output = {};
    headers.forEach((value, key) => {
        output[key] = value;
    });
    return output;
}
//# sourceMappingURL=runtime.js.map