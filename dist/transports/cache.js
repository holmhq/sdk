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
        const deleted = entries.delete(key);
        cancelScheduledRefresh(key);
        inflight.delete(key);
        advanceKeyGeneration(key);
        return deleted;
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
            .then((response) => storeIfCurrent(input.key, response, input.policy, keyGeneration, loadClearGeneration), (error) => {
            onError?.(error);
            throw error;
        })
            .finally(() => {
            if (inflight.get(input.key)?.token === token) {
                inflight.delete(input.key);
            }
        });
        inflight.set(input.key, Object.freeze({ promise: next, token, keyGeneration, clearGeneration: loadClearGeneration }));
        return next;
    }
    function storeIfCurrent(key, response, policy, keyGeneration, loadClearGeneration) {
        const stored = copyOperationResponse(response);
        if (!isCurrentGeneration(key, keyGeneration, loadClearGeneration)) {
            return stored;
        }
        const storedAt = clock.now();
        const entry = Object.freeze({
            response: stored,
            storedAt,
            expiresAt: storedAt + policy.ttlMs,
            staleUntil: storedAt + policy.ttlMs + policy.swrMs,
        });
        entries.delete(key);
        entries.set(key, entry);
        evictLeastRecentlyUsed();
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
                options.onBackgroundError?.(Object.freeze({
                    key: input.key,
                    partition: input.partition,
                    request: input.request,
                    error,
                }));
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
    return Object.freeze({
        get size() {
            return entries.size;
        },
        getOrLoad,
        read,
        delete: deleteEntry,
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
//# sourceMappingURL=cache.js.map