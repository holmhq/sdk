import { HolmError } from "./errors.js";
const base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const base64Values = new Map([...base64Alphabet].map((char, index) => [char, index]));
class HolmReadonlyBytes {
    $holm = "bytes";
    #bytes;
    constructor(bytes) {
        this.#bytes = Object.freeze([...bytes]);
        Object.freeze(this);
    }
    get byteLength() {
        return this.#bytes.length;
    }
    at(index) {
        if (!Number.isInteger(index) || index < 0) {
            return undefined;
        }
        return this.#bytes[index];
    }
    toUint8Array() {
        return Uint8Array.from(this.#bytes);
    }
    toJSON() {
        return { $holm: "bytes", data: encodeBase64(this.#bytes) };
    }
    [Symbol.iterator]() {
        return this.#bytes[Symbol.iterator]();
    }
}
export function createReadonlyBytes(input) {
    const bytes = materializeBytes(input);
    return new HolmReadonlyBytes(bytes);
}
export function isReadonlyBytes(value) {
    return value instanceof HolmReadonlyBytes;
}
export function isWireValue(value) {
    try {
        copyWireValue(value);
        return true;
    }
    catch {
        return false;
    }
}
export function assertWireValue(value) {
    copyWireValue(value);
}
export function copyWireValue(value) {
    return copyValidated(value, new WeakSet(), "$");
}
export function canonicalEncodeWireValue(value) {
    return encodeCanonical(copyWireValue(value));
}
function copyValidated(value, seen, path) {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
        return value;
    }
    if (typeof value === "number") {
        if (Number.isFinite(value)) {
            return value;
        }
        throw invalidWireValue(path, "numbers must be finite");
    }
    if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") {
        throw invalidWireValue(path, `${typeof value} values are not wire-serializable`);
    }
    if (isReadonlyBytes(value)) {
        return createReadonlyBytes(value);
    }
    if (Array.isArray(value)) {
        markSeen(value, seen, path);
        return Object.freeze(value.map((item, index) => copyValidated(item, seen, `${path}[${index}]`)));
    }
    if (typeof value !== "object" || value === null) {
        throw invalidWireValue(path, "value is not wire-serializable");
    }
    markSeen(value, seen, path);
    if (isHolmBytesTag(value)) {
        return createReadonlyBytes(decodeBase64(value.data));
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
        throw invalidWireValue(path, "class instances are not wire-serializable");
    }
    const input = value;
    const output = {};
    for (const key of Object.keys(input)) {
        if (key === "$holm") {
            throw invalidWireValue(`${path}.$holm`, "the $holm key is reserved for SDK wire tags");
        }
        output[key] = copyValidated(input[key], seen, `${path}.${key}`);
    }
    return Object.freeze(output);
}
function isHolmBytesTag(value) {
    const input = value;
    const keys = Object.keys(input);
    return keys.length === 2 && input.$holm === "bytes" && typeof input.data === "string";
}
function markSeen(value, seen, path) {
    if (seen.has(value)) {
        throw invalidWireValue(path, "cycle or shared reference is not wire-serializable");
    }
    seen.add(value);
}
function encodeCanonical(value) {
    if (value === null || typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
        return JSON.stringify(value);
    }
    if (isReadonlyBytes(value)) {
        return `{"$holm":"bytes","data":${JSON.stringify(value.toJSON().data)}}`;
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => encodeCanonical(item)).join(",")}]`;
    }
    const object = value;
    return `{${Object.keys(object)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${encodeCanonical(object[key])}`)
        .join(",")}}`;
}
function materializeBytes(input) {
    const values = hasArrayLikeLength(input) ? materializeArrayLike(input) : [...input];
    return values.map((value, index) => validateByte(value, index));
}
function hasArrayLikeLength(input) {
    return typeof input.length === "number";
}
function materializeArrayLike(input) {
    const values = [];
    for (let index = 0; index < input.length; index += 1) {
        values.push(input[index]);
    }
    return values;
}
function validateByte(value, index) {
    if (!Number.isInteger(value) || value < 0 || value > 255) {
        throw invalidWireValue(`byte[${index}]`, "bytes must be integers from 0 to 255");
    }
    return value;
}
function encodeBase64(bytes) {
    let output = "";
    for (let index = 0; index < bytes.length; index += 3) {
        const remaining = bytes.length - index;
        const first = bytes[index];
        const second = remaining > 1 ? bytes[index + 1] : 0;
        const third = remaining > 2 ? bytes[index + 2] : 0;
        const bits = (first << 16) | (second << 8) | third;
        output += base64Alphabet.charAt((bits >> 18) & 63);
        output += base64Alphabet.charAt((bits >> 12) & 63);
        if (index + 1 < bytes.length) {
            output += base64Alphabet.charAt((bits >> 6) & 63);
        }
        if (index + 2 < bytes.length) {
            output += base64Alphabet.charAt(bits & 63);
        }
    }
    return output;
}
function decodeBase64(value) {
    if (!/^[A-Za-z0-9+/]*$/.test(value) || value.length % 4 === 1) {
        throw invalidWireValue("$.data", "bytes data must be canonical unpadded base64");
    }
    const bytes = [];
    for (let index = 0; index < value.length; index += 4) {
        const first = decodeBase64Char(value[index] ?? "A");
        const second = decodeBase64Char(value[index + 1] ?? "A");
        const third = decodeBase64Char(value[index + 2] ?? "A");
        const fourth = decodeBase64Char(value[index + 3] ?? "A");
        const bits = (first << 18) | (second << 12) | (third << 6) | fourth;
        bytes.push((bits >> 16) & 255);
        if (index + 2 < value.length) {
            bytes.push((bits >> 8) & 255);
        }
        if (index + 3 < value.length) {
            bytes.push(bits & 255);
        }
    }
    if (encodeBase64(bytes) !== value) {
        throw invalidWireValue("$.data", "bytes data must be canonical unpadded base64");
    }
    return bytes;
}
function decodeBase64Char(value) {
    const decoded = base64Values.get(value);
    if (decoded === undefined) {
        throw invalidWireValue("$.data", "bytes data must be canonical unpadded base64");
    }
    return decoded;
}
function invalidWireValue(path, reason) {
    return new HolmError({
        kind: "serialization",
        code: "invalid_wire_value",
        message: `Invalid wire value at ${path}: ${reason}.`,
    });
}
//# sourceMappingURL=wire-value.js.map