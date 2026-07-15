export {
  createTransportCache,
  createTransportCacheKey,
} from "./cache.js";
export { decodeTransportResponse, ProtocolError, RemoteError } from "./response.js";
export {
  UploadError,
  composeResumableUpload,
  createReadonlyBytesUploadSource,
  createUploadFile,
  redactUploadChunk,
  redactUploadRequest,
} from "./upload.js";
export type {
  RedactedUploadChunkDiagnostic,
  RedactedUploadDiagnostic,
  RedactedUploadFieldDiagnostic,
  RedactedUploadFileDiagnostic,
  ResumableUploadAdapter,
  UploadChunk,
  UploadChunkAck,
  UploadChunkBody,
  UploadChunkInput,
  UploadCompletion,
  UploadControl,
  UploadErrorOptions,
  UploadField,
  UploadFieldInput,
  UploadFile,
  UploadFileInput,
  UploadFinalizeInput,
  UploadHandoff,
  UploadHandoffEntry,
  UploadProgressEvent,
  UploadProgressListener,
  UploadRequest,
  UploadSession,
  UploadSource,
  UploadStatus,
  UploadStatusInput,
  UploadUnavailableSession,
} from "./upload.js";
export type {
  TransportCache,
  TransportCacheBackgroundErrorEvent,
  TransportCacheGetInput,
  TransportCacheInvalidationEvent,
  TransportCacheInvalidationInput,
  TransportCacheInvalidationReason,
  TransportCacheInvalidationResult,
  TransportCacheKeyInput,
  TransportCacheLoader,
  TransportCacheMode,
  TransportCacheMutationInvalidation,
  TransportCacheOptions,
  TransportCachePartition,
  TransportCachePolicy,
  TransportCacheUpdateEvent,
} from "./cache.js";

import { CancelledError } from "../core/cancellation.js";
import { HolmError } from "../core/errors.js";
import type { CancellationSignal } from "../core/runtime.js";
import {
  canonicalEncodeWireValue,
  copyWireValue,
  createReadonlyBytes,
  type ReadonlyBytes,
  type WireObject,
  type WireValue,
} from "../core/wire-value.js";
import {
  addSensitiveTransportHeader,
  createOpaqueTransportKey,
  normalizeTransportSensitivity,
  redactTransportRequestMetadata,
} from "./sensitivity.js";

export type TransportResponseMode = "json" | "raw" | "binary";
export type TransportMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | string;
export type TransportHeaders = { readonly [name: string]: string };
export type TransportParams = { readonly [name: string]: string | number | boolean | null };

export interface TransportSensitivityInput {
  readonly url?: boolean;
  readonly params?: readonly string[];
  readonly headers?: readonly string[];
}

export interface TransportSensitivity {
  readonly url: boolean;
  readonly params: readonly string[];
  readonly headers: readonly string[];
}

export interface JsonTransportBody {
  readonly mode: "json";
  readonly value: WireValue;
}

export interface RawTransportBody {
  readonly mode: "raw";
  readonly value: string;
}

export interface BinaryTransportBody {
  readonly mode: "binary";
  readonly value: ReadonlyBytes;
}

export type TransportBody = JsonTransportBody | RawTransportBody | BinaryTransportBody;

export interface TransportRequestInput {
  readonly method: string;
  readonly url: string;
  readonly params?: TransportParams;
  readonly headers?: TransportHeaders;
  readonly body?: TransportBodyInput;
  readonly responseMode?: TransportResponseMode;
  readonly timeoutMs?: number;
  readonly sensitive?: TransportSensitivityInput;
}

export interface TransportRequest {
  readonly method: TransportMethod;
  readonly url: string;
  readonly params: TransportParams;
  readonly headers: TransportHeaders;
  readonly body?: TransportBody;
  readonly responseMode: TransportResponseMode;
  readonly timeoutMs?: number;
  readonly sensitive: TransportSensitivity;
}

export type TransportBodyInput =
  | { readonly mode: "json"; readonly value: unknown }
  | { readonly mode: "raw"; readonly value: string }
  | { readonly mode: "binary"; readonly value: ArrayLike<number> | Iterable<number> | ReadonlyBytes };

export interface EncodedTransportBody {
  readonly contentType: string;
  readonly body: string | ReadonlyBytes;
}

export interface TransportResponseInput {
  readonly requestId: string;
  readonly status: number;
  readonly body: unknown;
  readonly responseMode: TransportResponseMode;
  readonly headers?: TransportHeaders;
  readonly url?: string;
}

export type TransportAuthProof = WebSessionTransportAuthProof | BearerTransportAuthProof | HeaderTransportAuthProof;

export interface WebSessionTransportAuthProof {
  readonly kind: "web-session";
  readonly credentials: "same-origin" | "include" | "omit";
}

export interface BearerTransportAuthProof {
  readonly kind: "bearer";
  readonly scheme: string;
  readonly token: string;
}

