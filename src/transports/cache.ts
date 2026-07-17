import {
  createCallerPartitionedCacheKey,
  normalizeCacheSourceIdentity,
  type CacheSourceIdentity,
} from "../core/cache-key.js";
import type { HolmDiagnosticsSink } from "../core/diagnostics.js";
import { HolmError, serializeHolmError, type SerializedHolmError } from "../core/errors.js";
import type { Clock, OperationResponse, ScheduledTask, Scheduler } from "../core/runtime.js";
import { copyWireValue } from "../core/wire-value.js";
import type { RedactedTransportDiagnostic, TransportRequest } from "./index.js";
import { redactTransportRequestMetadata } from "./sensitivity.js";

export type TransportCacheMode = "default" | "reload" | "no-store";
export type TransportCacheInvalidationReason = "explicit" | "mutation";

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
  readonly tags?: readonly string[];
}

export interface TransportCacheInvalidationInput {
  readonly partition?: TransportCachePartition;
  readonly tags?: readonly string[];
  readonly prefixes?: readonly string[];
  readonly requests?: readonly TransportCacheKeyInput[];
}

export interface TransportCacheMutationInvalidation extends TransportCacheInvalidationInput {}

export interface TransportCacheInvalidationResult {
  readonly removed: number;
  readonly keys: readonly string[];
}

export interface TransportCacheUpdateEvent {
  readonly key: string;
  readonly partition: TransportCachePartition;
  readonly request: RedactedTransportDiagnostic;
  readonly tags: readonly string[];
  readonly storedAt: number;
  readonly expiresAt: number;
  readonly staleUntil: number;
}

export interface TransportCacheInvalidationEvent extends TransportCacheInvalidationResult {
  readonly reason: TransportCacheInvalidationReason;
  readonly tags: readonly string[];
  readonly prefixes: readonly string[];
  readonly partition?: TransportCachePartition;
}

export interface TransportCacheBackgroundErrorEvent {
  readonly key: string;
  readonly partition: TransportCachePartition;
  readonly request: RedactedTransportDiagnostic;
  readonly tags: readonly string[];
  readonly error: SerializedHolmError;
}

export interface TransportCacheOptions {
  readonly clock: Clock;
  readonly scheduler: Scheduler;
  readonly maxEntries: number;
  readonly diagnostics?: HolmDiagnosticsSink;
  readonly onUpdate?: (event: TransportCacheUpdateEvent) => void;
  readonly onInvalidate?: (event: TransportCacheInvalidationEvent) => void;
  readonly onBackgroundError?: (event: TransportCacheBackgroundErrorEvent) => void;
}

export type TransportCacheLoader = () => OperationResponse | Promise<OperationResponse>;

export interface TransportCache {
  readonly size: number;
  getOrLoad(input: TransportCacheGetInput, loader: TransportCacheLoader): Promise<OperationResponse>;
  read(input: TransportCacheKeyInput): OperationResponse | undefined;
  delete(input: TransportCacheKeyInput): boolean;
  invalidate(input: TransportCacheInvalidationInput): TransportCacheInvalidationResult;
  invalidateForMutation(input: TransportCacheMutationInvalidation): TransportCacheInvalidationResult;
  clear(): void;
}

interface NormalizedPolicy {
  readonly ttlMs: number;
  readonly swrMs: number;
  readonly mode: TransportCacheMode;
}

interface CacheEntry {
  readonly response: OperationResponse;
  readonly partition: TransportCachePartition;
  readonly request: TransportRequest;
  readonly tags: readonly string[];
  readonly storedAt: number;
  readonly expiresAt: number;
  readonly staleUntil: number;
}

interface NormalizedGetInput extends TransportCacheGetInput {
  readonly key: string;
  readonly partition: TransportCachePartition;
  readonly policy: NormalizedPolicy;
  readonly tags: readonly string[];
}

interface NormalizedInvalidationInput {
  readonly partition?: TransportCachePartition;
  readonly tags: readonly string[];
  readonly prefixes: readonly string[];
  readonly requestKeys: readonly string[];
}

interface InflightLoad {
  readonly promise: Promise<OperationResponse>;
  readonly token: object;
  readonly keyGeneration: number;
  readonly clearGeneration: number;
  readonly input: NormalizedGetInput;
}

interface ScheduledRefresh {
  readonly task: ScheduledTask;
  readonly token: object;
  readonly keyGeneration: number;
  readonly clearGeneration: number;
}

