import { APP_HTTP_INVALIDATE_OPERATION, APP_HTTP_REQUEST_OPERATION, HOLM_APP_HTTP_CAPABILITY, } from "../app/protocol.js";
import { CapabilityVersionError, UnsupportedCapabilityError, } from "../core/capabilities.js";
import { createInvocationContext } from "../core/caller.js";
import { CancelledError, throwIfCancelled } from "../core/cancellation.js";
import { HolmError, ProtocolError } from "../core/errors.js";
import { LifecycleError } from "../core/lifecycle.js";
import { copyWireValue, isReadonlyBytes } from "../core/wire-value.js";
import { RemoteError } from "../transports/response.js";
export { APP_HTTP_INVALIDATE_OPERATION, APP_HTTP_REQUEST_OPERATION, HOLM_APP_HTTP_CAPABILITY, } from "../app/protocol.js";
export const SOBEK_HTTP_REQUEST_OPERATION = APP_HTTP_REQUEST_OPERATION;
export class UnsupportedSobekRuntimeServiceError extends HolmError {
    constructor(options) {
        super({
            kind: "capability",
            code: "unsupported_runtime_service",
            message: options.message ?? `The Sobek runtime requires an injected ${formatService(options.service)} service.`,
            details: Object.freeze({
                adapter: options.adapter,
                surface: "server",
                service: options.service,
            }),
        });
        this.name = "UnsupportedSobekRuntimeServiceError";
    }
}
const appHttpOffer = Object.freeze({
    id: HOLM_APP_HTTP_CAPABILITY.id,
    version: Object.freeze({ major: HOLM_APP_HTTP_CAPABILITY.major, minor: 0 }),
    origin: "runtime",
});
const appHttpOffers = Object.freeze([appHttpOffer]);
const emptyQuery = Object.freeze({});
const emptyHeaders = Object.freeze({});
export function sobekRuntime(options = {}) {
    const id = normalizeRuntimeId(options.id ?? "sobek-injected");
    const clock = options.clock ?? createUnsupportedClock(id);
    const scheduler = options.scheduler ?? createUnsupportedScheduler(id);
    let started = false;
    let disposed = false;
    return Object.freeze({
        id,
        surface: "server",
        clock,
        scheduler,
        async start() {
            assertNotDisposed(disposed, "start");
            started = true;
            return copyCapabilityOffers(appHttpOffers);
        },
        async invoke(request, control) {
            assertReady(started, disposed);
            const controlSnapshot = copyInvocationControl(control);
            throwIfCancelled(controlSnapshot.cancellation);
            assertHttpOperation(request, id);
            if (request.operation === APP_HTTP_INVALIDATE_OPERATION) {
                return Object.freeze({ requestId: request.requestId, payload: null });
            }
            const injected = sobekRequestFromOperation(request);
            const runtime = requireInjectedRuntime(options.runtime, id);
            const response = copySobekInjectedResponse(await runtime.invoke(injected, controlSnapshot));
            throwIfCancelled(controlSnapshot.cancellation);
            throwIfRuntimeDisposed(disposed);
            return operationResponseFromSobek(request.requestId, response);
        },
        async dispose() {
            disposed = true;
            started = false;
        },
    });
}
export function createFakeSobekInjectedRuntime(options = {}) {
    const invocations = [];
    let handler = options.handler ?? (() => ({ status: 200, body: { ok: true } }));
    return Object.freeze({
        get invocations() {
            return Object.freeze(invocations.map(copyFakeInvocation));
        },
        async invoke(request, control) {
            const invocation = Object.freeze({
                request: copySobekInjectedRequest(request),
                control: copyInvocationControl(control),
            });
            throwIfCancelled(invocation.control.cancellation);
            invocations.push(invocation);
            return copySobekInjectedResponse(await handler(invocation.request, invocation.control));
        },
        setHandler(nextHandler) {
            handler = nextHandler;
        },
    });
}
function sobekRequestFromOperation(request) {
    const payload = requireWireObject(request.payload, "payload");
    const source = selectPathSource(payload);
    const parsed = parsePathAndQuery(source.value);
    const method = readMethod(payload.method);
    const headers = readHeaders(payload.headers);
    const query = readQuery(payload, parsed.query, source.kind);
    const idempotencyKey = readOptionalString(payload.idempotencyKey, "idempotencyKey") ?? headers["idempotency-key"]?.[0];
    const body = payload.body === undefined ? undefined : copyWireValue(payload.body);
    const files = payload.files === undefined ? undefined : copyWireValue(payload.files);
    const approval = payload.approval === undefined ? undefined : copyWireValue(payload.approval);
    const params = source.kind === "path" && payload.params !== undefined ? requireWireObject(payload.params, "params") : undefined;
    const input = {
        requestId: request.requestId,
        method,
        path: parsed.path,
        query,
        headers,
        caller: createInvocationContext(request.caller, request.caller.invocationId, request.caller.startedAt, request.caller.reason),
    };
    if (params !== undefined) {
        input.params = params;
    }
    if (body !== undefined) {
        input.body = body;
    }
    if (files !== undefined) {
        input.files = files;
    }
    if (idempotencyKey !== undefined) {
        input.idempotencyKey = idempotencyKey;
    }
    if (approval !== undefined) {
        input.approval = approval;
    }
    return Object.freeze(input);
}
function readQuery(payload, parsedQuery, sourceKind) {
    const output = { ...parsedQuery };
    if (payload.query !== undefined) {
        Object.assign(output, requireWireObject(payload.query, "query"));
    }
    if (sourceKind === "url" && payload.params !== undefined) {
        Object.assign(output, requireWireObject(payload.params, "params"));
    }
    return freezeWireObject(output);
}
function selectPathSource(payload) {
    if (typeof payload.path === "string") {
        return { kind: "path", value: payload.path };
    }
    if (typeof payload.url === "string") {
        return { kind: "url", value: payload.url };
    }
    throw new ProtocolError({
        code: "invalid_sobek_request",
        message: "Sobek operation payload must include a canonical path or adapter URL.",
        details: { field: "path" },
    });
}
function parsePathAndQuery(value) {
    const withoutHash = value.split("#", 1)[0] ?? "";
    const absolutePathStart = findAbsolutePathStart(withoutHash);
    const pathAndQuery = absolutePathStart === undefined ? withoutHash : withoutHash.slice(absolutePathStart);
    const queryIndex = pathAndQuery.indexOf("?");
    const rawPath = queryIndex === -1 ? pathAndQuery : pathAndQuery.slice(0, queryIndex);
    const query = queryIndex === -1 ? "" : pathAndQuery.slice(queryIndex + 1);
    const path = normalizePath(rawPath);
    return Object.freeze({ path, query: parseQuery(query) });
}
function findAbsolutePathStart(value) {
    const separator = value.indexOf("://");
    if (separator === -1) {
        return undefined;
    }
    const pathStart = value.indexOf("/", separator + 3);
    return pathStart === -1 ? value.length : pathStart;
}
function normalizePath(value) {
    const path = value === "" ? "/" : value;
    if (!path.startsWith("/")) {
        throw new ProtocolError({
            code: "invalid_sobek_request_path",
            message: "Sobek canonical request paths must start with '/'.",
            details: { path },
        });
    }
    return path;
}
function parseQuery(value) {
    if (value === "") {
        return emptyQuery;
    }
    const output = {};
    for (const entry of value.split("&")) {
        if (entry === "") {
            continue;
        }
        const equals = entry.indexOf("=");
        const rawName = equals === -1 ? entry : entry.slice(0, equals);
        const rawValue = equals === -1 ? "" : entry.slice(equals + 1);
        const name = decodeQueryPart(rawName);
        const item = decodeQueryPart(rawValue);
        const existing = output[name];
        if (existing === undefined) {
            output[name] = item;
        }
        else if (Array.isArray(existing)) {
            output[name] = Object.freeze([...existing, item]);
        }
        else {
            output[name] = Object.freeze([existing, item]);
        }
    }
    return freezeWireObject(output);
}
function decodeQueryPart(value) {
    try {
        return decodeURIComponent(value.replace(/\+/g, " "));
    }
    catch (cause) {
        throw new ProtocolError({
            code: "invalid_sobek_request_query",
            message: "Sobek canonical request query contains invalid percent encoding.",
            cause,
        });
    }
}
function readMethod(value) {
    if (typeof value !== "string") {
        throw new ProtocolError({
            code: "invalid_sobek_request_method",
            message: "Sobek canonical request method must be GET or POST.",
        });
    }
    const method = value.toUpperCase();
    if (method === "GET" || method === "POST") {
        return method;
    }
    throw new ProtocolError({
        code: "unsupported_sobek_request_method",
        message: "Sobek injected runtime supports canonical Holm GET/POST operations only.",
        details: { method: value },
    });
}
function readHeaders(value) {
    if (value === undefined) {
        return emptyHeaders;
    }
    const input = requireWireObject(value, "headers");
    const output = {};
    for (const key of Object.keys(input).sort()) {
        const name = key.trim().toLowerCase();
        if (name === "") {
            throw new ProtocolError({
                code: "invalid_sobek_request_headers",
                message: "Sobek canonical request headers must have non-empty names.",
            });
        }
        const item = input[key];
        if (typeof item === "string") {
            output[name] = Object.freeze([item]);
            continue;
        }
        if (Array.isArray(item) && item.every((entry) => typeof entry === "string")) {
            output[name] = Object.freeze([...item]);
            continue;
        }
        throw new ProtocolError({
            code: "invalid_sobek_request_headers",
            message: "Sobek canonical request header values must be strings or string arrays.",
            details: { header: key },
        });
    }
    return Object.freeze(output);
}
function operationResponseFromSobek(requestId, response) {
    const status = normalizeStatus(response.status ?? (response.error === undefined ? 200 : 500));
    const headers = copyHeaders(response.headers ?? emptyHeaders);
    const error = response.error ?? extractErrorEnvelope(response.body);
    if (error !== undefined || status < 200 || status > 299) {
        throw new RemoteError({
            status,
            code: error?.code ?? "holm.remote_error",
            message: error?.message ?? "Remote operation failed.",
            ...(error?.details === undefined ? {} : { details: copyWireValue(error.details) }),
            ...(error?.retryable === undefined ? {} : { retryable: error.retryable }),
        });
    }
    return Object.freeze({
        requestId,
        payload: response.body === undefined ? null : copyWireValue(response.body),
        metadata: createMetadata(status, headers),
    });
}
function extractErrorEnvelope(value) {
    if (!isWireObject(value) || !isWireObject(value.error)) {
        return undefined;
    }
    const error = value.error;
    if (typeof error.code !== "string" || error.code.trim() === "" || typeof error.message !== "string") {
        return undefined;
    }
    return Object.freeze({
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: copyWireValue(error.details) }),
        ...(typeof error.retryable === "boolean" ? { retryable: error.retryable } : {}),
    });
}
function createMetadata(status, headers) {
    const metadata = { status };
    if (Object.keys(headers).length > 0) {
        metadata.headers = headersToWire(headers);
    }
    return freezeWireObject(metadata);
}
function headersToWire(headers) {
    const output = {};
    for (const key of Object.keys(headers).sort()) {
        output[key] = Object.freeze([...headers[key] ?? []]);
    }
    return freezeWireObject(output);
}
function copySobekInjectedResponse(response) {
    const status = response.status === undefined ? undefined : normalizeStatus(response.status);
    const headers = response.headers === undefined ? undefined : copyHeaders(response.headers);
    const body = response.body === undefined ? undefined : copyWireValue(response.body);
    const error = response.error === undefined ? undefined : copyStableError(response.error);
    return Object.freeze({
        ...(status === undefined ? {} : { status }),
        ...(headers === undefined ? {} : { headers }),
        ...(body === undefined ? {} : { body }),
        ...(error === undefined ? {} : { error }),
    });
}
function copyStableError(error) {
    if (typeof error.code !== "string" || error.code.trim() === "") {
        throw new ProtocolError({
            code: "invalid_sobek_error",
            message: "Sobek stable errors must include a non-empty code.",
        });
    }
    if (typeof error.message !== "string" || error.message.trim() === "") {
        throw new ProtocolError({
            code: "invalid_sobek_error",
            message: "Sobek stable errors must include a non-empty message.",
        });
    }
    return Object.freeze({
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: copyWireValue(error.details) }),
        ...(error.retryable === undefined ? {} : { retryable: error.retryable }),
    });
}
function copySobekInjectedRequest(request) {
    return Object.freeze({
        requestId: request.requestId,
        method: request.method,
        path: request.path,
        ...(request.params === undefined ? {} : { params: requireWireObject(request.params, "params") }),
        query: requireWireObject(request.query, "query"),
        headers: copyHeaders(request.headers),
        ...(request.body === undefined ? {} : { body: copyWireValue(request.body) }),
        ...(request.files === undefined ? {} : { files: copyWireValue(request.files) }),
        caller: createInvocationContext(request.caller, request.caller.invocationId, request.caller.startedAt, request.caller.reason),
        ...(request.idempotencyKey === undefined ? {} : { idempotencyKey: request.idempotencyKey }),
        ...(request.approval === undefined ? {} : { approval: copyWireValue(request.approval) }),
    });
}
function copyFakeInvocation(invocation) {
    return Object.freeze({
        request: copySobekInjectedRequest(invocation.request),
        control: copyInvocationControl(invocation.control),
    });
}
function copyHeaders(headers) {
    const output = {};
    for (const key of Object.keys(headers).sort()) {
        const name = key.trim().toLowerCase();
        if (name === "") {
            throw new ProtocolError({
                code: "invalid_sobek_response_headers",
                message: "Sobek canonical response headers must have non-empty names.",
            });
        }
        const values = headers[key];
        if (!Array.isArray(values) || !values.every((value) => typeof value === "string")) {
            throw new ProtocolError({
                code: "invalid_sobek_response_headers",
                message: "Sobek canonical response header values must be string arrays.",
                details: { header: key },
            });
        }
        output[name] = Object.freeze([...values]);
    }
    return Object.freeze(output);
}
function normalizeStatus(value) {
    if (!Number.isInteger(value) || value < 100 || value > 599) {
        throw new ProtocolError({
            code: "invalid_sobek_response_status",
            message: "Sobek canonical response status must be an integer HTTP status.",
            details: { status: value },
        });
    }
    return value;
}
function requireInjectedRuntime(runtime, adapter) {
    if (runtime === undefined) {
        throw new UnsupportedSobekRuntimeServiceError({ adapter, service: "runtime" });
    }
    return runtime;
}
function createUnsupportedClock(adapter) {
    return Object.freeze({
        now() {
            throw new UnsupportedSobekRuntimeServiceError({ adapter, service: "clock" });
        },
    });
}
function createUnsupportedScheduler(adapter) {
    return Object.freeze({
        schedule() {
            throw new UnsupportedSobekRuntimeServiceError({ adapter, service: "scheduler" });
        },
    });
}
function assertHttpOperation(request, adapterId) {
    const capability = request.capability;
    if (capability.id !== HOLM_APP_HTTP_CAPABILITY.id || capability.major !== HOLM_APP_HTTP_CAPABILITY.major) {
        const context = {
            id: capability.id,
            requirement: capability,
            offered: appHttpOffers,
            adapter: adapterId,
            surface: "server",
        };
        if (capability.id !== HOLM_APP_HTTP_CAPABILITY.id) {
            throw new UnsupportedCapabilityError(context);
        }
        throw new CapabilityVersionError(context);
    }
    if (request.operation !== APP_HTTP_REQUEST_OPERATION && request.operation !== APP_HTTP_INVALIDATE_OPERATION) {
        throw new ProtocolError({
            code: "unsupported_sobek_runtime_operation",
            message: "The Sobek injected runtime only accepts supported holm.http.app operations.",
            details: {
                adapter: adapterId,
                surface: "server",
                capability: request.capability.id,
                major: request.capability.major,
                operation: request.operation,
            },
        });
    }
}
function assertNotDisposed(disposed, operation) {
    if (!disposed) {
        return;
    }
    throw new LifecycleError({
        code: "sobek_runtime_disposed",
        message: `Cannot ${operation} a disposed Sobek runtime.`,
        state: "disposed",
    });
}
function assertReady(started, disposed) {
    assertNotDisposed(disposed, "invoke");
    if (started) {
        return;
    }
    throw new LifecycleError({
        code: "sobek_runtime_not_started",
        message: "Cannot invoke the Sobek runtime before start().",
        state: "created",
    });
}
function throwIfRuntimeDisposed(disposed) {
    if (disposed) {
        throw new CancelledError({ reason: "disposed" });
    }
}
function copyInvocationControl(control) {
    return Object.freeze({
        ...(control.cancellation === undefined ? {} : { cancellation: control.cancellation }),
        ...(control.timeoutMs === undefined ? {} : { timeoutMs: control.timeoutMs }),
    });
}
function copyCapabilityOffers(offers) {
    return Object.freeze(offers.map((offer) => Object.freeze({
        id: offer.id,
        origin: offer.origin,
        version: Object.freeze({ major: offer.version.major, minor: offer.version.minor }),
    })));
}
function requireWireObject(value, label) {
    if (!isWireObject(value)) {
        throw new ProtocolError({
            code: "invalid_sobek_request",
            message: `Sobek ${label} must be a wire object.`,
            details: { field: label },
        });
    }
    return copyWireValue(value);
}
function readOptionalString(value, label) {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== "string") {
        throw new ProtocolError({
            code: "invalid_sobek_request",
            message: `Sobek ${label} must be a string when provided.`,
            details: { field: label },
        });
    }
    return value;
}
function isWireObject(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value) || isReadonlyBytes(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function freezeWireObject(value) {
    return copyWireValue(value);
}
function normalizeRuntimeId(value) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError("Sobek runtime id must be a non-empty string.");
    }
    return normalized;
}
function formatService(service) {
    return service === "runtime" ? "runtime" : service;
}
//# sourceMappingURL=runtime.js.map