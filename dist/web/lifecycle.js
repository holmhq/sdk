export function createWebLifecycle(options = {}) {
    const document = options.document === undefined ? defaultDocument() : options.document;
    const page = options.page === undefined ? defaultPage() : options.page;
    const listeners = new Set();
    let attached = false;
    let disposed = false;
    const onVisibility = () => emit("visibility");
    const onPageShow = (event) => emit("page-show", readPersisted(event));
    const onPageHide = (event) => emit("page-hide", readPersisted(event));
    function visibility() {
        return normalizeVisibility(document?.visibilityState);
    }
    function emit(kind, persisted) {
        const event = Object.freeze({
            kind,
            visibility: visibility(),
            ...(persisted === undefined ? {} : { persisted }),
        });
        for (const listener of [...listeners]) {
            if (!listeners.has(listener)) {
                continue;
            }
            try {
                listener(event);
            }
            catch {
                // Lifecycle observers cannot interrupt browser event delivery.
            }
        }
    }
    function attach() {
        if (attached) {
            return;
        }
        attached = true;
        document?.addEventListener("visibilitychange", onVisibility);
        page?.addEventListener("pageshow", onPageShow);
        page?.addEventListener("pagehide", onPageHide);
    }
    function detach() {
        if (!attached) {
            return;
        }
        attached = false;
        document?.removeEventListener("visibilitychange", onVisibility);
        page?.removeEventListener("pageshow", onPageShow);
        page?.removeEventListener("pagehide", onPageHide);
    }
    return Object.freeze({
        visibility,
        subscribe(listener) {
            if (disposed) {
                throw new TypeError("Web lifecycle has been disposed.");
            }
            listeners.add(listener);
            attach();
            let active = true;
            return () => {
                if (!active) {
                    return;
                }
                active = false;
                listeners.delete(listener);
                if (listeners.size === 0) {
                    detach();
                }
            };
        },
        dispose() {
            if (disposed) {
                return;
            }
            disposed = true;
            listeners.clear();
            detach();
        },
    });
}
function normalizeVisibility(value) {
    return value === "visible" || value === "hidden" ? value : "unknown";
}
function readPersisted(event) {
    if (typeof event !== "object" || event === null) {
        return undefined;
    }
    const persisted = event.persisted;
    return typeof persisted === "boolean" ? persisted : undefined;
}
function defaultDocument() {
    const browser = globalThis;
    return browser.document ?? null;
}
function defaultPage() {
    const browser = globalThis;
    return browser.window ?? null;
}
//# sourceMappingURL=lifecycle.js.map