export interface HeaderTransportAuthProof {
  readonly kind: "header";
  readonly name: string;
  readonly value: string;
}

export interface TransportAuthProvider {
  current(): TransportAuthProof | undefined | Promise<TransportAuthProof | undefined>;
}

export interface RedactedTransportAuthProof {
  readonly kind: "web-session" | "bearer" | "header";
  readonly credentials?: "same-origin" | "include" | "omit";
  readonly scheme?: string;
  readonly header?: string;
}

export interface RedactedTransportDiagnostic {
  readonly method: TransportMethod;
  readonly url: string;
  readonly params: TransportParams;
  readonly headers: TransportHeaders;
  readonly body?: WireValue;
  readonly responseMode: TransportResponseMode;
  readonly timeoutMs?: number;
  readonly auth?: RedactedTransportAuthProof;
}

export interface AuthenticatedTransportRequest {
  readonly request: TransportRequest;
  readonly privateProof: TransportAuthProof | undefined;
  readonly diagnostic: RedactedTransportDiagnostic;
}

export interface TransportErrorOptions {
  readonly code?: string;
  readonly message?: string;
  readonly details?: unknown;
  readonly retryable?: boolean;
  readonly cause?: unknown;
}

export interface RemoteErrorOptions {
  readonly code: string;
  readonly message: string;
  readonly status: number;
  readonly details?: unknown;
  readonly retryable?: boolean;
  readonly cause?: unknown;
}

export interface ProtocolErrorOptions {
  readonly code?: string;
  readonly message?: string;
  readonly details?: unknown;
  readonly cause?: unknown;
}

export interface NormalizeTransportErrorContext {
  readonly request?: TransportRequest;
  readonly cancellation?: CancellationSignal;
}

export class TransportError extends HolmError {
  constructor(options: TransportErrorOptions = {}) {
    super({
      kind: "transport",
      code: options.code ?? "transport_failure",
      message: options.message ?? "Transport request failed.",
      details: options.details,
      retryable: options.retryable ?? true,
      cause: options.cause,
    });
    this.name = "TransportError";
  }
}

export function createTransportRequest(input: TransportRequestInput): TransportRequest {
  const method = normalizeMethod(input.method);
  const url = normalizeUrl(input.url);
  const params = normalizeParams(input.params ?? {});
  const headers = normalizeHeaders(input.headers ?? {});
  const responseMode = normalizeResponseMode(input.responseMode ?? "json");
  validateTimeout(input.timeoutMs);

  return Object.freeze({
    method,
    url,
    params,
    headers,
    ...(input.body === undefined ? {} : { body: normalizeBody(input.body) }),
    responseMode,
    ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs }),
    sensitive: normalizeTransportSensitivity(input.sensitive),
  });
}

export function canonicalTransportKey(request: TransportRequest): string {
  return createOpaqueTransportKey(request);
}

export function encodeTransportBody(body: TransportBodyInput): EncodedTransportBody {
  const normalized = normalizeBody(body);
  switch (normalized.mode) {
    case "json":
      return Object.freeze({
        contentType: "application/json",
        body: canonicalEncodeWireValue(normalized.value),
      });
    case "raw":
      return Object.freeze({ contentType: "text/plain;charset=utf-8", body: normalized.value });
    case "binary":
      return Object.freeze({ contentType: "application/octet-stream", body: createReadonlyBytes(normalized.value) });
  }
}

export function normalizeTransportError(error: unknown, context: NormalizeTransportErrorContext = {}): HolmError {
  if (error instanceof HolmError) {
    return error;
  }
  if (context.cancellation?.cancelled) {
    return new CancelledError(
      context.cancellation.reason === undefined ? {} : { reason: context.cancellation.reason },
    );
  }
  if (isAbortLike(error)) {
    return new CancelledError({ reason: "aborted" });
  }
  return new TransportError({
    details: Object.freeze({
      thrown: describeThrown(error),
      ...(context.request === undefined ? {} : { request: redactTransportRequest(context.request) }),
    }),
    cause: error,
  });
}

export async function applyTransportAuth(
  request: TransportRequest,
  provider: TransportAuthProvider,
): Promise<AuthenticatedTransportRequest> {
  const proof = await provider.current();
  if (proof === undefined) {
    return Object.freeze({ request, privateProof: undefined, diagnostic: redactTransportRequest(request) });
  }
  const privateProof = normalizeAuthProof(proof);
  const authenticated = Object.freeze({
    ...request,
    headers: applyProofToHeaders(request.headers, privateProof),
    sensitive: applyProofSensitivity(request.sensitive, privateProof),
  }) satisfies TransportRequest;
  return Object.freeze({
    request: authenticated,
    privateProof,
    diagnostic: redactAuthenticatedRequest(authenticated, privateProof),
  });
}

export function redactTransportRequest(request: TransportRequest): RedactedTransportDiagnostic {
  return redactTransportRequestMetadata(request);
}

