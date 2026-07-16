import { normalizeCallerContext, } from "../core/index.js";
const browserSessionPrincipal = Object.freeze({ kind: "browser-session" });
export function createWebCaller(options = {}) {
    validateStaticOptionalString(options.appId, "Web caller app id");
    validateStaticOptionalString(options.origin, "Web caller origin");
    const provider = {
        current() {
            const appId = resolveOptionalString(options.appId, "Web caller app id");
            const origin = resolveOptionalString(options.origin, "Web caller origin");
            const scope = options.scope === undefined ? undefined : resolveSource(options.scope);
            return normalizeCallerContext({
                surface: "web",
                principal: resolveSource(options.principal ?? browserSessionPrincipal),
                ...(appId === undefined ? {} : { app: { id: appId } }),
                ...(scope === undefined ? {} : { scope }),
                ...(origin === undefined ? {} : { origin }),
            });
        },
        ...(options.subscribe === undefined
            ? {}
            : {
                subscribe(listener) {
                    return options.subscribe?.(listener) ?? (() => undefined);
                },
            }),
    };
    return Object.freeze(provider);
}
function resolveSource(source) {
    return typeof source === "function" ? source() : source;
}
function resolveOptionalString(source, label) {
    if (source === undefined) {
        return undefined;
    }
    const value = resolveSource(source);
    if (value === undefined) {
        return undefined;
    }
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError(`${label} must be non-empty.`);
    }
    return normalized;
}
function validateStaticOptionalString(source, label) {
    if (typeof source === "string") {
        resolveOptionalString(source, label);
    }
}
//# sourceMappingURL=caller.js.map