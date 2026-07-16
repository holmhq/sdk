export function createAppAuthApi(http, navigation) {
    function loginHref(options = {}) {
        return appendQuery("/auth/login", [["redirect", options.redirect]]);
    }
    function qrScannerHref(options = {}) {
        return appendQuery("/auth/qr/scanner", [
            ["app", options.appId],
            ["redirect", options.redirect],
        ]);
    }
    return Object.freeze({
        me() {
            return http.get("/api/me", { reason: "app.auth.me" });
        },
        loginHref,
        login(options = {}) {
            return navigate(loginHref(options), navigation);
        },
        qrScannerHref,
        scanQRCode(options = {}) {
            return navigate(qrScannerHref(options), navigation);
        },
        startAnonymous(options = {}) {
            return http.post("/auth/anonymous/start", appBody(options.appId), { reason: "app.auth.start-anonymous" });
        },
        promoteAnonymous(options = {}) {
            return http.post("/auth/anonymous/promote", appBody(options.appId), { reason: "app.auth.promote-anonymous" });
        },
        requestMagicLink(email, options = {}) {
            return http.post("/auth/magic/request", {
                email: requireNonEmpty(email, "Magic-link email"),
                ...(options.redirect === undefined ? {} : { redirect: options.redirect }),
                ...(options.appId === undefined ? {} : { app: options.appId }),
            }, { reason: "app.auth.request-magic-link" });
        },
        completeMagicLink(input) {
            return http.post("/auth/magic/complete", normalizeMagicLinkInput(input), { reason: "app.auth.complete-magic-link" });
        },
        logout() {
            return http.post("/auth/logout", {}, { reason: "app.auth.logout" });
        },
    });
}
function navigate(href, navigation) {
    navigation?.assign(href);
    return href;
}
function appendQuery(path, entries) {
    const query = entries
        .filter((entry) => entry[1] !== undefined && entry[1] !== "")
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("&");
    return query === "" ? path : `${path}?${query}`;
}
function appBody(appId) {
    return appId === undefined ? Object.freeze({}) : Object.freeze({ app: appId });
}
function normalizeMagicLinkInput(input) {
    if (typeof input === "string") {
        return Object.freeze({ token: requireNonEmpty(input, "Magic-link token") });
    }
    if ("token" in input) {
        return Object.freeze({ token: requireNonEmpty(input.token, "Magic-link token") });
    }
    return Object.freeze({
        email: requireNonEmpty(input.email, "Magic-link email"),
        key: requireNonEmpty(input.key, "Magic-link key"),
    });
}
function requireNonEmpty(value, label) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError(`${label} must be non-empty.`);
    }
    return normalized;
}
//# sourceMappingURL=auth.js.map