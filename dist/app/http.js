import { createTransportRequest, } from "../transports/index.js";
import { APP_HTTP_INVALIDATE_OPERATION, APP_HTTP_REQUEST_OPERATION, HOLM_APP_HTTP_CAPABILITY, } from "./protocol.js";
export function createAppHttpClient(context, requestIdFactory) {
    let sequence = 0;
    async function requestRaw(input, options = {}) {
        const request = createTransportRequest(input);
        sequence += 1;
        const requestId = requestIdFactory(sequence);
        return context.invoke({
            capability: HOLM_APP_HTTP_CAPABILITY,
            operation: APP_HTTP_REQUEST_OPERATION,
            payload: request,
            requestId,
            ...(options.reason === undefined ? {} : { reason: options.reason }),
            ...createInvocationControl(request, options.control),
        });
    }
    async function request(input, options = {}) {
        return (await requestRaw(input, options)).payload;
    }
    async function invalidateCache() {
        sequence += 1;
        await context.invoke({
            capability: HOLM_APP_HTTP_CAPABILITY,
            operation: APP_HTTP_INVALIDATE_OPERATION,
            payload: null,
            requestId: requestIdFactory(sequence),
            reason: "app.http.invalidate-cache",
        });
    }
    return Object.freeze({
        request,
        requestRaw,
        invalidateCache,
        get(url, options = {}) {
            return request(requestInput("GET", url, options), options);
        },
        post(url, body, options = {}) {
            return request(jsonRequestInput("POST", url, body, options), options);
        },
        put(url, body, options = {}) {
            return request(jsonRequestInput("PUT", url, body, options), options);
        },
        patch(url, body, options = {}) {
            return request(jsonRequestInput("PATCH", url, body, options), options);
        },
        delete(url, options = {}) {
            return request(requestInput("DELETE", url, options), options);
        },
    });
}
function requestInput(method, url, options) {
    return {
        method,
        url,
        ...(options.params === undefined ? {} : { params: options.params }),
        ...(options.headers === undefined ? {} : { headers: options.headers }),
        ...(options.responseMode === undefined ? {} : { responseMode: options.responseMode }),
        ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
        ...(options.sensitive === undefined ? {} : { sensitive: options.sensitive }),
    };
}
function jsonRequestInput(method, url, body, options) {
    return {
        ...requestInput(method, url, options),
        body: { mode: "json", value: body },
    };
}
function createInvocationControl(request, control) {
    if (request.timeoutMs === undefined || control?.timeoutMs !== undefined) {
        return control === undefined ? {} : { control };
    }
    return {
        control: Object.freeze({
            ...(control ?? {}),
            timeoutMs: request.timeoutMs,
        }),
    };
}
//# sourceMappingURL=http.js.map