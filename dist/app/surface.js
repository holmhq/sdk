export function createAppSurfaceApi(surfaces = {}) {
    const normalized = normalizeAppSurfaces(surfaces);
    return Object.freeze({
        analyticsUrl: () => normalized.analytics,
        settingsUrl: () => normalized.settings,
        membersUrl: () => normalized.members,
        accountUrl: () => normalized.account,
        loginUrl: (options = {}) => withRedirect(normalized.login, options),
        logoutUrl: (options = {}) => withRedirect(normalized.logout, options),
        browserEventsUrl: () => normalized.browserEvents,
    });
}
export function normalizeAppSurfaces(surfaces = {}) {
    return Object.freeze({
        analytics: normalizeSurfaceUrl(surfaces.analytics),
        settings: normalizeSurfaceUrl(surfaces.settings),
        members: normalizeSurfaceUrl(surfaces.members),
        account: normalizeSurfaceUrl(surfaces.account),
        login: normalizeSurfaceUrl(surfaces.login),
        logout: normalizeSurfaceUrl(surfaces.logout),
        browserEvents: normalizeSurfaceUrl(surfaces.browserEvents ?? surfaces.browser_events),
    });
}
function withRedirect(url, options) {
    if (url === null) {
        return null;
    }
    const redirect = typeof options === "string" ? options : options.redirect;
    if (redirect === undefined || redirect === "") {
        return url;
    }
    const hashIndex = url.indexOf("#");
    const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
    const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
    const separator = beforeHash.includes("?") ? "&" : "?";
    return `${beforeHash}${separator}redirect=${encodeURIComponent(redirect)}${hash}`;
}
function normalizeSurfaceUrl(value) {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim();
    return normalized === "" ? null : normalized;
}
//# sourceMappingURL=surface.js.map