export function createNodeTokenAuth(options) {
    const scheme = normalizePart(options.scheme ?? "Bearer", "scheme");
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
function validateTokenSource(source) {
    resolveToken(source);
}
function resolveToken(source) {
    return normalizePart(typeof source === "function" ? source() : source, "token");
}
function normalizePart(value, label) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError(`Node token auth ${label} must be non-empty.`);
    }
    return normalized;
}
//# sourceMappingURL=index.js.map