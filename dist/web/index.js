export function createWebSessionAuth(options = {}) {
    const credentials = normalizeCredentials(options.credentials ?? "same-origin");
    const proof = Object.freeze({ kind: "web-session", credentials });
    return Object.freeze({
        current() {
            return proof;
        },
    });
}
function normalizeCredentials(credentials) {
    if (credentials !== "same-origin" && credentials !== "include" && credentials !== "omit") {
        throw new TypeError("Web session credentials must be same-origin, include, or omit.");
    }
    return credentials;
}
//# sourceMappingURL=index.js.map