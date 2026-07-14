import { HolmError } from "../core/errors.js";
import type { CancellationSignal } from "../core/runtime.js";
import { type ReadonlyBytes, type WireValue } from "../core/wire-value.js";
export interface UploadProgressEvent {
    readonly loaded: number;
    readonly total: number;
    readonly percent: number;
}
export type UploadProgressListener = (event: UploadProgressEvent) => void;
export interface UploadField {
    readonly name: string;
    readonly value: WireValue;
}
export interface UploadChunkBody {
    readonly byteLength: number;
}
export interface UploadChunk<Body extends UploadChunkBody = UploadChunkBody> {
    readonly byteLength: number;
    readonly body: Body;
}
export interface UploadSource<Body extends UploadChunkBody = UploadChunkBody> {
    readonly byteLength: number;
    slice(start: number, end: number): UploadChunk<Body> | Promise<UploadChunk<Body>>;
}
export interface UploadFile<Body extends UploadChunkBody = UploadChunkBody> {
    readonly field: string;
    readonly name: string;
    readonly type: string;
    readonly size: number;
    readonly source: UploadSource<Body>;
}
export interface UploadFileInput<Body extends UploadChunkBody = UploadChunkBody> {
    readonly field: string;
    readonly name: string;
    readonly type?: string;
    readonly size?: number;
    readonly source: UploadSource<Body>;
}
export interface UploadFieldInput {
    readonly name: string;
    readonly value: unknown;
}
export interface UploadRequest<Body extends UploadChunkBody = UploadChunkBody> {
    readonly path: string;
    readonly fields?: readonly UploadFieldInput[];
    readonly files: readonly UploadFile<Body>[];
    readonly signal?: CancellationSignal;
    readonly onProgress?: UploadProgressListener;
}
export interface UploadSession {
    readonly id: string;
    readonly chunkSize?: number;
    readonly receivedBytes?: number;
    readonly nextOffset?: number;
}
export interface UploadUnavailableSession {
    readonly unavailable: true;
}
export interface UploadStatus {
    readonly receivedBytes?: number;
    readonly nextOffset?: number;
}
export interface UploadChunkAck extends UploadStatus {
    readonly complete?: boolean;
}
export interface UploadCompletion {
    readonly id?: string;
    readonly uploadId?: string;
    readonly tempRef?: string;
    readonly temp_ref?: string;
    readonly name?: string;
    readonly type?: string;
    readonly mimeType?: string;
    readonly mime_type?: string;
    readonly size?: number;
    readonly sizeBytes?: number;
    readonly size_bytes?: number;
}
export interface UploadHandoffEntry {
    readonly upload_id: string;
    readonly temp_ref?: string;
    readonly name: string;
    readonly type: string;
    readonly size: number;
}
export type UploadHandoff = {
    readonly [field: string]: UploadHandoffEntry;
};
export interface UploadControl {
    readonly path: string;
    readonly signal?: CancellationSignal;
}
export interface UploadChunkInput<Body extends UploadChunkBody = UploadChunkBody> {
    readonly path: string;
    readonly file: UploadFile<Body>;
    readonly session: UploadSession;
    readonly offset: number;
    readonly chunk: UploadChunk<Body>;
}
export interface UploadStatusInput<Body extends UploadChunkBody = UploadChunkBody> {
    readonly path: string;
    readonly file: UploadFile<Body>;
    readonly session: UploadSession;
    readonly offset: number;
}
export interface UploadFinalizeInput<Body extends UploadChunkBody = UploadChunkBody> {
    readonly path: string;
    readonly fields: readonly UploadField[];
    readonly files: readonly UploadFile<Body>[];
    readonly handoff: UploadHandoff;
}
export interface ResumableUploadAdapter<Result = UploadHandoff, Body extends UploadChunkBody = UploadChunkBody> {
    createSession(file: UploadFile<Body>, control: UploadControl): UploadSession | UploadUnavailableSession | Promise<UploadSession | UploadUnavailableSession>;
    uploadChunk(input: UploadChunkInput<Body>, control: UploadControl): UploadChunkAck | Promise<UploadChunkAck>;
    fetchStatus?(input: UploadStatusInput<Body>, control: UploadControl): UploadStatus | Promise<UploadStatus>;
    completeSession(file: UploadFile<Body>, session: UploadSession, control: UploadControl): UploadCompletion | Promise<UploadCompletion>;
    finalize?(input: UploadFinalizeInput<Body>, control: UploadControl): Result | Promise<Result>;
}
export interface UploadErrorOptions {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
    readonly retryable?: boolean;
    readonly cause?: unknown;
}
export declare class UploadError extends HolmError {
    constructor(options: UploadErrorOptions);
}
export interface RedactedUploadFieldDiagnostic {
    readonly name: string;
    readonly value: "[redacted]";
}
export interface RedactedUploadFileDiagnostic {
    readonly field: string;
    readonly name: string;
    readonly type: string;
    readonly size: number;
}
export interface RedactedUploadDiagnostic {
    readonly path: string;
    readonly fields: readonly RedactedUploadFieldDiagnostic[];
    readonly files: readonly RedactedUploadFileDiagnostic[];
    readonly totalBytes: number;
}
export interface RedactedUploadChunkDiagnostic {
    readonly byteLength: number;
}
export declare function createReadonlyBytesUploadSource(input: ArrayLike<number> | Iterable<number> | ReadonlyBytes): UploadSource<ReadonlyBytes>;
export declare function createUploadFile<Body extends UploadChunkBody = UploadChunkBody>(input: UploadFileInput<Body>): UploadFile<Body>;
export declare function redactUploadRequest<Body extends UploadChunkBody = UploadChunkBody>(input: UploadRequest<Body>): RedactedUploadDiagnostic;
export declare function redactUploadChunk(chunk: UploadChunk): RedactedUploadChunkDiagnostic;
export declare function composeResumableUpload<Result = UploadHandoff, Body extends UploadChunkBody = UploadChunkBody>(input: UploadRequest<Body>, adapter: ResumableUploadAdapter<Result, Body>): Promise<Result>;
//# sourceMappingURL=upload.d.ts.map