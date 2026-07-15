import type { SurfaceKind } from "./runtime.js";
import { canonicalEncodeWireValue, copyWireValue } from "./wire-value.js";

export interface CacheSourceIdentity {
  readonly id: string;
  readonly surface?: SurfaceKind;
}

export interface CallerPartitionedCacheKeyInput {
  readonly source: CacheSourceIdentity;
  readonly callerFingerprint: string;
  readonly operation: unknown;
  readonly namespace?: string;
}

export function createCallerPartitionedCacheKey(input: CallerPartitionedCacheKeyInput): string {
  const namespace = input.namespace === undefined ? "default" : normalizeNonEmpty(input.namespace, "cache namespace");
  const material = Object.freeze({
    version: 1,
    namespace,
    source: normalizeCacheSourceIdentity(input.source),
    callerFingerprint: normalizeNonEmpty(input.callerFingerprint, "caller fingerprint"),
    operation: copyWireValue(input.operation),
  });
  return `cache:v1:${createOpaqueCacheIdentity(material)}`;
}

export function createOpaqueCacheIdentity(value: unknown): string {
  const encoded = canonicalEncodeWireValue(copyWireValue(value));
  let h1 = 0xdeadbeef ^ encoded.length;
  let h2 = 0x41c6ce57 ^ encoded.length;
  let h3 = 0xc0decafe ^ encoded.length;
  let h4 = 0x9e3779b9 ^ encoded.length;

  for (let index = 0; index < encoded.length; index += 1) {
    const code = encoded.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 0x85ebca6b);
    h2 = Math.imul(h2 ^ code, 0xc2b2ae35);
    h3 = Math.imul(h3 ^ code, 0x27d4eb2f);
    h4 = Math.imul(h4 ^ code, 0x165667b1);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 0x85ebca6b);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 0xc2b2ae35);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 0x27d4eb2f);
  h4 = Math.imul(h4 ^ (h4 >>> 13), 0x165667b1);

  return [h1 ^ h2, h2 ^ h3, h3 ^ h4, h4 ^ h1]
    .map((lane) => (lane >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

export function normalizeCacheSourceIdentity(source: CacheSourceIdentity): CacheSourceIdentity {
  return Object.freeze({
    id: normalizeNonEmpty(source.id, "cache source id"),
    ...(source.surface === undefined ? {} : { surface: source.surface }),
  });
}

function normalizeNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return normalized;
}
