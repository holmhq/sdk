import { CancelledError, throwIfCancelled } from "../core/cancellation.js";
import { HolmError } from "../core/errors.js";
import type { CancellationSignal } from "../core/runtime.js";
import {
  copyWireValue,
  createReadonlyBytes,
  type ReadonlyBytes,
  type WireValue,
} from "../core/wire-value.js";

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

export type UploadHandoff = { readonly [field: string]: UploadHandoffEntry };

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

export interface ResumableUploadAdapter<
  Result = UploadHandoff,
  Body extends UploadChunkBody = UploadChunkBody,
> {
  createSession(
    file: UploadFile<Body>,
    control: UploadControl,
  ): UploadSession | UploadUnavailableSession | Promise<UploadSession | UploadUnavailableSession>;
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

interface NormalizedUploadRequest<Body extends UploadChunkBody = UploadChunkBody> {
  readonly path: string;
  readonly fields: readonly UploadField[];
  readonly files: readonly UploadFile<Body>[];
  readonly signal?: CancellationSignal;
  readonly onProgress?: UploadProgressListener;
}

export class UploadError extends HolmError {
  constructor(options: UploadErrorOptions) {
    super({
      kind: "transport",
      code: options.code,
      message: options.message,
      ...(options.details === undefined ? {} : { details: options.details }),
      ...(options.retryable === undefined ? {} : { retryable: options.retryable }),
      ...(options.cause === undefined ? {} : { cause: options.cause }),
    });
    this.name = "UploadError";
  }
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

export function createReadonlyBytesUploadSource(input: ArrayLike<number> | Iterable<number> | ReadonlyBytes): UploadSource<ReadonlyBytes> {
  const bytes = createReadonlyBytes(input);
  return Object.freeze({
    byteLength: bytes.byteLength,
    slice(start: number, end: number): UploadChunk<ReadonlyBytes> {
      const normalized = normalizeSlice(start, end, bytes.byteLength);
      const data = bytes.toUint8Array().slice(normalized.start, normalized.end);
      const body = createReadonlyBytes(data);
      return Object.freeze({ byteLength: body.byteLength, body });
    },
  });
}

export function createUploadFile<Body extends UploadChunkBody = UploadChunkBody>(input: UploadFileInput<Body>): UploadFile<Body> {
  const sourceBytes = normalizeByteCount(input.source.byteLength, "upload source byteLength");
  const size = normalizeByteCount(input.size ?? sourceBytes, "upload file size");
  return Object.freeze({
    field: normalizeUploadName(input.field, "upload field"),
    name: normalizeUploadName(input.name, "upload file name"),
    type: normalizeUploadType(input.type ?? "application/octet-stream"),
    size,
    source: input.source,
  });
}

export function redactUploadRequest<Body extends UploadChunkBody = UploadChunkBody>(input: UploadRequest<Body>): RedactedUploadDiagnostic {
  const fields = normalizeFields(input.fields ?? []).map((field) => Object.freeze({
    name: field.name,
    value: "[redacted]" as const,
  }));
  const files = input.files.map((file) => {
    const normalized = normalizeUploadFile(file);
    return Object.freeze({
      field: normalized.field,
      name: normalized.name,
      type: normalized.type,
      size: normalized.size,
    });
  });
  return Object.freeze({
    path: normalizeUploadPath(input.path),
    fields: Object.freeze(fields),
    files: Object.freeze(files),
    totalBytes: totalUploadBytes(files),
  });
}

export function redactUploadChunk(chunk: UploadChunk): RedactedUploadChunkDiagnostic {
  return Object.freeze({ byteLength: normalizeByteCount(chunk.byteLength, "upload chunk byteLength") });
}

export async function composeResumableUpload<
  Result = UploadHandoff,
  Body extends UploadChunkBody = UploadChunkBody,
>(
  input: UploadRequest<Body>,
  adapter: ResumableUploadAdapter<Result, Body>,
): Promise<Result> {
  const request = normalizeUploadRequest(input);
  const control = createUploadControl(request);
  const handoff: Record<string, UploadHandoffEntry> = {};
  const total = totalUploadBytes(request.files);
  let acknowledgedBytes = 0;
  let lastReportedBytes = -1;

  validateUniqueUploadFields(request.files);

  const emitProgress = (loaded: number): void => {
    const normalizedLoaded = Math.max(0, Math.min(total, loaded));
    if (normalizedLoaded === lastReportedBytes) {
      return;
    }
    lastReportedBytes = normalizedLoaded;
    request.onProgress?.(Object.freeze({
      loaded: normalizedLoaded,
      total,
      percent: total > 0 ? Math.round((normalizedLoaded / total) * 100) : 100,
    }));
  };

  for (const file of request.files) {
    throwIfCancelled(request.signal);
    const session = await adapter.createSession(file, control);
    throwIfCancelled(request.signal);
    if (isUploadUnavailable(session)) {
      throw new UploadError({
        code: "upload_unavailable",
        message: "Resumable uploads are unavailable.",
        retryable: false,
      });
    }

    let offset = initialSessionOffset(session, file.size);
    emitProgress(acknowledgedBytes + offset);

    while (offset < file.size) {
      throwIfCancelled(request.signal);
      const chunkEnd = Math.min(file.size, offset + normalizeChunkSize(session.chunkSize, file.size - offset));
      const chunk = await file.source.slice(offset, chunkEnd);
      validateChunk(chunk, offset, chunkEnd);
      try {
        const ack = await adapter.uploadChunk(
          Object.freeze({ path: request.path, file, session, offset, chunk }),
          control,
        );
        throwIfCancelled(request.signal);
        offset = nextAcknowledgedOffset(ack, offset, chunk.byteLength, file.size);
        emitProgress(acknowledgedBytes + offset);
      } catch (cause) {
        if (request.signal?.cancelled) {
          throw new CancelledError(request.signal.reason === undefined ? {} : { reason: request.signal.reason });
        }
        if (adapter.fetchStatus === undefined) {
          throw cause;
        }
        const status = await adapter.fetchStatus(
          Object.freeze({ path: request.path, file, session, offset }),
          control,
        );
        throwIfCancelled(request.signal);
        const resumedOffset = nextStatusOffset(status, file.size);
        if (resumedOffset <= offset) {
          throw cause;
        }
        offset = resumedOffset;
        emitProgress(acknowledgedBytes + offset);
      }
    }

    const completion = await adapter.completeSession(file, session, control);
    throwIfCancelled(request.signal);
    handoff[file.field] = createHandoffEntry(file, session, completion);
    acknowledgedBytes += file.size;
    emitProgress(acknowledgedBytes);
  }

  const finalized = Object.freeze({
    path: request.path,
    fields: request.fields,
    files: request.files,
    handoff: Object.freeze(handoff),
  });

  if (adapter.finalize === undefined) {
    return finalized.handoff as Result;
  }
  return await adapter.finalize(finalized, control);
}

function normalizeUploadRequest<Body extends UploadChunkBody>(input: UploadRequest<Body>): NormalizedUploadRequest<Body> {
  const files = input.files.map((file) => normalizeUploadFile(file));
  return Object.freeze({
    path: normalizeUploadPath(input.path),
    fields: Object.freeze(normalizeFields(input.fields ?? [])),
    files: Object.freeze(files),
    ...(input.signal === undefined ? {} : { signal: input.signal }),
    ...(input.onProgress === undefined ? {} : { onProgress: input.onProgress }),
  });
}

function normalizeUploadFile<Body extends UploadChunkBody>(file: UploadFile<Body>): UploadFile<Body> {
  return createUploadFile(file);
}

function normalizeFields(fields: readonly UploadFieldInput[]): readonly UploadField[] {
  return Object.freeze(fields.map((field) => Object.freeze({
    name: normalizeUploadName(field.name, "upload field name"),
    value: copyWireValue(field.value),
  })));
}

function createUploadControl(request: Pick<NormalizedUploadRequest, "path" | "signal">): UploadControl {
  return Object.freeze({
    path: request.path,
    ...(request.signal === undefined ? {} : { signal: request.signal }),
  });
}

function validateUniqueUploadFields(files: readonly UploadFile[]): void {
  const seen = new Set<string>();
  for (const file of files) {
    if (seen.has(file.field)) {
      throw new UploadError({
        code: "upload_field_conflict",
        message: `Duplicate upload field: ${file.field}`,
        retryable: false,
      });
    }
    seen.add(file.field);
  }
}

function createHandoffEntry(file: UploadFile, session: UploadSession, completion: UploadCompletion): UploadHandoffEntry {
  const uploadId = normalizeUploadName(completion.uploadId ?? completion.id ?? session.id, "upload id");
  const tempRef = completion.tempRef ?? completion.temp_ref;
  const name = completion.name === undefined ? file.name : normalizeUploadName(completion.name, "upload completion name");
  const type = normalizeUploadType(completion.type ?? completion.mimeType ?? completion.mime_type ?? file.type);
  const size = normalizeByteCount(completion.size ?? completion.sizeBytes ?? completion.size_bytes ?? file.size, "upload completion size");
  return Object.freeze({
    upload_id: uploadId,
    ...(tempRef === undefined ? {} : { temp_ref: normalizeUploadName(tempRef, "upload temp ref") }),
    name,
    type,
    size,
  });
}

function initialSessionOffset(session: UploadSession, fileSize: number): number {
  return clampOffset(session.nextOffset ?? session.receivedBytes ?? 0, fileSize, "upload session offset");
}

function nextAcknowledgedOffset(ack: UploadChunkAck, previousOffset: number, chunkBytes: number, fileSize: number): number {
  return clampOffset(ack.nextOffset ?? ack.receivedBytes ?? previousOffset + chunkBytes, fileSize, "upload chunk offset");
}

function nextStatusOffset(status: UploadStatus, fileSize: number): number {
  return clampOffset(status.nextOffset ?? status.receivedBytes ?? 0, fileSize, "upload status offset");
}

function normalizeChunkSize(chunkSize: number | undefined, remaining: number): number {
  if (chunkSize === undefined) {
    return remaining;
  }
  const normalized = normalizeByteCount(chunkSize, "upload chunk size");
  if (normalized <= 0) {
    throw new UploadError({
      code: "upload_invalid_chunk_size",
      message: "Upload chunk size must be greater than zero.",
      retryable: false,
    });
  }
  return Math.min(normalized, remaining);
}

function validateChunk(chunk: UploadChunk, start: number, end: number): void {
  const expected = end - start;
  const byteLength = normalizeByteCount(chunk.byteLength, "upload chunk byteLength");
  if (byteLength !== expected || chunk.body.byteLength !== byteLength) {
    throw new UploadError({
      code: "upload_invalid_chunk",
      message: "Upload source returned a chunk with an unexpected byte length.",
      details: { expected, actual: byteLength },
      retryable: false,
    });
  }
}

function normalizeSlice(start: number, end: number, byteLength: number): { readonly start: number; readonly end: number } {
  const normalizedStart = clampOffset(start, byteLength, "upload slice start");
  const normalizedEnd = clampOffset(end, byteLength, "upload slice end");
  if (normalizedEnd < normalizedStart) {
    throw new RangeError("Upload slice end must be greater than or equal to start.");
  }
  return Object.freeze({ start: normalizedStart, end: normalizedEnd });
}

function normalizeUploadPath(path: string): string {
  const normalized = path.trim();
  if (normalized === "") {
    throw new TypeError("Upload path must be a non-empty string.");
  }
  return normalized;
}

function normalizeUploadName(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return normalized;
}

function normalizeUploadType(value: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError("Upload content type must be a non-empty string.");
  }
  return normalized;
}

function normalizeByteCount(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer.`);
  }
  return value;
}

function clampOffset(value: number, max: number, label: string): number {
  const normalized = normalizeByteCount(value, label);
  if (normalized > max) {
    throw new UploadError({
      code: "upload_invalid_offset",
      message: `${label} cannot exceed upload size.`,
      details: { offset: normalized, size: max },
      retryable: false,
    });
  }
  return normalized;
}

function totalUploadBytes(files: readonly Pick<UploadFile, "size">[]): number {
  return files.reduce((total, file) => total + file.size, 0);
}

function isUploadUnavailable(session: UploadSession | UploadUnavailableSession): session is UploadUnavailableSession {
  return "unavailable" in session && session.unavailable === true;
}
