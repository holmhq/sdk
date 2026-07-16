import type { AppUploadService } from "../app/upload.js";
import { throwIfCancelled } from "../core/cancellation.js";
import type { CancellationSignal } from "../core/runtime.js";
import {
  canonicalEncodeWireValue,
  type WireValue,
} from "../core/wire-value.js";
import {
  RemoteError,
  UploadError,
  applyTransportAuth,
  composeResumableUpload,
  createTransportRequest,
  decodeTransportResponse,
  normalizeTransportError,
  type AuthenticatedTransportRequest,
  type ResumableUploadAdapter,
  type TransportAuthProvider,
  type UploadChunkAck,
  type UploadCompletion,
  type UploadFinalizeInput,
  type UploadRequest,
  type UploadSession,
  type UploadStatus,
} from "../transports/index.js";
import { createWebSessionAuth } from "./auth.js";
import type { WebUploadChunkBody } from "./upload.js";

export const WEB_UPLOAD_PROGRESS_MODE = "acknowledged-resumable+coarse-multipart-fallback";

export interface WebUploadServiceOptions {
  readonly baseUrl?: string | URL;
  readonly fetch?: typeof fetch;
  readonly auth?: TransportAuthProvider;
}

export interface WebUploadService extends AppUploadService {
  readonly progressMode: typeof WEB_UPLOAD_PROGRESS_MODE;
  upload(request: UploadRequest): Promise<WireValue>;
}

type WebFetchBody = Exclude<RequestInit["body"], null | undefined>;

interface WebUploadRequestContext {
  readonly requestId: string;
  readonly method: string;
  readonly path: string;
  readonly body?: WebFetchBody;
  readonly contentType?: string;
  readonly signal?: CancellationSignal;
}

const resumableUnavailableStatuses = new Set([404, 405, 501]);

