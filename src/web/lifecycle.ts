export type WebVisibility = "visible" | "hidden" | "unknown";
export type WebLifecycleEventKind = "visibility" | "page-show" | "page-hide";

export interface WebLifecycleEvent {
  readonly kind: WebLifecycleEventKind;
  readonly visibility: WebVisibility;
  readonly persisted?: boolean;
}

export type WebLifecycleListener = (event: WebLifecycleEvent) => void;

export interface WebLifecycleEventTarget {
  addEventListener(name: string, listener: (event: unknown) => void): void;
  removeEventListener(name: string, listener: (event: unknown) => void): void;
}

export interface WebVisibilitySource extends WebLifecycleEventTarget {
  readonly visibilityState?: string;
}

export interface WebLifecycleOptions {
  readonly document?: WebVisibilitySource | null;
  readonly page?: WebLifecycleEventTarget | null;
}

export interface WebLifecycle {
  visibility(): WebVisibility;
  subscribe(listener: WebLifecycleListener): () => void;
  dispose(): void;
}

export function createWebLifecycle(options: WebLifecycleOptions = {}): WebLifecycle {
  const document = options.document === undefined ? defaultDocument() : options.document;
  const page = options.page === undefined ? defaultPage() : options.page;
  const listeners = new Set<WebLifecycleListener>();
  let attached = false;
  let disposed = false;

  const onVisibility = (): void => emit("visibility");
  const onPageShow = (event: unknown): void => emit("page-show", readPersisted(event));
  const onPageHide = (event: unknown): void => emit("page-hide", readPersisted(event));

  function visibility(): WebVisibility {
    return normalizeVisibility(document?.visibilityState);
  }

  function emit(kind: WebLifecycleEventKind, persisted?: boolean): void {
    const event = Object.freeze({
      kind,
      visibility: visibility(),
      ...(persisted === undefined ? {} : { persisted }),
    }) satisfies WebLifecycleEvent;
    for (const listener of [...listeners]) {
      if (!listeners.has(listener)) {
        continue;
      }
      try {
        listener(event);
      } catch {
        // Lifecycle observers cannot interrupt browser event delivery.
      }
    }
  }

  function attach(): void {
    if (attached) {
      return;
    }
    attached = true;
    document?.addEventListener("visibilitychange", onVisibility);
    page?.addEventListener("pageshow", onPageShow);
    page?.addEventListener("pagehide", onPageHide);
  }

  function detach(): void {
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
    subscribe(listener: WebLifecycleListener): () => void {
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
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      listeners.clear();
      detach();
    },
  });
}

function normalizeVisibility(value: string | undefined): WebVisibility {
  return value === "visible" || value === "hidden" ? value : "unknown";
}

function readPersisted(event: unknown): boolean | undefined {
  if (typeof event !== "object" || event === null) {
    return undefined;
  }
  const persisted = (event as { readonly persisted?: unknown }).persisted;
  return typeof persisted === "boolean" ? persisted : undefined;
}

function defaultDocument(): WebVisibilitySource | null {
  const browser = globalThis as unknown as { readonly document?: WebVisibilitySource };
  return browser.document ?? null;
}

function defaultPage(): WebLifecycleEventTarget | null {
  const browser = globalThis as unknown as { readonly window?: WebLifecycleEventTarget };
  return browser.window ?? null;
}
