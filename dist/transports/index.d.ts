export { createTransportCache, createTransportCacheKey, } from "./cache.js";
export { UploadError, composeResumableUpload, createReadonlyBytesUploadSource, createUploadFile, redactUploadChunk, redactUploadRequest, } from "./upload.js";
export type { RedactedUploadChunkDiagnostic, RedactedUploadDiagnostic, RedactedUploadFieldDiagnostic, RedactedUploadFileDiagnostic, ResumableUploadAdapter, UploadChunk, UploadChunkAck, UploadChunkBody, UploadChunkInput, UploadCompletion, UploadControl, UploadErrorOptions, UploadField, UploadFieldInput, UploadFile, UploadFileInput, UploadFinalizeInput, UploadHandoff, UploadHandoffEntry, UploadProgressEvent, UploadProgressListener, UploadRequest, UploadSession, UploadSource, UploadStatus, UploadStatusInput, UploadUnavailableSession, } from "./upload.js";
export type { TransportCache, TransportCacheBackgroundErrorEvent, TransportCacheGetInput, TransportCacheInvalidationEvent, TransportCacheInvalidationInput, TransportCacheInvalidationReason, TransportCacheInvalidationResult, TransportCacheKeyInput, TransportCacheLoader, TransportCacheMode, TransportCacheMutationInvalidation, TransportCacheOptions, TransportCachePartition, TransportCachePolicy, TransportCacheUpdateEvent, } from "./cache.js";
import { HolmError } from "../core/errors.js";
import type { CancellationSignal, OperationResponse } from "../core/runtime.js";
import { type ReadonlyBytes, type WireValue } from "../core/wire-value.js";
export type TransportResponseMode = "json" | "raw" | "binary";
export type TransportMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | string;
export type TransportHeaders = {
    readonly [name: string]: string;
};
export type TransportParams = {
    readonly [name: string]: string | number | boolean | null;
};
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
}
export interface TransportRequest {
    readonly method: TransportMethod;
    readonly url: string;
    readonly params: TransportParams;
    readonly headers: TransportHeaders;
    readonly body?: TransportBody;
    readonly responseMode: TransportResponseMode;
    readonly timeoutMs?: number;
}
export type TransportBodyInput = {
    readonly mode: "json";
    readonly value: unknown;
} | {
    readonly mode: "raw";
    readonly value: string;
} | {
    readonly mode: "binary";
    readonly value: ArrayLike<number> | Iterable<number> | ReadonlyBytes;
};
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
export declare class TransportError extends HolmError {
    constructor(options?: TransportErrorOptions);
}
export declare class RemoteError extends HolmError {
    constructor(options: RemoteErrorOptions);
}
export declare class ProtocolError extends HolmError {
    constructor(options?: ProtocolErrorOptions);
}
export declare function createTransportRequest(input: TransportRequestInput): TransportRequest;
export declare function canonicalTransportKey(request: TransportRequest): string;
export declare function encodeTransportBody(body: TransportBodyInput): EncodedTransportBody;
export declare function decodeTransportResponse(input: TransportResponseInput): OperationResponse;
export declare function normalizeTransportError(error: unknown, context?: NormalizeTransportErrorContext): HolmError;
export declare function applyTransportAuth(request: TransportRequest, provider: TransportAuthProvider): Promise<AuthenticatedTransportRequest>;
export declare function redactTransportRequest(request: TransportRequest): RedactedTransportDiagnostic;
export declare function redactAuthenticatedTransport(applied: AuthenticatedTransportRequest): RedactedTransportDiagnostic;
//# sourceMappingURL=index.d.ts.map