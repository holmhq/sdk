import { createCallerPartitionedCacheKey, normalizeCacheSourceIdentity, } from "../core/cache-key.js";
import { copyWireValue } from "../core/wire-value.js";
export function createTransportCache(options) {
    const clock = options.clock;
    const scheduler = options.scheduler;
    const maxEntries = normalizeMaxEntries(options.maxEntries);
    const entries = new Map();
    const inflight = new Map();
    const scheduledRefreshes = new Map();
    const keyGenerations = new Map();
    let clearGeneration = 0;
    async function getOrLoad(input, loader) {
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
    function read(input) {
        const key = createTransportCacheKey(input);
        const entry = entries.get(key);
        if (entry === undefined) {
            return undefined;
        }
        touch(key, entry);
        return copyOperationResponse(entry.response);
    }
    function deleteEntry(input) {
        const key = createTransportCacheKey(input);
        return removeCacheKey(key);
    }
    function invalidate(input) {
        return invalidateEntries(input, "explicit");
    }
    function invalidateForMutation(input) {
        return invalidateEntries(input, "mutation");
    }
    function clear() {
        entries.clear();
        for (const scheduled of scheduledRefreshes.values()) {
            scheduled.task.cancel();
        }
        scheduledRefreshes.clear();
        inflight.clear();
        keyGenerations.clear();
        clearGeneration += 1;
    }
    function normalizeGetInput(input) {
        return Object.freeze({
            partition: normalizePartition(input.partition),
            request: input.request,
            policy: normalizePolicy(input.policy),
            tags: normalizeTags(input.tags ?? []),
            key: createTransportCacheKey(input),
        });
    }
    function loadShared(input, loader, onError) {
        const pending = inflight.get(input.key);
        if (pending !== undefined) {
            return pending.promise;
        }
        const token = Object.freeze({});
        const keyGeneration = currentKeyGeneration(input.key);
        const loadClearGeneration = clearGeneration;
        const next = invokeLoader(loader)
            .then((response) => storeIfCurrent(input, response, keyGeneration, loadClearGeneration), (error) => {
            onError?.(error);
            throw error;
        })
            .finally(() => {
            if (inflight.get(input.key)?.token === token) {
                inflight.delete(input.key);
            }
        });
        inflight.set(input.key, Object.freeze({ promise: next, token, keyGeneration, clearGeneration: loadClearGeneration, input }));
        return next;
    }
    function storeIfCurrent(input, response, keyGeneration, loadClearGeneration) {
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
        });
        entries.delete(input.key);
        entries.set(input.key, entry);
        evictLeastRecentlyUsed();
        emitUpdate(input.key, entry);
        return stored;
    }
    function touch(key, entry) {
        entries.delete(key);
        entries.set(key, entry);
    }
    function evictLeastRecentlyUsed() {
        while (entries.size > maxEntries) {
            const oldest = entries.keys().next().value;
            if (oldest === undefined) {
                return;
            }
            entries.delete(oldest);
        }
    }
    function invalidateEntries(input, reason) {
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
        const result = Object.freeze({ removed, keys: Object.freeze([...keys].sort()) });
        emitInvalidation(reason, normalized, result);
        return result;
    }
    function removeCacheKey(key) {
        const deleted = entries.delete(key);
        cancelScheduledRefresh(key);
        inflight.delete(key);
        advanceKeyGeneration(key);
        return deleted;
    }
    function matchesInvalidation(entry, input) {
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
    function scheduleBackgroundRefresh(input, loader) {
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
            void loadShared(input, loader, (error) => {
                emitBackgroundError(input, error);
            }).catch(() => undefined);
        });
        scheduledRefreshes.set(input.key, Object.freeze({ task, token, keyGeneration, clearGeneration: refreshClearGeneration }));
    }
    function cancelScheduledRefresh(key) {
        const scheduled = scheduledRefreshes.get(key);
        if (scheduled === undefined) {
            return;
        }
        scheduled.task.cancel();
        scheduledRefreshes.delete(key);
    }
    function currentKeyGeneration(key) {
        return keyGenerations.get(key) ?? 0;
    }
    function advanceKeyGeneration(key) {
        keyGenerations.set(key, currentKeyGeneration(key) + 1);
    }
    function isCurrentGeneration(key, keyGeneration, loadClearGeneration) {
        return clearGeneration === loadClearGeneration && currentKeyGeneration(key) === keyGeneration;
    }
    function emitUpdate(key, entry) {
        const event = Object.freeze({
            key,
            partition: entry.partition,
            request: entry.request,
            tags: entry.tags,
            storedAt: entry.storedAt,
            expiresAt: entry.expiresAt,
            staleUntil: entry.staleUntil,
        });
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
    function emitInvalidation(reason, input, result) {
        const event = Object.freeze({
            reason,
            removed: result.removed,
            keys: result.keys,
            tags: input.tags,
            prefixes: input.prefixes,
            ...(input.partition === undefined ? {} : { partition: input.partition }),
        });
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
    function emitBackgroundError(input, error) {
        const event = Object.freeze({
            key: input.key,
            partition: input.partition,
            request: input.request,
            tags: input.tags,
            error,
        });
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
                request: redactCacheDiagnosticRequest(input.request),
                tags: input.tags,
            },
            error,
        });
    }
    function notifyHook(code, run) {
        try {
            run();
        }
        catch (error) {
            options.diagnostics?.emit({
                channel: "transport.cache",
                code,
                severity: "error",
                message: "Transport cache hook failed.",
                at: clock.now(),
                error,
            });
        }
    }
    return Object.freeze({
        get size() {
            return entries.size;
        },
        getOrLoad,
        read,
        delete: deleteEntry,
        invalidate,
        invalidateForMutation,
        clear,
    });
}
export function createTransportCacheKey(input) {
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
function normalizePartition(partition) {
    return Object.freeze({
        source: normalizeCacheSourceIdentity(partition.source),
        callerFingerprint: normalizeNonEmpty(partition.callerFingerprint, "caller fingerprint"),
    });
}
function normalizePolicy(policy) {
    const ttlMs = normalizeDuration(policy.ttlMs, "ttlMs");
    const swrMs = normalizeDuration(policy.swrMs ?? 0, "swrMs");
    return Object.freeze({
        ttlMs,
        swrMs,
        mode: normalizeMode(policy.mode ?? "default"),
    });
}
function normalizeMode(mode) {
    if (mode !== "default" && mode !== "reload" && mode !== "no-store") {
        throw new TypeError(`Unknown transport cache mode: ${String(mode)}`);
    }
    return mode;
}
function normalizeInvalidationInput(input) {
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
function normalizeTags(tags) {
    return normalizeUniqueStrings(tags, "tag");
}
function normalizePrefixes(prefixes) {
    return normalizeUniqueStrings(prefixes, "prefix");
}
function normalizeUniqueStrings(values, label) {
    const normalized = [...new Set(values.map((value) => normalizeNonEmpty(value, label)))].sort();
    return Object.freeze(normalized);
}
function normalizeDuration(value, name) {
    if (!Number.isFinite(value) || value < 0) {
        throw new TypeError(`Transport cache ${name} must be a non-negative finite number.`);
    }
    return value;
}
function normalizeMaxEntries(maxEntries) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
        throw new TypeError("Transport cache maxEntries must be a positive integer.");
    }
    return maxEntries;
}
function normalizeCacheableGetRequest(request) {
    if (request.method !== "GET") {
        throw new TypeError("Transport cache only accepts GET requests.");
    }
    if (request.body !== undefined) {
        throw new TypeError("Transport cache GET requests must not include a body.");
    }
    return request;
}
function normalizeNonEmpty(value, label) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError(`Transport cache ${label} must be a non-empty string.`);
    }
    return normalized;
}
function samePartition(left, right) {
    return left.callerFingerprint === right.callerFingerprint && left.source.id === right.source.id && left.source.surface === right.source.surface;
}
function intersects(left, right) {
    return left.some((item) => right.includes(item));
}
function invokeLoader(loader) {
    try {
        return Promise.resolve(loader());
    }
    catch (error) {
        return Promise.reject(error);
    }
}
function copyOperationResponse(response) {
    return Object.freeze({
        requestId: normalizeNonEmpty(response.requestId, "response requestId"),
        payload: copyWireValue(response.payload),
        ...(response.metadata === undefined ? {} : { metadata: copyWireValue(response.metadata) }),
    });
}
function diagnosticDetailsForEntry(key, entry) {
    return Object.freeze({
        key,
        partition: entry.partition,
        request: redactCacheDiagnosticRequest(entry.request),
        tags: entry.tags,
        storedAt: entry.storedAt,
        expiresAt: entry.expiresAt,
        staleUntil: entry.staleUntil,
    });
}
function redactCacheDiagnosticRequest(request) {
    return Object.freeze({
        method: request.method,
        url: request.url,
        params: request.params,
        headers: redactHeaders(request.headers),
        responseMode: request.responseMode,
        ...(request.timeoutMs === undefined ? {} : { timeoutMs: request.timeoutMs }),
    });
}
function redactHeaders(headers) {
    const output = {};
    for (const key of Object.keys(headers).sort()) {
        output[key] = isSensitiveHeader(key) ? "[redacted]" : headers[key];
    }
    return Object.freeze(output);
}
function isSensitiveHeader(name) {
    return /authorization|cookie|credential|password|secret|token|x-api-key/i.test(name);
}
//# sourceMappingURL=cache.js.map