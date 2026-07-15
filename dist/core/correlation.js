import { ProtocolError } from "./errors.js";
export function createInvocationResponseTracker(options) {
    const maxTerminalRequests = normalizeMaxTerminalRequests(options.maxTerminalRequests ?? 1024);
    const tracked = new Map();
    const terminal = [];
    function begin(requestId) {
        const normalizedRequestId = normalizeInvocationRequestId(requestId);
        const existing = tracked.get(normalizedRequestId);
        if (existing !== undefined) {
            emit("runtime_request_duplicate", "warn", "Runtime request ID was already used.", {
                requestId: normalizedRequestId,
                state: existing.state,
            });
            throw new ProtocolError({
                code: "runtime_request_duplicate",
                message: "Runtime request ID must identify exactly one logical request.",
                details: { requestId: normalizedRequestId, state: existing.state },
            });
        }
        const record = { requestId: normalizedRequestId, state: "active" };
        tracked.set(normalizedRequestId, record);
        return Object.freeze({
            requestId: normalizedRequestId,
            accept(response) {
                if (response.requestId !== normalizedRequestId) {
                    finish(record, "failed");
                    emit("runtime_response_mismatch", "error", "Runtime response did not match its request ID.", {
                        expectedRequestId: normalizedRequestId,
                        actualRequestId: response.requestId,
                    });
                    throw new ProtocolError({
                        code: "runtime_response_mismatch",
                        message: "Runtime response request ID does not match the logical request.",
                        details: { expectedRequestId: normalizedRequestId, actualRequestId: response.requestId },
                    });
                }
                if (record.state === "active") {
                    finish(record, "accepted");
                    return "accepted";
                }
                if (record.state === "accepted") {
                    emit("runtime_response_duplicate", "warn", "Duplicate runtime response was ignored.", {
                        requestId: normalizedRequestId,
                    });
                    return "duplicate";
                }
                emit("runtime_response_late", "info", "Late runtime response was ignored.", {
                    requestId: normalizedRequestId,
                    terminalState: record.state,
                });
                return "late";
            },
            cancel() {
                finish(record, "cancelled");
            },
            fail() {
                finish(record, "failed");
            },
        });
    }
    function finish(record, state) {
        if (record.state !== "active") {
            return;
        }
        record.state = state;
        terminal.push(record);
        while (terminal.length > maxTerminalRequests) {
            const expired = terminal.shift();
            if (expired !== undefined && tracked.get(expired.requestId) === expired) {
                tracked.delete(expired.requestId);
            }
        }
    }
    function clear() {
        for (const record of tracked.values()) {
            if (record.state === "active") {
                record.state = "cancelled";
            }
        }
        tracked.clear();
        terminal.splice(0);
    }
    function emit(code, severity, message, details) {
        options.diagnostics?.emit({
            channel: "core.invoke",
            code,
            severity,
            message,
            at: options.clock.now(),
            details,
        });
    }
    return Object.freeze({ begin, clear });
}
export function normalizeInvocationRequestId(requestId) {
    const normalized = requestId.trim();
    if (normalized === "") {
        throw new ProtocolError({
            code: "runtime_request_id_invalid",
            message: "Runtime request ID must be a non-empty string.",
        });
    }
    return normalized;
}
function normalizeMaxTerminalRequests(value) {
    if (!Number.isInteger(value) || value < 1) {
        throw new TypeError("Invocation response tracker capacity must be a positive integer.");
    }
    return value;
}
//# sourceMappingURL=correlation.js.map