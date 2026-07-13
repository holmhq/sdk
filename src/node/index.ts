import type { BearerTransportAuthProof, TransportAuthProvider } from "../transports/index.js";

export interface NodeTokenAuthOptions {
  readonly token: string | (() => string);
  readonly scheme?: string;
}

export function createNodeTokenAuth(options: NodeTokenAuthOptions): TransportAuthProvider {
  const scheme = normalizePart(options.scheme ?? "Bearer", "scheme");
  validateTokenSource(options.token);
  return Object.freeze({
    current(): BearerTransportAuthProof {
      return Object.freeze({
        kind: "bearer",
        scheme,
        token: resolveToken(options.token),
      });
    },
  });
}

function validateTokenSource(source: string | (() => string)): void {
  resolveToken(source);
}

function resolveToken(source: string | (() => string)): string {
  return normalizePart(typeof source === "function" ? source() : source, "token");
}

function normalizePart(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError(`Node token auth ${label} must be non-empty.`);
  }
  return normalized;
}
