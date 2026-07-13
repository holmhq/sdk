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
