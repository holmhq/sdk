import { HolmError, serializeHolmError } from "./errors.js";
const severities = ["debug", "info", "warn", "error"];
export function createHolmDiagnosticEvent(input) {
    const at = normalizeOptionalTimestamp(input.at);
    return Object.freeze({
        channel: normalizeNonEmpty(input.channel, "diagnostic channel"),
        code: normalizeNonEmpty(input.code, "diagnostic code"),
        severity: normalizeSeverity(input.severity),
        message: normalizeNonEmpty(input.message, "diagnostic message"),
        ...(at === undefined ? {} : { at }),
        ...(input.details === undefined ? {} : { details: redactDiagnosticDetails(input.details) }),
        ...(input.error === undefined ? {} : { error: serializeHolmError(input.error) }),
    });
}
export function createDiagnosticsSink(handlers = [], options = {}) {
    const normalizedHandlers = normalizeHandlers(handlers);
    const onHandlerError = options.onHandlerError;
    function emit(input) {
        const event = createHolmDiagnosticEvent(input);
        for (const handler of normalizedHandlers) {
            notifyHandler(handler, event, onHandlerError);
        }
        return event;
    }
    return Object.freeze({ emit });
}
function normalizeHandlers(handlers) {
    return Object.freeze(Array.isArray(handlers) ? [...handlers] : [handlers]);
}
function notifyHandler(handler, event, onHandlerError) {
    try {
        const result = handler(event);
        if (isPromiseLike(result)) {
            void Promise.resolve(result).catch((error) => reportHandlerError(error, event, onHandlerError));
        }
    }
    catch (error) {
        reportHandlerError(error, event, onHandlerError);
    }
}
function reportHandlerError(error, sourceEvent, onHandlerError) {
    if (onHandlerError === undefined) {
        return;
    }
    const event = createHolmDiagnosticEvent({
        channel: "core.diagnostics",
        code: "diagnostics_handler_error",
        severity: "error",
        message: "Diagnostics handler failed.",
        details: {
            sourceChannel: sourceEvent.channel,
            sourceCode: sourceEvent.code,
        },
        error,
    });
    try {
        const result = onHandlerError(event);
        if (isPromiseLike(result)) {
            void Promise.resolve(result).catch(() => undefined);
        }
    }
    catch {
        // Diagnostics must never alter the operation that produced the event.
    }
}
function normalizeSeverity(severity) {
    if (!severities.includes(severity)) {
        throw new TypeError(`Unknown diagnostic severity: ${String(severity)}`);
    }
    return severity;
}
function normalizeOptionalTimestamp(value) {
    if (value === undefined) {
        return undefined;
    }
    if (!Number.isFinite(value)) {
        throw new TypeError("Diagnostic timestamp must be finite when provided.");
    }
    return value;
}
function normalizeNonEmpty(value, label) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError(`Holm ${label} must be a non-empty string.`);
    }
    return normalized;
}
function redactDiagnosticDetails(details) {
    const serialized = new HolmError({
        kind: "protocol",
        code: "diagnostic_details",
        message: "Diagnostic details.",
        details,
    }).toJSON().details;
    if (serialized === undefined) {
        return Object.freeze({});
    }
    if (isWireObject(serialized)) {
        return serialized;
    }
    return Object.freeze({ value: serialized });
}
function isWireObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value) && !("byteLength" in value);
}
function isPromiseLike(value) {
    return typeof value === "object" && value !== null && typeof value.then === "function";
}
//# sourceMappingURL=diagnostics.js.map