export function createWebUploadService(options: WebUploadServiceOptions = {}): WebUploadService {
  const fetchImplementation = resolveFetch(options.fetch);
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const auth = options.auth ?? createWebSessionAuth();
  let sequence = 0;

  function nextRequestId(): string {
    sequence += 1;
    return `web-upload-${sequence}`;
  }

  async function request(context: WebUploadRequestContext): Promise<WireValue> {
    const transportRequest = createTransportRequest({
      method: context.method,
      url: context.path,
      headers: {
        accept: "application/json",
        ...(context.contentType === undefined ? {} : { "content-type": context.contentType }),
      },
      responseMode: "json",
    });
    let authenticated: AuthenticatedTransportRequest;
    try {
      throwIfCancelled(context.signal);
      authenticated = await applyTransportAuth(transportRequest, auth);
      throwIfCancelled(context.signal);
    } catch (error) {
      throw normalizeTransportError(error, {
        request: transportRequest,
        ...(context.signal === undefined ? {} : { cancellation: context.signal }),
      });
    }

    const controller = new AbortController();
    const unsubscribe = context.signal?.onCancel(() => controller.abort());
    try {
      const response = await fetchImplementation(resolveUrl(context.path, baseUrl), {
        method: context.method,
        headers: new Headers(authenticated.request.headers),
        ...(context.body === undefined ? {} : { body: context.body }),
        ...(authenticated.privateProof?.kind === "web-session"
          ? { credentials: authenticated.privateProof.credentials }
          : {}),
        signal: controller.signal,
      });
      throwIfCancelled(context.signal);
      const body = await response.text();
      throwIfCancelled(context.signal);
      if (response.ok && body.trim() === "") {
        return null;
      }
      return decodeTransportResponse({
        requestId: context.requestId,
        status: response.status,
        body,
        responseMode: "json",
        headers: responseHeaders(response.headers),
        url: response.url || resolveUrl(context.path, baseUrl),
      }).payload;
    } catch (error) {
      throw normalizeTransportError(error, {
        request: authenticated.request,
        ...(context.signal === undefined ? {} : { cancellation: context.signal }),
      });
    } finally {
      unsubscribe?.();
    }
  }

  async function requestJson(
    method: string,
    path: string,
    value: unknown,
    signal?: CancellationSignal,
  ): Promise<WireValue> {
    return request({
      requestId: nextRequestId(),
      method,
      path,
      body: canonicalEncodeWireValue(value),
      contentType: "application/json",
      ...(signal === undefined ? {} : { signal }),
    });
  }

  async function requestBody(
    method: string,
    path: string,
    body: WebFetchBody,
    signal?: CancellationSignal,
  ): Promise<WireValue> {
    return request({
      requestId: nextRequestId(),
      method,
      path,
      body,
      ...(signal === undefined ? {} : { signal }),
    });
  }

  const adapter: ResumableUploadAdapter<WireValue, WebUploadChunkBody> = {
    async createSession(file, control): Promise<UploadSession | { readonly unavailable: true }> {
      try {
        const payload = await requestJson(
          "POST",
          "/api/uploads",
          {
            name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            purpose: "runtime",
          },
          control.signal,
        );
        return uploadSession(payload);
      } catch (error) {
        if (error instanceof RemoteError && resumableUnavailableStatuses.has(error.status ?? 0)) {
          return Object.freeze({ unavailable: true });
        }
        throw error;
      }
    },
    async uploadChunk(input, control): Promise<UploadChunkAck> {
      const payload = await request({
        requestId: nextRequestId(),
        method: "PUT",
        path: `/api/uploads/${encodeURIComponent(input.session.id)}/chunk?offset=${input.offset}`,
        body: webChunkBlob(input.chunk.body),
        contentType: "application/octet-stream",
        ...(control.signal === undefined ? {} : { signal: control.signal }),
      });
      return uploadStatus(payload);
    },
    async fetchStatus(input, control): Promise<UploadStatus> {
      const payload = await request({
        requestId: nextRequestId(),
        method: "GET",
        path: `/api/uploads/${encodeURIComponent(input.session.id)}`,
        ...(control.signal === undefined ? {} : { signal: control.signal }),
      });
      return uploadStatus(payload);
    },
    async completeSession(_file, session, control): Promise<UploadCompletion> {
      const payload = await requestJson(
        "POST",
        `/api/uploads/${encodeURIComponent(session.id)}/complete`,
        {},
        control.signal,
      );
      return uploadCompletion(payload);
    },
    async finalize(input, control): Promise<WireValue> {
      return requestBody(
        "POST",
        input.path,
        createHandoffFormData(input),
        control.signal,
      );
    },
  };

  return Object.freeze({
    progressMode: WEB_UPLOAD_PROGRESS_MODE,
    async upload(input: UploadRequest): Promise<WireValue> {
      const webInput = input as UploadRequest<WebUploadChunkBody>;
      await validateWebUploadFiles(webInput);
      try {
        return await composeResumableUpload(webInput, adapter);
      } catch (error) {
        if (!(error instanceof UploadError) || error.code !== "upload_unavailable") {
          throw error;
        }
        return uploadMultipartFallback(webInput, requestBody);
      }
    },
  });
}

async function validateWebUploadFiles(input: UploadRequest<WebUploadChunkBody>): Promise<void> {
  for (const file of input.files) {
    throwIfCancelled(input.signal);
    const probeEnd = Math.min(file.size, 1);
    const probe = await file.source.slice(0, probeEnd);
    webChunkBlob(probe.body);
  }
}

async function uploadMultipartFallback(
  input: UploadRequest<WebUploadChunkBody>,
  send: (method: string, path: string, body: WebFetchBody, signal?: CancellationSignal) => Promise<WireValue>,
): Promise<WireValue> {
  throwIfCancelled(input.signal);
  const total = input.files.reduce((sum, file) => sum + file.size, 0);
  input.onProgress?.(Object.freeze({ loaded: 0, total, percent: total === 0 ? 100 : 0 }));
  const form = new FormData();
  for (const field of input.fields ?? []) {
    appendFormValue(form, field.name, field.value);
  }
  for (const file of input.files) {
    const chunk = await file.source.slice(0, file.size);
    throwIfCancelled(input.signal);
    form.append(file.field, webChunkBlob(chunk.body), file.name);
  }
  const result = await send("POST", input.path, form, input.signal);
  throwIfCancelled(input.signal);
  input.onProgress?.(Object.freeze({ loaded: total, total, percent: 100 }));
  return result;
}

