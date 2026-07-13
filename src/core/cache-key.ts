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
  return `cache:v1:${canonicalEncodeWireValue(material)}`;
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
