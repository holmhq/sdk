export function createWebSessionAuth(options = {}) {
    const credentials = normalizeCredentials(options.credentials ?? "same-origin");
    const proof = Object.freeze({ kind: "web-session", credentials });
    return Object.freeze({
        current() {
            return proof;
        },
    });
}
export function createWebTokenAuth(options) {
    const scheme = normalizeTokenPart(options.scheme ?? "Bearer", "scheme");
    validateTokenSource(options.token);
    return Object.freeze({
        current() {
            return Object.freeze({
                kind: "bearer",
                scheme,
                token: resolveToken(options.token),
            });
        },
    });
}
function normalizeCredentials(credentials) {
    if (credentials !== "same-origin" && credentials !== "include" && credentials !== "omit") {
        throw new TypeError("Web session credentials must be same-origin, include, or omit.");
    }
    return credentials;
}
function validateTokenSource(source) {
    resolveToken(source);
}
function resolveToken(source) {
    return normalizeTokenPart(typeof source === "function" ? source() : source, "token");
}
function normalizeTokenPart(value, label) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError(`Web token auth ${label} must be non-empty.`);
    }
    return normalized;
}
//# sourceMappingURL=auth.js.map