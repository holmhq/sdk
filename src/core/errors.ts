import type { WireValue } from "./wire-value.js";

export type HolmErrorKind =
  | "capability"
  | "transport"
  | "remote"
  | "protocol"
  | "serialization"
  | "cancellation"
  | "timeout"
  | "lifecycle"
  | "extension";

export interface HolmErrorOptions {
  readonly kind: HolmErrorKind;
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
  readonly status?: number;
  readonly retryable?: boolean;
  readonly cause?: unknown;
}

export interface SerializedHolmError {
  readonly $holm: "error";
  readonly kind: HolmErrorKind;
  readonly code: string;
  readonly message: string;
  readonly details?: WireValue;
  readonly status?: number;
  readonly retryable?: boolean;
}

const errorKinds: readonly HolmErrorKind[] = [
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
  readonly kind: HolmErrorKind;
  readonly code: string;
  readonly details?: unknown;
  readonly status?: number;
  readonly retryable?: boolean;

  constructor(options: HolmErrorOptions) {
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

  toJSON(): SerializedHolmError {
    const serialized: {
      $holm: "error";
      kind: HolmErrorKind;
      code: string;
      message: string;
      details?: WireValue;
      status?: number;
      retryable?: boolean;
    } = {
      $holm: "error",
      kind: this.kind,
      code: this.code,
      message: this.message,
    };

    const details = redactDetail(this.details, new WeakSet<object>());
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

export function isHolmError(value: unknown): value is HolmError {
  return value instanceof HolmError;
}

export function serializeHolmError(value: unknown): SerializedHolmError {
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

function validateOptions(options: HolmErrorOptions): void {
  if (!errorKinds.includes(options.kind)) {
    throw new TypeError(`Unknown Holm error kind: ${String(options.kind)}`);
  }
  if (options.code.trim() === "") {
    throw new TypeError("Holm error code must be a non-empty string.");
  }
  if (options.message.trim() === "") {
    throw new TypeError("Holm error message must be a non-empty string.");
  }
  if (
    options.status !== undefined &&
    (!Number.isInteger(options.status) || options.status < 100 || options.status > 599)
  ) {
    throw new TypeError("Holm remote error status must be an integer HTTP status.");
  }
  if (options.retryable !== undefined && typeof options.retryable !== "boolean") {
    throw new TypeError("Holm error retryable must be boolean when provided.");
  }
}

function describeUnknownError(value: unknown): WireValue {
  if (typeof value === "string" && value.trim() !== "") {
    return { thrown: "string" };
  }
  if (value instanceof Error) {
    return { thrown: "error", name: value.name || "Error" };
  }
  return { thrown: typeof value };
}

function redactDetail(value: unknown, seen: WeakSet<object>): WireValue | undefined {
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
    return value as WireValue;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return unserializable;
    }
    seen.add(value);
    return Object.freeze(
      value.map((item) => {
        const redactedItem = redactDetail(item, seen);
        return redactedItem === undefined ? unserializable : redactedItem;
      }),
    );
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

  const output: Record<string, WireValue> = {};
  const input = value as Record<string, unknown>;
  for (const key of Object.keys(input)) {
    if (sensitiveKeyPattern.test(key)) {
      output[key] = redacted;
    } else {
      const redactedValue = redactDetail(input[key], seen);
      output[key] = redactedValue === undefined ? unserializable : redactedValue;
    }
  }
  return Object.freeze(output);
}

function isReadonlyBytesLike(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { readonly $holm?: unknown }).$holm === "bytes" &&
    typeof (value as { readonly toUint8Array?: unknown }).toUint8Array === "function" &&
    typeof (value as { readonly toJSON?: unknown }).toJSON === "function"
  );
}
