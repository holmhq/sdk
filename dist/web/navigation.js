export function createWebNavigation(location = defaultWebLocation()) {
    if (location === null || location === undefined) {
        throw new TypeError("Web navigation requires a location service.");
    }
    return Object.freeze({
        assign(href) {
            if (typeof location.assign === "function") {
                location.assign(href);
            }
            else {
                location.href = href;
            }
        },
    });
}
function defaultWebLocation() {
    const webGlobal = globalThis;
    if (typeof webGlobal.location !== "object" || webGlobal.location === null) {
        return undefined;
    }
    return webGlobal.location;
}
//# sourceMappingURL=navigation.js.map