import { ProtocolError } from "../core/errors.js";
export function resolveWebRequestUrl(value, baseUrl, params = {}) {
    const ambientBase = baseUrl ?? readAmbientBaseUrl();
    if (baseUrl !== undefined || isAbsoluteOrAuthorityUrl(value)) {
        if (ambientBase === undefined) {
            throw crossOriginRequest(undefined, absoluteOrigin(value));
        }
        let resolved;
        try {
            resolved = new URL(value, ambientBase);
        }
        catch (cause) {
            throw new ProtocolError({
                code: "invalid_web_request_url",
                message: "Web app request URL is invalid.",
                cause,
            });
        }
        if (resolved.origin !== ambientBase.origin) {
            throw crossOriginRequest(ambientBase.origin, resolved.origin);
        }
        if (resolved.username !== "" || resolved.password !== "") {
            throw new ProtocolError({
                code: "web_credentialed_request_url",
                message: "Web app request URLs cannot contain embedded credentials.",
            });
        }
        appendSearchParams(resolved.searchParams, params);
        return resolved.href;
    }
    return appendRelativeSearchParams(value, params);
}
function readAmbientBaseUrl() {
    const browser = globalThis;
    if (typeof browser.location?.href !== "string" || browser.location.href.trim() === "") {
        return undefined;
    }
    try {
        return new URL(browser.location.href);
    }
    catch {
        return undefined;
    }
}
function isAbsoluteOrAuthorityUrl(value) {
    return /^[A-Za-z][A-Za-z\d+.-]*:/.test(value) || value.startsWith("//") || value.startsWith("\\\\");
}
function absoluteOrigin(value) {
    try {
        return new URL(value).origin;
    }
    catch {
        return undefined;
    }
}
function crossOriginRequest(allowedOrigin, targetOrigin) {
    return new ProtocolError({
        code: "web_cross_origin_request",
        message: "Web app requests cannot send app auth proof across origins.",
        details: {
            ...(allowedOrigin === undefined ? {} : { allowedOrigin }),
            ...(targetOrigin === undefined ? {} : { targetOrigin }),
        },
    });
}
function appendRelativeSearchParams(value, params) {
    const query = createSearchParams(params).toString();
    if (query === "") {
        return value;
    }
    const hashIndex = value.indexOf("#");
    const beforeHash = hashIndex === -1 ? value : value.slice(0, hashIndex);
    const hash = hashIndex === -1 ? "" : value.slice(hashIndex);
    return `${beforeHash}${beforeHash.includes("?") ? "&" : "?"}${query}${hash}`;
}
function createSearchParams(params) {
    const search = new URLSearchParams();
    appendSearchParams(search, params);
    return search;
}
function appendSearchParams(search, params) {
    for (const key of Object.keys(params).sort()) {
        const value = params[key];
        if (value !== null && value !== undefined) {
            search.append(key, String(value));
        }
    }
    search.sort();
}
//# sourceMappingURL=url.js.map