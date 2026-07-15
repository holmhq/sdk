import { canonicalEncodeWireValue, copyWireValue } from "./wire-value.js";
export function onCallerTransition(provider, listener) {
    if (provider.subscribe === undefined) {
        return () => undefined;
    }
    return provider.subscribe(listener);
}
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
    let h1 = 0xdeadbeef ^ value.length;
    let h2 = 0x41c6ce57 ^ value.length;
    let h3 = 0xc0decafe ^ value.length;
    let h4 = 0x9e3779b9 ^ value.length;
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        h1 = Math.imul(h1 ^ code, 0x85ebca6b);
        h2 = Math.imul(h2 ^ code, 0xc2b2ae35);
        h3 = Math.imul(h3 ^ code, 0x27d4eb2f);
        h4 = Math.imul(h4 ^ code, 0x165667b1);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 0x85ebca6b);
    h2 = Math.imul(h2 ^ (h2 >>> 13), 0xc2b2ae35);
    h3 = Math.imul(h3 ^ (h3 >>> 16), 0x27d4eb2f);
    h4 = Math.imul(h4 ^ (h4 >>> 13), 0x165667b1);
    return [h1 ^ h2, h2 ^ h3, h3 ^ h4, h4 ^ h1].map(toFingerprintLane).join("");
}
function toFingerprintLane(value) {
    return (value >>> 0).toString(16).padStart(8, "0");
}
//# sourceMappingURL=caller.js.map