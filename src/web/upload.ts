import {
  createUploadFile,
  type UploadChunk,
  type UploadChunkBody,
  type UploadFile,
  type UploadSource,
} from "../transports/upload.js";

export interface WebUploadBlobPartLike {
  readonly size: number;
  readonly type?: string;
}

export interface WebUploadBlobLike extends WebUploadBlobPartLike {
  slice(start: number, end: number, contentType?: string): WebUploadBlobPartLike;
}

export interface WebUploadChunkBody extends UploadChunkBody {
  readonly byteLength: number;
  readonly size: number;
  readonly type: string;
  readonly blob: WebUploadBlobPartLike;
}

export interface WebUploadFileOptions {
  readonly field: string;
  readonly blob: WebUploadBlobLike;
  readonly name?: string;
  readonly type?: string;
}

export function createWebUploadFile(options: WebUploadFileOptions): UploadFile<WebUploadChunkBody> {
  const type = normalizeWebUploadType(options.type ?? options.blob.type ?? "application/octet-stream");
  return createUploadFile({
    field: options.field,
    name: options.name ?? "blob",
    type,
    source: createWebUploadSource(options.blob, type),
  });
}

export function createWebUploadSource(blob: WebUploadBlobLike, contentType = "application/octet-stream"): UploadSource<WebUploadChunkBody> {
  const byteLength = normalizeWebUploadSize(blob.size);
  const normalizedType = normalizeWebUploadType(contentType);
  return Object.freeze({
    byteLength,
    slice(start: number, end: number): UploadChunk<WebUploadChunkBody> {
      const normalizedStart = normalizeWebUploadOffset(start, byteLength, "start");
      const normalizedEnd = normalizeWebUploadOffset(end, byteLength, "end");
      if (normalizedEnd < normalizedStart) {
        throw new RangeError("Web upload slice end must be greater than or equal to start.");
      }
      const sliced = blob.slice(normalizedStart, normalizedEnd, "application/octet-stream");
      const chunkBytes = normalizeWebUploadSize(sliced.size);
      const body = Object.freeze({
        byteLength: chunkBytes,
        size: chunkBytes,
        type: normalizeWebUploadType(sliced.type ?? normalizedType),
        blob: sliced,
      });
      return Object.freeze({ byteLength: chunkBytes, body });
    },
  });
}

function normalizeWebUploadSize(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Web upload blob size must be a non-negative safe integer.");
  }
  return value;
}

function normalizeWebUploadOffset(value: number, max: number, label: string): number {
  const normalized = normalizeWebUploadSize(value);
  if (normalized > max) {
    throw new RangeError(`Web upload slice ${label} exceeds blob size.`);
  }
  return normalized;
}

function normalizeWebUploadType(value: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError("Web upload content type must be a non-empty string.");
  }
  return normalized;
}
