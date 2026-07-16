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
export declare function createWebLifecycle(options?: WebLifecycleOptions): WebLifecycle;
//# sourceMappingURL=lifecycle.d.ts.map