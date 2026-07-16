import { withUploadPath, } from "./upload.js";
export function createAppLinksApi(http, upload) {
    return Object.freeze({
        list(appId, filters = {}) {
            return http.get(linksPath(appId), {
                params: filters,
                reason: "app.links.list",
            });
        },
        get(appId, idOrSlug) {
            return http.get(linkPath(appId, idOrSlug), { reason: "app.links.get" });
        },
        create(appId, data) {
            return http.post(linksPath(appId), data, { reason: "app.links.create" });
        },
        update(appId, idOrSlug, data) {
            return http.patch(linkPath(appId, idOrSlug), data, { reason: "app.links.update" });
        },
        delete(appId, idOrSlug) {
            return http.delete(linkPath(appId, idOrSlug), { reason: "app.links.delete" });
        },
        import(appId, request) {
            return upload(withUploadPath(`${linksPath(appId)}/import`, request));
        },
    });
}
function linksPath(appId) {
    return `/api/apps/${encodePathSegment(appId, "App id")}/links`;
}
function linkPath(appId, idOrSlug) {
    return `${linksPath(appId)}/${encodePathSegment(idOrSlug, "Link id or slug")}`;
}
function encodePathSegment(value, label) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError(`${label} must be non-empty.`);
    }
    return encodeURIComponent(normalized);
}
//# sourceMappingURL=links.js.map