export function redactAuthenticatedTransport(applied: AuthenticatedTransportRequest): RedactedTransportDiagnostic {
  return applied.diagnostic;
}

function redactAuthenticatedRequest(
  request: TransportRequest,
  proof: TransportAuthProof,
): RedactedTransportDiagnostic {
  return Object.freeze({
    ...redactTransportRequest(request),
    auth: redactAuthProof(proof),
  });
}

function normalizeMethod(method: string): TransportMethod {
  const normalized = method.trim().toUpperCase();
  if (normalized === "") {
    throw new TypeError("Transport method must be a non-empty string.");
  }
  return normalized;
}

function normalizeUrl(url: string): string {
  const normalized = url.trim();
  if (normalized === "") {
    throw new TypeError("Transport URL must be a non-empty string.");
  }
  return normalized;
}

function normalizeParams(params: TransportParams): TransportParams {
  const normalized: Record<string, string | number | boolean | null> = {};
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value === null || typeof value === "string" || typeof value === "boolean") {
      normalized[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      normalized[key] = value;
    } else {
      throw new TypeError(`Transport param ${key} must be a finite scalar value.`);
    }
  }
  return Object.freeze(normalized);
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

function normalizeResponseMode(mode: TransportResponseMode): TransportResponseMode {
  if (mode !== "json" && mode !== "raw" && mode !== "binary") {
    throw new TypeError(`Unknown transport response mode: ${String(mode)}`);
  }
  return mode;
}

function normalizeBody(body: TransportBodyInput): TransportBody {
  switch (body.mode) {
    case "json":
      return Object.freeze({ mode: "json", value: copyWireValue(body.value) });
    case "raw":
      if (typeof body.value !== "string") {
        throw new TypeError("Raw transport body must be a string.");
      }
      return Object.freeze({ mode: "raw", value: body.value });
    case "binary":
      return Object.freeze({ mode: "binary", value: createReadonlyBytes(body.value) });
  }
}

function validateTimeout(timeoutMs: number | undefined): void {
  if (timeoutMs !== undefined && (!Number.isFinite(timeoutMs) || timeoutMs < 0)) {
    throw new TypeError("Transport timeout must be a non-negative finite number.");
  }
}

function normalizeAuthProof(proof: TransportAuthProof): TransportAuthProof {
  switch (proof.kind) {
    case "web-session":
      if (proof.credentials !== "same-origin" && proof.credentials !== "include" && proof.credentials !== "omit") {
        throw new TypeError("Web session credentials must be same-origin, include, or omit.");
      }
      return Object.freeze({ kind: "web-session", credentials: proof.credentials });
    case "bearer":
      return Object.freeze({ kind: "bearer", scheme: normalizeTokenPart(proof.scheme, "scheme"), token: normalizeTokenPart(proof.token, "token") });
    case "header":
      return Object.freeze({ kind: "header", name: normalizeHeaderName(proof.name), value: normalizeTokenPart(proof.value, "header value") });
  }
}

function applyProofToHeaders(headers: TransportHeaders, proof: TransportAuthProof): TransportHeaders {
  switch (proof.kind) {
    case "web-session":
      return headers;
    case "bearer":
      return normalizeHeaders({ ...headers, authorization: `${proof.scheme} ${proof.token}` });
    case "header":
      return normalizeHeaders({ ...headers, [proof.name]: proof.value });
  }
}

function applyProofSensitivity(
  sensitivity: TransportSensitivity,
  proof: TransportAuthProof,
): TransportSensitivity {
  switch (proof.kind) {
    case "web-session":
      return sensitivity;
    case "bearer":
      return addSensitiveTransportHeader(sensitivity, "authorization");
    case "header":
      return addSensitiveTransportHeader(sensitivity, proof.name);
  }
}

function redactAuthProof(proof: TransportAuthProof): RedactedTransportAuthProof {
  switch (proof.kind) {
    case "web-session":
      return Object.freeze({ kind: "web-session", credentials: proof.credentials });
    case "bearer":
      return Object.freeze({ kind: "bearer", scheme: proof.scheme });
    case "header":
      return Object.freeze({ kind: "header", header: normalizeHeaderName(proof.name) });
  }
}

function normalizeHeaderName(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (normalized === "") {
    throw new TypeError("Auth header name must be non-empty.");
  }
  return normalized;
}

function normalizeTokenPart(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError(`Auth ${label} must be non-empty.`);
  }
  return normalized;
}

function isAbortLike(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const record = error as { readonly name?: unknown; readonly code?: unknown };
  return record.name === "AbortError" || record.code === "ABORT_ERR";
}

function describeThrown(error: unknown): WireObject {
  if (error instanceof Error) {
    return copyWireValue({ kind: "error", name: error.name || "Error" }) as WireObject;
  }
  return copyWireValue({ kind: typeof error }) as WireObject;
}
