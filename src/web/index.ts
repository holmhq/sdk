export {
  HOLM_APP_HTTP_CAPABILITY,
  WEB_HTTP_REQUEST_OPERATION,
  webRuntime,
} from "./runtime.js";
export type { WebRuntimeOptions } from "./runtime.js";

export {
  createWebUploadFile,
  createWebUploadSource,
} from "./upload.js";
export type {
  WebUploadBlobLike,
  WebUploadBlobPartLike,
  WebUploadChunkBody,
  WebUploadFileOptions,
} from "./upload.js";

import type { TransportAuthProvider, WebSessionTransportAuthProof } from "../transports/index.js";

export type WebSessionCredentials = "same-origin" | "include" | "omit";

export interface WebSessionAuthOptions {
  readonly credentials?: WebSessionCredentials;
}

export function createWebSessionAuth(options: WebSessionAuthOptions = {}): TransportAuthProvider {
  const credentials = normalizeCredentials(options.credentials ?? "same-origin");
  const proof = Object.freeze({ kind: "web-session", credentials }) satisfies WebSessionTransportAuthProof;
  return Object.freeze({
    current(): WebSessionTransportAuthProof {
      return proof;
    },
  });
}

function normalizeCredentials(credentials: WebSessionCredentials): WebSessionCredentials {
  if (credentials !== "same-origin" && credentials !== "include" && credentials !== "omit") {
    throw new TypeError("Web session credentials must be same-origin, include, or omit.");
  }
  return credentials;
}
