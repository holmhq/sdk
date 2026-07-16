export function createAppPaginate(http) {
    return function paginate(url, options = {}) {
        const limit = normalizeLimit(options.limit ?? 50);
        const params = Object.freeze({ ...(options.params ?? {}) });
        let offset = 0;
        let done = false;
        return Object.freeze({
            async next() {
                if (done) {
                    return emptyPage();
                }
                const payload = await http.get(url, {
                    params: { ...params, limit, offset },
                    reason: "app.paginate.next",
                });
                const items = extractPageItems(payload);
                offset += items.length;
                done = items.length < limit;
                return Object.freeze({ items, done });
            },
            reset() {
                offset = 0;
                done = false;
            },
        });
    };
}
function extractPageItems(payload) {
    if (Array.isArray(payload)) {
        return Object.freeze([...payload]);
    }
    if (typeof payload !== "object" || payload === null) {
        return Object.freeze([]);
    }
    const record = payload;
    const values = Array.isArray(record.entries)
        ? record.entries
        : Array.isArray(record.items)
            ? record.items
            : [];
    return Object.freeze([...values]);
}
function emptyPage() {
    return Object.freeze({ items: Object.freeze([]), done: true });
}
function normalizeLimit(value) {
    if (!Number.isSafeInteger(value) || value < 1) {
        throw new TypeError("App pagination limit must be a positive safe integer.");
    }
    return value;
}
//# sourceMappingURL=pagination.js.map