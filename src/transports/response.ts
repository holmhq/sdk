import { HolmError } from "../core/errors.js";
import type { OperationResponse } from "../core/runtime.js";
import {
  copyWireValue,
  createReadonlyBytes,
  isReadonlyBytes,
  type WireObject,
  type WireValue,
} from "../core/wire-value.js";
import type {
  ProtocolErrorOptions,
  RemoteErrorOptions,
  TransportHeaders,
  TransportResponseInput,
  TransportResponseMode,
} from "./index.js";

export class RemoteError extends HolmError {
  constructor(options: RemoteErrorOptions) {
    super({
      kind: "remote",
      code: options.code,
      message: options.message,
      status: options.status,
      ...(options.details === undefined ? {} : { details: options.details }),
      ...(options.retryable === undefined ? {} : { retryable: options.retryable }),
      ...(options.cause === undefined ? {} : { cause: options.cause }),
    });
    this.name = "RemoteError";
  }
}

export class ProtocolError extends HolmError {
  constructor(options: ProtocolErrorOptions = {}) {
    super({
      kind: "protocol",
      code: options.code ?? "invalid_transport_response",
      message: options.message ?? "Invalid transport response.",
      details: options.details,
      cause: options.cause,
    });
    this.name = "ProtocolError";
  }
}

export function decodeTransportResponse(input: TransportResponseInput): OperationResponse {
  const status = normalizeStatus(input.status);
  const responseMode = normalizeResponseMode(input.responseMode);
  const headers = normalizeHeaders(input.headers ?? {});
  if (responseMode === "json") {
    return decodeJsonTransportResponse(input, status, headers);
  }
  if (status < 200 || status > 299) {
    throw createRemoteError(input, status);
  }
  return Object.freeze({
    requestId: input.requestId,
    payload: decodeResponsePayload(input.body, responseMode),
    metadata: createResponseMetadata(status, headers),
  });
}

function normalizeStatus(status: number): number {
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    throw new ProtocolError({
      code: "invalid_transport_status",
      message: "Transport response status must be an integer HTTP status.",
      details: { status },
    });
  }
  return status;
}

function normalizeResponseMode(mode: TransportResponseMode): TransportResponseMode {
  if (mode !== "json" && mode !== "raw" && mode !== "binary") {
    throw new TypeError(`Unknown transport response mode: ${String(mode)}`);
  }
  return mode;
}

function normalizeHeaders(headers: TransportHeaders): TransportHeaders {
  const normalized: Record<string, string> = {};
  for (const key of Object.keys(headers).sort()) {
    const name = key.trim().toLowerCase();
    const value = headers[key]?.trim();
    if (name === "" || value === undefined) {
      throw new TypeError("Transport headers must have non-empty names and string values.");
    }
    normalized[name] = value;
  }
  return Object.freeze(normalized);
}

function decodeJsonTransportResponse(
  input: TransportResponseInput,
  status: number,
  headers: TransportHeaders,
): OperationResponse {
  let decoded: WireValue;
  try {
    decoded = decodeResponsePayload(input.body, "json");
  } catch (cause) {
    if (status < 200 || status > 299) {
      throw createRemoteError(input, status);
    }
    throw cause;
  }
  const errorEnvelope = extractRemoteErrorEnvelope(decoded, "holm.remote_error", "Remote operation failed.");
  if (errorEnvelope !== undefined) {
    throw remoteErrorFromEnvelope(status, errorEnvelope);
  }
  if (status < 200 || status > 299) {
    throw createRemoteError(input, status, decoded);
  }

  // Holm branch: canonical JSON API responses wrap successful payloads in {data,meta};
  // keep non-envelope JSON payloads intact for existing adapter compatibility.
  const envelope = unwrapHolmSuccessEnvelope(decoded);
  let payload = envelope.payload;
  if (isCommandPath(input.url)) {
    // Holm branch: /api/cmd can return HTTP 200 while the nested command envelope failed.
    const commandError = extractCommandErrorEnvelope(payload);
    if (commandError !== undefined) {
      throw remoteErrorFromEnvelope(status, commandError);
    }
    payload = unwrapCommandSuccessEnvelope(payload);
  }

  return Object.freeze({
    requestId: input.requestId,
    payload,
    metadata: createResponseMetadata(status, headers, envelope.meta),
  });
}

function createResponseMetadata(status: number, headers: TransportHeaders, meta?: WireValue): WireObject {
  const metadata: Record<string, WireValue> = { status };
  if (meta !== undefined) {
    metadata.meta = copyWireValue(meta);
  }
  if (Object.keys(headers).length > 0) {
    metadata.headers = copyWireValue(headers);
  }
  return Object.freeze(metadata);
}

function decodeResponsePayload(body: unknown, mode: TransportResponseMode): WireValue {
  switch (mode) {
    case "json":
      if (typeof body !== "string" || body.trim() === "") {
        throw new ProtocolError({ details: { mode, reason: "json response body must be a non-empty string" } });
      }
      return parseJsonWireValue(body);
    case "raw":
      if (typeof body !== "string") {
        throw new ProtocolError({ details: { mode, reason: "raw response body must be a string" } });
      }
      return body;
    case "binary":
      if (isReadonlyBytes(body)) {
        return createReadonlyBytes(body);
      }
      if (isByteInput(body)) {
        return createReadonlyBytes(body);
      }
      throw new ProtocolError({ details: { mode, reason: "binary response body must be bytes" } });
  }
}

