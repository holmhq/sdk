import { canonicalEncodeWireValue, copyWireValue } from "./wire-value.js";
export function createCallerPartitionedCacheKey(input) {
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
export function normalizeCacheSourceIdentity(source) {
    return Object.freeze({
        id: normalizeNonEmpty(source.id, "cache source id"),
        ...(source.surface === undefined ? {} : { surface: source.surface }),
    });
}
function normalizeNonEmpty(value, label) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError(`${label} must be a non-empty string.`);
    }
    return normalized;
}
//# sourceMappingURL=cache-key.js.map