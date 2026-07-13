import {
  createCallerPartitionedCacheKey,
  normalizeCacheSourceIdentity,
  type CacheSourceIdentity,
} from "../core/cache-key.js";
import type { Clock, OperationResponse, Scheduler } from "../core/runtime.js";
import { copyWireValue } from "../core/wire-value.js";
import type { TransportRequest } from "./index.js";

export type TransportCacheMode = "default" | "reload" | "no-store";

export interface TransportCachePolicy {
  readonly ttlMs: number;
  readonly swrMs?: number;
  readonly mode?: TransportCacheMode;
}

export interface TransportCachePartition {
  readonly source: CacheSourceIdentity;
  readonly callerFingerprint: string;
}

export interface TransportCacheKeyInput {
  readonly partition: TransportCachePartition;
  readonly request: TransportRequest;
}

export interface TransportCacheGetInput extends TransportCacheKeyInput {
  readonly policy: TransportCachePolicy;
}

export interface TransportCacheBackgroundErrorEvent extends TransportCacheKeyInput {
  readonly key: string;
  readonly error: unknown;
}

export interface TransportCacheOptions {
  readonly clock: Clock;
  readonly scheduler: Scheduler;
  readonly maxEntries: number;
  readonly onBackgroundError?: (event: TransportCacheBackgroundErrorEvent) => void;
}

export type TransportCacheLoader = () => OperationResponse | Promise<OperationResponse>;

export interface TransportCache {
  readonly size: number;
  getOrLoad(input: TransportCacheGetInput, loader: TransportCacheLoader): Promise<OperationResponse>;
  read(input: TransportCacheKeyInput): OperationResponse | undefined;
  delete(input: TransportCacheKeyInput): boolean;
  clear(): void;
}

interface NormalizedPolicy {
  readonly ttlMs: number;
  readonly swrMs: number;
  readonly mode: TransportCacheMode;
}

interface CacheEntry {
  readonly response: OperationResponse;
  readonly storedAt: number;
  readonly expiresAt: number;
  readonly staleUntil: number;
}

interface NormalizedGetInput extends TransportCacheGetInput {
  readonly key: string;
  readonly policy: NormalizedPolicy;
}

export function createTransportCache(options: TransportCacheOptions): TransportCache {
  const clock = options.clock;
  const scheduler = options.scheduler;
  const maxEntries = normalizeMaxEntries(options.maxEntries);
  const entries = new Map<string, CacheEntry>();
  const inflight = new Map<string, Promise<OperationResponse>>();
  const scheduledRefreshes = new Set<string>();

  async function getOrLoad(input: TransportCacheGetInput, loader: TransportCacheLoader): Promise<OperationResponse> {
    const normalized = normalizeGetInput(input);
    if (normalized.policy.mode === "no-store") {
      return copyOperationResponse(await loader());
    }

    const cached = entries.get(normalized.key);
    const now = clock.now();
    if (normalized.policy.mode !== "reload" && cached !== undefined) {
      if (now < cached.expiresAt) {
        touch(normalized.key, cached);
        return Promise.resolve(copyOperationResponse(cached.response));
      }
      if (now < cached.staleUntil) {
        touch(normalized.key, cached);
        scheduleBackgroundRefresh(normalized, loader);
        return Promise.resolve(copyOperationResponse(cached.response));
      }
    }

    return copyOperationResponse(await loadShared(normalized, loader));
  }

  function read(input: TransportCacheKeyInput): OperationResponse | undefined {
    const key = createTransportCacheKey(input);
    const entry = entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    touch(key, entry);
    return copyOperationResponse(entry.response);
  }

  function deleteEntry(input: TransportCacheKeyInput): boolean {
    return entries.delete(createTransportCacheKey(input));
  }

  function clear(): void {
    entries.clear();
    scheduledRefreshes.clear();
  }

  function normalizeGetInput(input: TransportCacheGetInput): NormalizedGetInput {
    return Object.freeze({
      partition: normalizePartition(input.partition),
      request: input.request,
      policy: normalizePolicy(input.policy),
      key: createTransportCacheKey(input),
    });
  }

  function loadShared(
    input: NormalizedGetInput,
    loader: TransportCacheLoader,
    onError?: (error: unknown) => void,
  ): Promise<OperationResponse> {
    const pending = inflight.get(input.key);
    if (pending !== undefined) {
      return pending;
    }
    const next = invokeLoader(loader)
      .then(
        (response) => store(input.key, response, input.policy),
        (error: unknown) => {
          onError?.(error);
          throw error;
        },
      )
      .finally(() => {
        inflight.delete(input.key);
      });
    inflight.set(input.key, next);
    return next;
  }

  function store(key: string, response: OperationResponse, policy: NormalizedPolicy): OperationResponse {
    const storedAt = clock.now();
    const stored = copyOperationResponse(response);
    const entry = Object.freeze({
      response: stored,
      storedAt,
      expiresAt: storedAt + policy.ttlMs,
      staleUntil: storedAt + policy.ttlMs + policy.swrMs,
    }) satisfies CacheEntry;
    entries.delete(key);
    entries.set(key, entry);
    evictLeastRecentlyUsed();
    return stored;
  }

  function touch(key: string, entry: CacheEntry): void {
    entries.delete(key);
    entries.set(key, entry);
  }

  function evictLeastRecentlyUsed(): void {
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next().value as string | undefined;
      if (oldest === undefined) {
        return;
      }
      entries.delete(oldest);
    }
  }

  function scheduleBackgroundRefresh(input: NormalizedGetInput, loader: TransportCacheLoader): void {
    if (inflight.has(input.key) || scheduledRefreshes.has(input.key)) {
      return;
    }
    scheduledRefreshes.add(input.key);
    scheduler.schedule(0, () => {
      scheduledRefreshes.delete(input.key);
      void loadShared(input, loader, (error: unknown) => {
        options.onBackgroundError?.(Object.freeze({
          key: input.key,
          partition: input.partition,
          request: input.request,
          error,
        }));
      }).catch(() => undefined);
    });
  }

  return Object.freeze({
    get size(): number {
      return entries.size;
    },
    getOrLoad,
    read,
    delete: deleteEntry,
    clear,
  }) satisfies TransportCache;
}