export function createTransportCache(options: TransportCacheOptions): TransportCache {
  const clock = options.clock;
  const scheduler = options.scheduler;
  const maxEntries = normalizeMaxEntries(options.maxEntries);
  const entries = new Map<string, CacheEntry>();
  const inflight = new Map<string, InflightLoad>();
  const scheduledRefreshes = new Map<string, ScheduledRefresh>();
  const keyGenerations = new Map<string, number>();
  const activeLoadCounts = new Map<string, number>();
  let clearGeneration = 0;

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
    const key = createTransportCacheKey(input);
    return removeCacheKey(key);
  }

  function invalidate(input: TransportCacheInvalidationInput): TransportCacheInvalidationResult {
    return invalidateEntries(input, "explicit");
  }

  function invalidateForMutation(input: TransportCacheMutationInvalidation): TransportCacheInvalidationResult {
    return invalidateEntries(input, "mutation");
  }

  function clear(): void {
    entries.clear();
    for (const scheduled of scheduledRefreshes.values()) {
      scheduled.task.cancel();
    }
    scheduledRefreshes.clear();
    inflight.clear();
    keyGenerations.clear();
    clearGeneration += 1;
  }

  function normalizeGetInput(input: TransportCacheGetInput): NormalizedGetInput {
    return Object.freeze({
      partition: normalizePartition(input.partition),
      request: input.request,
      policy: normalizePolicy(input.policy),
      tags: normalizeTags(input.tags ?? []),
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
      return pending.promise;
    }
    const token = Object.freeze({});
    const keyGeneration = currentKeyGeneration(input.key);
    const loadClearGeneration = clearGeneration;
    retainActiveLoad(input.key);
    const next = invokeLoader(loader)
      .then(
        (response) => storeIfCurrent(input, response, keyGeneration, loadClearGeneration),
        (error: unknown) => {
          onError?.(error);
          throw error;
        },
      )
      .finally(() => {
        if (inflight.get(input.key)?.token === token) {
          inflight.delete(input.key);
        }
        releaseActiveLoad(input.key);
      });
    inflight.set(input.key, Object.freeze({ promise: next, token, keyGeneration, clearGeneration: loadClearGeneration, input }));
    return next;
  }

  function storeIfCurrent(
    input: NormalizedGetInput,
    response: OperationResponse,
    keyGeneration: number,
    loadClearGeneration: number,
  ): OperationResponse {
    const stored = copyOperationResponse(response);
    if (!isCurrentGeneration(input.key, keyGeneration, loadClearGeneration)) {
      return stored;
    }
    const storedAt = clock.now();
    const entry = Object.freeze({
      response: stored,
      partition: input.partition,
      request: input.request,
      tags: input.tags,
      storedAt,
      expiresAt: storedAt + input.policy.ttlMs,
      staleUntil: storedAt + input.policy.ttlMs + input.policy.swrMs,
    }) satisfies CacheEntry;
    entries.delete(input.key);
    entries.set(input.key, entry);
    evictLeastRecentlyUsed();
    emitUpdate(input.key, entry);
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

  function invalidateEntries(
    input: TransportCacheInvalidationInput,
    reason: TransportCacheInvalidationReason,
  ): TransportCacheInvalidationResult {
    const normalized = normalizeInvalidationInput(input);
    const keys = new Set(normalized.requestKeys);
    for (const [key, entry] of entries) {
      if (matchesInvalidation(entry, normalized)) {
        keys.add(key);
      }
    }
    for (const [key, load] of inflight) {
      if (matchesInvalidation(load.input, normalized)) {
        keys.add(key);
      }
    }

    let removed = 0;
    for (const key of keys) {
      if (removeCacheKey(key)) {
        removed += 1;
      }
    }

    const result = Object.freeze({ removed, keys: Object.freeze([...keys].sort()) }) satisfies TransportCacheInvalidationResult;
    emitInvalidation(reason, normalized, result);
    return result;
  }

  function removeCacheKey(key: string): boolean {
    const deleted = entries.delete(key);
    cancelScheduledRefresh(key);
    const hadActiveLoad = (activeLoadCounts.get(key) ?? 0) > 0;
    const hadInflight = inflight.delete(key);
    if (hadActiveLoad || hadInflight) {
      advanceKeyGeneration(key);
    } else {
      keyGenerations.delete(key);
    }
    return deleted;
  }

  function matchesInvalidation(entry: CacheEntry | NormalizedGetInput, input: NormalizedInvalidationInput): boolean {
    if (input.partition !== undefined && !samePartition(entry.partition, input.partition)) {
      return false;
    }
    if (input.tags.length > 0 && intersects(entry.tags, input.tags)) {
      return true;
    }
    if (input.prefixes.length > 0 && input.prefixes.some((prefix) => entry.request.url.startsWith(prefix))) {
      return true;
    }
    return false;
  }

  function scheduleBackgroundRefresh(input: NormalizedGetInput, loader: TransportCacheLoader): void {
    if (inflight.has(input.key) || scheduledRefreshes.has(input.key)) {
      return;
    }
    const token = Object.freeze({});
    const keyGeneration = currentKeyGeneration(input.key);
    const refreshClearGeneration = clearGeneration;
    const task = scheduler.schedule(0, () => {
      const scheduled = scheduledRefreshes.get(input.key);
      if (scheduled?.token !== token) {
        return;
      }
      scheduledRefreshes.delete(input.key);
      if (!isCurrentGeneration(input.key, keyGeneration, refreshClearGeneration)) {
        return;
      }
      void loadShared(input, loader, (error: unknown) => {
        emitBackgroundError(input, error);
      }).catch(() => undefined);
    });
    scheduledRefreshes.set(
      input.key,
      Object.freeze({ task, token, keyGeneration, clearGeneration: refreshClearGeneration }),
    );
  }

  function cancelScheduledRefresh(key: string): void {
    const scheduled = scheduledRefreshes.get(key);
    if (scheduled === undefined) {
      return;
    }
    scheduled.task.cancel();
    scheduledRefreshes.delete(key);
  }

  function currentKeyGeneration(key: string): number {
    return keyGenerations.get(key) ?? 0;
  }

  function advanceKeyGeneration(key: string): void {
    keyGenerations.set(key, currentKeyGeneration(key) + 1);
  }

  function retainActiveLoad(key: string): void {
    activeLoadCounts.set(key, (activeLoadCounts.get(key) ?? 0) + 1);
  }

  function releaseActiveLoad(key: string): void {
    const count = activeLoadCounts.get(key);
    if (count === undefined) {
      return;
    }
    if (count > 1) {
      activeLoadCounts.set(key, count - 1);
      return;
    }
    activeLoadCounts.delete(key);
    if (!scheduledRefreshes.has(key)) {
      keyGenerations.delete(key);
    }
  }

  function isCurrentGeneration(key: string, keyGeneration: number, loadClearGeneration: number): boolean {
    return clearGeneration === loadClearGeneration && currentKeyGeneration(key) === keyGeneration;
  }

  function emitUpdate(key: string, entry: CacheEntry): void {
    const event = Object.freeze({
      key,
      partition: entry.partition,
      request: redactTransportRequestMetadata(entry.request),
      tags: entry.tags,
      storedAt: entry.storedAt,
      expiresAt: entry.expiresAt,
      staleUntil: entry.staleUntil,
    }) satisfies TransportCacheUpdateEvent;
    notifyHook("transport_cache_update_hook_error", () => options.onUpdate?.(event));
    options.diagnostics?.emit({
      channel: "transport.cache",
      code: "transport_cache_update",
      severity: "debug",
      message: "Transport cache entry updated.",
      at: entry.storedAt,
      details: diagnosticDetailsForEntry(key, entry),
    });
  }

  function emitInvalidation(
    reason: TransportCacheInvalidationReason,
    input: NormalizedInvalidationInput,
    result: TransportCacheInvalidationResult,
  ): void {
    const event = Object.freeze({
      reason,
      removed: result.removed,
      keys: result.keys,
      tags: input.tags,
      prefixes: input.prefixes,
      ...(input.partition === undefined ? {} : { partition: input.partition }),
    }) satisfies TransportCacheInvalidationEvent;
    notifyHook("transport_cache_invalidate_hook_error", () => options.onInvalidate?.(event));
    options.diagnostics?.emit({
      channel: "transport.cache",
      code: "transport_cache_invalidate",
      severity: "info",
      message: "Transport cache entries invalidated.",
      at: clock.now(),
      details: event,
    });
  }

  function emitBackgroundError(input: NormalizedGetInput, error: unknown): void {
    const diagnosticError = redactHolmErrorForDiagnostic(error);
    const event = Object.freeze({
      key: input.key,
      partition: input.partition,
      request: redactTransportRequestMetadata(input.request),
      tags: input.tags,
      error: serializeHolmError(diagnosticError),
    }) satisfies TransportCacheBackgroundErrorEvent;
    notifyHook("transport_cache_background_error_hook_error", () => options.onBackgroundError?.(event));
    options.diagnostics?.emit({
      channel: "transport.cache",
      code: "transport_cache_background_error",
      severity: "error",
      message: "Transport cache background refresh failed.",
      at: clock.now(),
      details: {
        key: input.key,
        partition: input.partition,
        request: redactTransportRequestMetadata(input.request),
        tags: input.tags,
      },
      error: diagnosticError,
    });
  }

  function notifyHook(code: string, run: () => void): void {
    try {
      run();
    } catch (error) {
      options.diagnostics?.emit({
        channel: "transport.cache",
        code,
        severity: "error",
        message: "Transport cache hook failed.",
        at: clock.now(),
        error: redactHolmErrorForDiagnostic(error),
      });
    }
  }

  return Object.freeze({
    get size(): number {
      return entries.size;
    },
    getOrLoad,
    read,
    delete: deleteEntry,
    invalidate,
    invalidateForMutation,
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

function normalizeInvalidationInput(input: TransportCacheInvalidationInput): NormalizedInvalidationInput {
  const partition = input.partition === undefined ? undefined : normalizePartition(input.partition);
  const tags = normalizeTags(input.tags ?? []);
  const prefixes = normalizePrefixes(input.prefixes ?? []);
  const requestKeys = Object.freeze([...(input.requests ?? []).map((item) => createTransportCacheKey(item))].sort());
  if (tags.length === 0 && prefixes.length === 0 && requestKeys.length === 0) {
    throw new TypeError("Transport cache invalidation requires a tag, prefix, or request key.");
  }
  return Object.freeze({
    ...(partition === undefined ? {} : { partition }),
    tags,
    prefixes,
    requestKeys,
  });
}

function normalizeTags(tags: readonly string[]): readonly string[] {
  return normalizeUniqueStrings(tags, "tag");
}

function normalizePrefixes(prefixes: readonly string[]): readonly string[] {
  return normalizeUniqueStrings(prefixes, "prefix");
}

function normalizeUniqueStrings(values: readonly string[], label: string): readonly string[] {
  const normalized = [...new Set(values.map((value) => normalizeNonEmpty(value, label)))].sort();
  return Object.freeze(normalized);
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

function samePartition(left: TransportCachePartition, right: TransportCachePartition): boolean {
  return left.callerFingerprint === right.callerFingerprint && left.source.id === right.source.id && left.source.surface === right.source.surface;
}

function intersects(left: readonly string[], right: readonly string[]): boolean {
  return left.some((item) => right.includes(item));
}

function invokeLoader(loader: TransportCacheLoader): Promise<OperationResponse> {
  try {
    return Promise.resolve(loader());
  } catch (error) {
    return Promise.reject(error);
  }
}

function redactHolmErrorForDiagnostic(error: unknown): unknown {
  if (!(error instanceof HolmError)) {
    return error;
  }
  // Free-form HolmError messages are not public transport diagnostics unless a
  // future API explicitly classifies them safe. Preserve code/kind/status/details
  // and redact the message before hooks or diagnostics serialize it.
  return new HolmError({
    kind: error.kind,
    code: error.code,
    message: "Holm error message redacted.",
    details: error.details,
    ...(error.status === undefined ? {} : { status: error.status }),
    ...(error.retryable === undefined ? {} : { retryable: error.retryable }),
  });
}

function copyOperationResponse(response: OperationResponse): OperationResponse {
  return Object.freeze({
    requestId: normalizeNonEmpty(response.requestId, "response requestId"),
    payload: copyWireValue(response.payload),
    ...(response.metadata === undefined ? {} : { metadata: copyWireValue(response.metadata) }),
  });
}

function diagnosticDetailsForEntry(key: string, entry: CacheEntry): unknown {
  return Object.freeze({
    key,
    partition: entry.partition,
    request: redactTransportRequestMetadata(entry.request),
    tags: entry.tags,
    storedAt: entry.storedAt,
    expiresAt: entry.expiresAt,
    staleUntil: entry.staleUntil,
  });
}
