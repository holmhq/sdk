import type {
  BearerTransportAuthProof,
  TransportAuthProvider,
  WebSessionTransportAuthProof,
} from "../transports/index.js";

export type WebSessionCredentials = "same-origin" | "include" | "omit";

export interface WebSessionAuthOptions {
  readonly credentials?: WebSessionCredentials;
}

export interface WebTokenAuthOptions {
  readonly token: string | (() => string);
  readonly scheme?: string;
}

export function createWebSessionAuth(options: WebSessionAuthOptions = {}): TransportAuthProvider {
  const credentials = normalizeCredentials(options.credentials ?? "same-origin");
  const proof = Object.freeze({
    kind: "web-session",
    credentials,
    cachePartition: `web-session:${credentials}`,
  }) satisfies WebSessionTransportAuthProof;
  return Object.freeze({
    current(): WebSessionTransportAuthProof {
      return proof;
    },
  });
}

export function createWebTokenAuth(options: WebTokenAuthOptions): TransportAuthProvider {
  const scheme = normalizeTokenPart(options.scheme ?? "Bearer", "scheme");
  let token = resolveToken(options.token);
  let epoch = 0;
  return Object.freeze({
    current(): BearerTransportAuthProof {
      const nextToken = resolveToken(options.token);
      if (nextToken !== token) {
        token = nextToken;
        epoch += 1;
      }
      return Object.freeze({
        kind: "bearer",
        scheme,
        token,
        cachePartition: `web-token:${epoch}`,
      });
    },
  });
}

function normalizeCredentials(credentials: WebSessionCredentials): WebSessionCredentials {
  if (credentials !== "same-origin" && credentials !== "include" && credentials !== "omit") {
    throw new TypeError("Web session credentials must be same-origin, include, or omit.");
  }
  return credentials;
}

function resolveToken(source: string | (() => string)): string {
  return normalizeTokenPart(typeof source === "function" ? source() : source, "token");
}

function normalizeTokenPart(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError(`Web token auth ${label} must be non-empty.`);
  }
  return normalized;
}