export function createTransportCacheKey(input: TransportCacheKeyInput): string {
  const request = normalizeCacheableGetRequest(input.request);
  return createCallerPartitionedCacheKey({
    namespace: "transport.get",
    source: input.partition.source,
    callerFingerprint: input.partition.callerFingerprint,
    operation: Object.freeze({
      method: request.method,
      url: request.url,
      params: request.params,
      responseMode: request.responseMode,
    }),
  });
}

function normalizePartition(partition: TransportCachePartition): TransportCachePartition {
  return Object.freeze({
    source: normalizeCacheSourceIdentity(partition.source),
    callerFingerprint: normalizeNonEmpty(partition.callerFingerprint, "caller fingerprint"),
  });
}

function normalizePolicy(policy: TransportCachePolicy): NormalizedPolicy {
  const ttlMs = normalizeDuration(policy.ttlMs, "ttlMs");
  const swrMs = normalizeDuration(policy.swrMs ?? 0, "swrMs");
  return Object.freeze({
    ttlMs,
    swrMs,
    mode: normalizeMode(policy.mode ?? "default"),
  });
}

function normalizeMode(mode: TransportCacheMode): TransportCacheMode {
  if (mode !== "default" && mode !== "reload" && mode !== "no-store") {
    throw new TypeError(`Unknown transport cache mode: ${String(mode)}`);
  }
  return mode;
}

function normalizeDuration(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`Transport cache ${name} must be a non-negative finite number.`);
  }
  return value;
}

function normalizeMaxEntries(maxEntries: number): number {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new TypeError("Transport cache maxEntries must be a positive integer.");
  }
  return maxEntries;
}

function normalizeCacheableGetRequest(request: TransportRequest): TransportRequest {
  if (request.method !== "GET") {
    throw new TypeError("Transport cache only accepts GET requests.");
  }
  if (request.body !== undefined) {
    throw new TypeError("Transport cache GET requests must not include a body.");
  }
  return request;
}

function normalizeNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError(`Transport cache ${label} must be a non-empty string.`);
  }
  return normalized;
}

function invokeLoader(loader: TransportCacheLoader): Promise<OperationResponse> {
  try {
    return Promise.resolve(loader());
  } catch (error) {
    return Promise.reject(error);
  }
}

function copyOperationResponse(response: OperationResponse): OperationResponse {
  return Object.freeze({
    requestId: normalizeNonEmpty(response.requestId, "response requestId"),
    payload: copyWireValue(response.payload),
    ...(response.metadata === undefined ? {} : { metadata: copyWireValue(response.metadata) }),
  });
}