function parseJsonWireValue(body: string): WireValue {
  try {
    return copyWireValue(JSON.parse(body));
  } catch (cause) {
    throw new ProtocolError({ details: { mode: "json", reason: "invalid JSON wire value" }, cause });
  }
}

function createRemoteError(input: TransportResponseInput, status: number, decoded?: WireValue): RemoteError {
  return remoteErrorFromEnvelope(status, parseRemoteEnvelope(decoded ?? input.body));
}

interface RemoteEnvelope {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
  readonly retryable?: boolean;
}

function remoteErrorFromEnvelope(status: number, envelope: RemoteEnvelope): RemoteError {
  return new RemoteError({
    status,
    code: envelope.code,
    message: envelope.message,
    ...(envelope.details === undefined ? {} : { details: envelope.details }),
    ...(envelope.retryable === undefined ? {} : { retryable: envelope.retryable }),
  });
}

function parseRemoteEnvelope(body: unknown): RemoteEnvelope {
  if (typeof body === "string") {
    if (body.trim() === "") {
      return { code: "holm.remote_error", message: "Remote operation failed." };
    }
    try {
      return parseRemoteEnvelope(JSON.parse(body));
    } catch {
      return { code: "holm.remote_error", message: "Remote operation failed." };
    }
  }
  return extractRemoteErrorEnvelope(body, "holm.remote_error", "Remote operation failed.") ??
    parseFlatRemoteEnvelope(body, "holm.remote_error", "Remote operation failed.");
}

function unwrapHolmSuccessEnvelope(payload: WireValue): { readonly payload: WireValue; readonly meta?: WireValue } {
  if (!isPlainObject(payload) || !Object.hasOwn(payload, "data")) {
    return { payload };
  }
  return {
    payload: copyWireValue(payload.data),
    ...(Object.hasOwn(payload, "meta") ? { meta: copyWireValue(payload.meta) } : {}),
  };
}

function extractRemoteErrorEnvelope(
  payload: unknown,
  fallbackCode: string,
  fallbackMessage: string,
): RemoteEnvelope | undefined {
  if (!isPlainObject(payload)) {
    return undefined;
  }
  if (isPlainObject(payload.error)) {
    return parseFlatRemoteEnvelope(payload.error, fallbackCode, fallbackMessage);
  }
  // Holm branch: generic {data,...} success envelopes may carry arbitrary payload,
  // including nested ok:false; command-failure interpretation is /api/cmd-only (see extractCommandErrorEnvelope).
  return undefined;
}

function extractCommandErrorEnvelope(payload: WireValue): RemoteEnvelope | undefined {
  if (!isPlainObject(payload)) {
    return undefined;
  }
  if (payload.ok === false) {
    return parseFlatRemoteEnvelope(payload, "holm.command_failed", "Command failed.");
  }
  if (payload.success === false) {
    const message = typeof payload.error === "string" && payload.error.trim() !== "" ? payload.error : undefined;
    return parseFlatRemoteEnvelope(
      { ...payload, ...(message === undefined ? {} : { message }) },
      "holm.command_failed",
      "Command failed.",
    );
  }
  return undefined;
}

function unwrapCommandSuccessEnvelope(payload: WireValue): WireValue {
  if (!isPlainObject(payload) || payload.success !== true || !Object.hasOwn(payload, "data")) {
    return payload;
  }
  return copyWireValue(payload.data);
}

function parseFlatRemoteEnvelope(payload: unknown, fallbackCode: string, fallbackMessage: string): RemoteEnvelope {
  if (!isPlainObject(payload)) {
    return { code: fallbackCode, message: fallbackMessage };
  }
  const code = typeof payload.code === "string" && payload.code.trim() !== "" ? payload.code : fallbackCode;
  const message = typeof payload.message === "string" && payload.message.trim() !== "" ? payload.message : fallbackMessage;
  return {
    code,
    message,
    ...(payload.details === undefined ? {} : { details: payload.details }),
    ...(typeof payload.retryable === "boolean" ? { retryable: payload.retryable } : {}),
  };
}

function isCommandPath(url: string | undefined): boolean {
  if (url === undefined) {
    return false;
  }
  const withoutQuery = url.split("?", 1)[0] ?? "";
  const pathStart = withoutQuery.startsWith("http://") || withoutQuery.startsWith("https://")
    ? withoutQuery.indexOf("/", withoutQuery.indexOf("://") + 3)
    : 0;
  const path = pathStart < 0 ? "/" : withoutQuery.slice(pathStart);
  return path === "/api/cmd";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value) || isReadonlyBytes(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isByteInput(value: unknown): value is ArrayLike<number> | Iterable<number> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return typeof (value as { readonly length?: unknown }).length === "number" || Symbol.iterator in value;
}
