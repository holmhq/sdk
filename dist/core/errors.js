const errorKinds = [
    "capability",
    "transport",
    "remote",
    "protocol",
    "serialization",
    "cancellation",
    "timeout",
    "lifecycle",
    "extension",
];
const redacted = "[redacted]";
const unserializable = "[unserializable]";
const sensitiveKeyPattern = /authorization|auth|cookie|credential|password|payload|secret|token/i;
export class HolmError extends Error {
    kind;
    code;
    details;
    status;
    retryable;
    constructor(options) {
        validateOptions(options);
        super(options.message);
        this.name = "HolmError";
        this.kind = options.kind;
        this.code = options.code;
        if ("details" in options) {
            this.details = options.details;
        }
        if (options.status !== undefined) {
            this.status = options.status;
        }
        if (options.retryable !== undefined) {
            this.retryable = options.retryable;
        }
        if (options.cause !== undefined) {
            Object.defineProperty(this, "cause", {
                configurable: true,
                enumerable: false,
                value: options.cause,
                writable: false,
            });
        }
    }
    toJSON() {
        const serialized = {
            $holm: "error",
            kind: this.kind,
            code: this.code,
            message: this.message,
        };
        const details = redactDetail(this.details, new WeakSet());
        if (details !== undefined) {
            serialized.details = details;
        }
        if (this.status !== undefined) {
            serialized.status = this.status;
        }
        if (this.retryable !== undefined) {
            serialized.retryable = this.retryable;
        }
        return serialized;
    }
}
export function isHolmError(value) {
    return value instanceof HolmError;
}
export function serializeHolmError(value) {
    if (isHolmError(value)) {
        return value.toJSON();
    }
    return new HolmError({
        kind: "protocol",
        code: "unknown_error",
        message: "Unexpected error",
        details: describeUnknownError(value),
    }).toJSON();
}
function validateOptions(options) {
    if (!errorKinds.includes(options.kind)) {
        throw new TypeError(`Unknown Holm error kind: ${String(options.kind)}`);
    }
    if (options.code.trim() === "") {
        throw new TypeError("Holm error code must be a non-empty string.");
    }
    if (options.message.trim() === "") {
        throw new TypeError("Holm error message must be a non-empty string.");
    }
    if (options.status !== undefined &&
        (!Number.isInteger(options.status) || options.status < 100 || options.status > 599)) {
        throw new TypeError("Holm remote error status must be an integer HTTP status.");
    }
    if (options.retryable !== undefined && typeof options.retryable !== "boolean") {
        throw new TypeError("Holm error retryable must be boolean when provided.");
    }
}
function describeUnknownError(value) {
    if (typeof value === "string" && value.trim() !== "") {
        return { thrown: "string" };
    }
    if (value instanceof Error) {
        return { thrown: "error", name: value.name || "Error" };
    }
    return { thrown: typeof value };
}
function redactDetail(value, seen) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null || typeof value === "string" || typeof value === "boolean") {
        return value;
    }
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : unserializable;
    }
    if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") {
        return unserializable;
    }
    if (isReadonlyBytesLike(value)) {
        return value;
    }
    if (Array.isArray(value)) {
        if (seen.has(value)) {
            return unserializable;
        }
        seen.add(value);
        return Object.freeze(value.map((item) => {
            const redactedItem = redactDetail(item, seen);
            return redactedItem === undefined ? unserializable : redactedItem;
        }));
    }
    if (typeof value !== "object" || value === null) {
        return unserializable;
    }
    if (seen.has(value)) {
        return unserializable;
    }
    seen.add(value);
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
        return unserializable;
    }
    const output = {};
    const input = value;
    for (const key of Object.keys(input)) {
        if (sensitiveKeyPattern.test(key)) {
            output[key] = redacted;
        }
        else {
            const redactedValue = redactDetail(input[key], seen);
            output[key] = redactedValue === undefined ? unserializable : redactedValue;
        }
    }
    return Object.freeze(output);
}
function isReadonlyBytesLike(value) {
    return (typeof value === "object" &&
        value !== null &&
        value.$holm === "bytes" &&
        typeof value.toUint8Array === "function" &&
        typeof value.toJSON === "function");
}
//# sourceMappingURL=errors.js.map