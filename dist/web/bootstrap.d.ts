import type { AppSurfaceBootstrap } from "../app/surface.js";
export interface WebSurfaceRuntimeGlobal {
    readonly __HOLM_SURFACES__?: unknown;
}
export interface WebAppSurfaceBootstrapOptions {
    readonly surfaces?: AppSurfaceBootstrap | undefined;
    readonly runtimeGlobal?: WebSurfaceRuntimeGlobal;
}
export declare function readWebAppSurfaceBootstrap(options?: WebAppSurfaceBootstrapOptions): Readonly<AppSurfaceBootstrap>;
//# sourceMappingURL=bootstrap.d.ts.map