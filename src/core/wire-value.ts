import { HolmError } from "./errors.js";

export type WireScalar = null | boolean | number | string;
export type WireArray = readonly WireValue[];
export type WireObject = { readonly [key: string]: WireValue };
export type WireValue = WireScalar | ReadonlyBytes | WireArray | WireObject;

export interface ReadonlyBytes extends Iterable<number> {
  readonly $holm: "bytes";
  readonly byteLength: number;
  at(index: number): number | undefined;
  toUint8Array(): Uint8Array;
  toJSON(): HolmBytesTag;
}

export interface HolmBytesTag {
  readonly $holm: "bytes";
  readonly data: string;
}

const base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const base64Values = new Map([...base64Alphabet].map((char, index) => [char, index] as const));

class HolmReadonlyBytes implements ReadonlyBytes {
  readonly $holm = "bytes";
  readonly #bytes: readonly number[];

  constructor(bytes: readonly number[]) {
    this.#bytes = Object.freeze([...bytes]);
    Object.freeze(this);
  }

  get byteLength(): number {
    return this.#bytes.length;
  }

  at(index: number): number | undefined {
    if (!Number.isInteger(index) || index < 0) {
      return undefined;
    }
    return this.#bytes[index];
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.#bytes);
  }

  toJSON(): HolmBytesTag {
    return { $holm: "bytes", data: encodeBase64(this.#bytes) };
  }

  [Symbol.iterator](): Iterator<number> {
    return this.#bytes[Symbol.iterator]();
  }
}

export function createReadonlyBytes(input: ArrayLike<number> | Iterable<number>): ReadonlyBytes {
  const bytes = materializeBytes(input);
  return new HolmReadonlyBytes(bytes);
}

export function isReadonlyBytes(value: unknown): value is ReadonlyBytes {
  return value instanceof HolmReadonlyBytes;
}

export function isWireValue(value: unknown): value is WireValue {
  try {
    copyWireValue(value);
    return true;
  } catch {
    return false;
  }
}

export function assertWireValue(value: unknown): asserts value is WireValue {
  copyWireValue(value);
}

export function copyWireValue(value: unknown): WireValue {
  return copyValidated(value, new WeakSet<object>(), "$");
}

export function canonicalEncodeWireValue(value: unknown): string {
  return encodeCanonical(copyWireValue(value));
}

function copyValidated(value: unknown, seen: WeakSet<object>, path: string): WireValue {
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

  const input = value as Record<string, unknown>;
  const output: Record<string, WireValue> = {};
  for (const key of Object.keys(input)) {
    if (key === "$holm") {
      throw invalidWireValue(`${path}.$holm`, "the $holm key is reserved for SDK wire tags");
    }
    output[key] = copyValidated(input[key], seen, `${path}.${key}`);
  }
  return Object.freeze(output);
}

function isHolmBytesTag(value: object): value is HolmBytesTag {
  const input = value as Record<string, unknown>;
  const keys = Object.keys(input);
  return keys.length === 2 && input.$holm === "bytes" && typeof input.data === "string";
}

function markSeen(value: object, seen: WeakSet<object>, path: string): void {
  if (seen.has(value)) {
    throw invalidWireValue(path, "cycle or shared reference is not wire-serializable");
  }
  seen.add(value);
}

function encodeCanonical(value: WireValue): string {
  if (value === null || typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (isReadonlyBytes(value)) {
    return `{"$holm":"bytes","data":${JSON.stringify(value.toJSON().data)}}`;
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => encodeCanonical(item)).join(",")}]`;
  }
  const object = value as WireObject;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${encodeCanonical(object[key] as WireValue)}`)
    .join(",")}}`;
}

function materializeBytes(input: ArrayLike<number> | Iterable<number>): readonly number[] {
  const values = hasArrayLikeLength(input) ? materializeArrayLike(input) : [...input];
  return values.map((value, index) => validateByte(value, index));
}

function hasArrayLikeLength(input: ArrayLike<number> | Iterable<number>): input is ArrayLike<number> {
  return typeof (input as { readonly length?: unknown }).length === "number";
}

function materializeArrayLike(input: ArrayLike<number>): readonly number[] {
  const values: number[] = [];
  for (let index = 0; index < input.length; index += 1) {
    values.push(input[index] as number);
  }
  return values;
}

function validateByte(value: number, index: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw invalidWireValue(`byte[${index}]`, "bytes must be integers from 0 to 255");
  }
  return value;
}

function encodeBase64(bytes: readonly number[]): string {
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const remaining = bytes.length - index;
    const first = bytes[index] as number;
    const second = remaining > 1 ? (bytes[index + 1] as number) : 0;
    const third = remaining > 2 ? (bytes[index + 2] as number) : 0;
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

function decodeBase64(value: string): readonly number[] {
  if (!/^[A-Za-z0-9+/]*$/.test(value) || value.length % 4 === 1) {
    throw invalidWireValue("$.data", "bytes data must be canonical unpadded base64");
  }

  const bytes: number[] = [];
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

function decodeBase64Char(value: string): number {
  const decoded = base64Values.get(value);
  if (decoded === undefined) {
    throw invalidWireValue("$.data", "bytes data must be canonical unpadded base64");
  }
  return decoded;
}

function invalidWireValue(path: string, reason: string): HolmError {
  return new HolmError({
    kind: "serialization",
    code: "invalid_wire_value",
    message: `Invalid wire value at ${path}: ${reason}.`,
  });
}