function createHandoffFormData(input: UploadFinalizeInput<WebUploadChunkBody>): FormData {
  const form = new FormData();
  for (const field of input.fields) {
    appendFormValue(form, field.name, field.value);
  }
  form.append("__holm_uploads", canonicalEncodeWireValue(input.handoff));
  return form;
}

function appendFormValue(form: FormData, name: string, value: unknown): void {
  form.append(name, typeof value === "string" ? value : canonicalEncodeWireValue(value));
}

function webChunkBlob(body: WebUploadChunkBody): Blob {
  if (!(body.blob instanceof Blob)) {
    throw new UploadError({
      code: "web_upload_blob_required",
      message: "Web upload chunks require Blob-backed bodies.",
      retryable: false,
    });
  }
  return body.blob;
}

function uploadSession(value: WireValue): UploadSession {
  const record = wireRecord(value, "upload session");
  return Object.freeze({
    id: requiredString(record.id, "upload session id"),
    ...optionalNumber(record.chunk_size ?? record.chunkSize, "upload chunk size", "chunkSize"),
    ...optionalNumber(record.received_bytes ?? record.receivedBytes, "upload received bytes", "receivedBytes"),
    ...optionalNumber(record.next_offset ?? record.nextOffset, "upload next offset", "nextOffset"),
  });
}

function uploadStatus(value: WireValue): UploadStatus {
  const record = wireRecord(value, "upload status");
  return Object.freeze({
    ...optionalNumber(record.received_bytes ?? record.receivedBytes, "upload received bytes", "receivedBytes"),
    ...optionalNumber(record.next_offset ?? record.nextOffset, "upload next offset", "nextOffset"),
  });
}

function uploadCompletion(value: WireValue): UploadCompletion {
  return wireRecord(value, "upload completion") as unknown as UploadCompletion;
}

function wireRecord(value: WireValue, label: string): Record<string, WireValue> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new UploadError({
      code: "invalid_web_upload_response",
      message: `Holm ${label} must be an object.`,
      retryable: false,
    });
  }
  return value as Record<string, WireValue>;
}

function requiredString(value: WireValue | undefined, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new UploadError({
      code: "invalid_web_upload_response",
      message: `Holm ${label} must be a non-empty string.`,
      retryable: false,
    });
  }
  return value;
}

function optionalNumber(
  value: WireValue | undefined,
  label: string,
  key: "chunkSize" | "receivedBytes" | "nextOffset",
): Readonly<Record<typeof key, number>> | Readonly<Record<string, never>> {
  if (value === undefined) {
    return Object.freeze({});
  }
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new UploadError({
      code: "invalid_web_upload_response",
      message: `Holm ${label} must be a non-negative safe integer.`,
      retryable: false,
    });
  }
  return Object.freeze({ [key]: value as number }) as Readonly<Record<typeof key, number>>;
}

function resolveFetch(injected: typeof fetch | undefined): typeof fetch {
  const implementation = injected ?? globalThis.fetch;
  if (typeof implementation !== "function") {
    throw new TypeError("The web upload service requires a Fetch implementation.");
  }
  return implementation;
}

function normalizeBaseUrl(value: string | URL | undefined): URL | undefined {
  if (value === undefined) {
    return undefined;
  }
  try {
    return new URL(value);
  } catch (cause) {
    throw new TypeError("Web upload baseUrl must be an absolute URL.", { cause });
  }
}

function resolveUrl(path: string, baseUrl: URL | undefined): string {
  return baseUrl === undefined ? path : new URL(path, baseUrl).href;
}

function responseHeaders(headers: Headers): Record<string, string> {
  const output: Record<string, string> = {};
  headers.forEach((value, key) => {
    output[key] = value;
  });
  return output;
}
