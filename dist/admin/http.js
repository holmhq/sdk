import { createTransportRequest, } from "../transports/index.js";
import { ADMIN_HTTP_INVALIDATE_OPERATION, ADMIN_HTTP_REQUEST_OPERATION, HOLM_ADMIN_HTTP_CAPABILITY, } from "./protocol.js";
export function createAdminHttpClient(context, requestIdFactory) {
    let sequence = 0;
    async function requestRaw(input, options = {}) {
        const request = createTransportRequest(input);
        sequence += 1;
        return context.invoke({
            capability: HOLM_ADMIN_HTTP_CAPABILITY,
            operation: ADMIN_HTTP_REQUEST_OPERATION,
            payload: request,
            requestId: requestIdFactory(sequence),
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
            capability: HOLM_ADMIN_HTTP_CAPABILITY,
            operation: ADMIN_HTTP_INVALIDATE_OPERATION,
            payload: null,
            requestId: requestIdFactory(sequence),
            reason: "admin.http.invalidate-cache",
        });
    }
    return Object.freeze({ request, requestRaw, invalidateCache });
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