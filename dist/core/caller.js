import { canonicalEncodeWireValue, copyWireValue } from "./wire-value.js";
export function createStaticCallerProvider(context) {
    const normalized = normalizeCallerContext(context);
    return Object.freeze({
        current() {
            return normalizeCallerContext(normalized);
        },
    });
}
export async function resolveCallerContext(provider) {
    return normalizeCallerContext(await provider.current());
}
export function createInvocationContext(context, invocationId, startedAt, reason) {
    const normalized = normalizeCallerContext(context);
    return Object.freeze({
        ...normalized,
        invocationId,
        startedAt,
        ...(reason === undefined ? {} : { reason }),
    });
}
export function createCallerFingerprint(context) {
    const encoded = canonicalEncodeWireValue(callerFingerprintMaterial(context));
    return `caller:v1:${hashFingerprint(encoded)}`;
}
export function normalizeCallerContext(context) {
    return Object.freeze({
        surface: context.surface,
        principal: normalizePrincipal(context.principal),
        ...(context.app === undefined ? {} : { app: normalizeApp(context.app) }),
        ...(context.scope === undefined ? {} : { scope: normalizeScope(context.scope) }),
        ...(context.origin === undefined ? {} : { origin: context.origin }),
    });
}
function callerFingerprintMaterial(context) {
    const normalized = normalizeCallerContext(context);
    return copyWireValue({
        surface: normalized.surface,
        principal: normalized.principal,
        ...(normalized.app === undefined ? {} : { app: normalized.app }),
        ...(normalized.scope === undefined ? {} : { scope: normalized.scope }),
        ...(normalized.origin === undefined ? {} : { origin: normalized.origin }),
    });
}
function normalizePrincipal(principal) {
    switch (principal.kind) {
        case "anonymous":
            return Object.freeze({ kind: "anonymous" });
        case "browser-session":
            return Object.freeze({ kind: "browser-session" });
        case "member":
            return Object.freeze({ kind: "member", id: principal.id });
        case "operator":
            return Object.freeze({
                kind: "operator",
                ...(principal.id === undefined ? {} : { id: principal.id }),
            });
        case "agent":
            return Object.freeze({ kind: "agent", memberId: principal.memberId });
        case "service":
            return Object.freeze({ kind: "service", id: principal.id });
    }
}
function normalizeApp(app) {
    return Object.freeze({ id: app.id });
}
function normalizeScope(scope) {
    return Object.freeze({
        id: scope.id,
        ...(scope.type === undefined ? {} : { type: scope.type }),
    });
}
function hashFingerprint(value) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
}
//# sourceMappingURL=caller.js.map