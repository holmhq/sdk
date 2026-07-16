const hasOwn = Object.prototype.hasOwnProperty;
export function readWebAppSurfaceBootstrap(options = {}) {
    const source = hasOwn.call(options, "surfaces")
        ? options.surfaces
        : (options.runtimeGlobal ?? defaultRuntimeGlobal()).__HOLM_SURFACES__;
    if (!isRecord(source)) {
        return Object.freeze({});
    }
    const surfaces = {
        ...surfaceEntry("analytics", source.analytics),
        ...surfaceEntry("settings", source.settings),
        ...surfaceEntry("members", source.members),
        ...surfaceEntry("account", source.account),
        ...surfaceEntry("login", source.login),
        ...surfaceEntry("logout", source.logout),
        ...surfaceEntry("browserEvents", source.browserEvents ?? source.browser_events),
    };
    return Object.freeze(surfaces);
}
function defaultRuntimeGlobal() {
    return globalThis;
}
function surfaceEntry(key, value) {
    if (typeof value !== "string") {
        return Object.freeze({});
    }
    const normalized = value.trim();
    return normalized === ""
        ? Object.freeze({})
        : Object.freeze({ [key]: normalized });
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=bootstrap.js.map