import { type AppApi, type AppNavigationService, type AppRequestIdFactory, type AppSurfaceBootstrap, type AppUploadService } from "../app/index.js";
import type { CallerProvider } from "../core/caller.js";
import type { HolmDiagnosticsSink } from "../core/diagnostics.js";
import { type Holm } from "../core/create-holm.js";
import type { ExtensionNamespaces, HolmExtension } from "../core/extensions.js";
import { type WebAppSurfaceBootstrapOptions } from "./bootstrap.js";
import { type WebCallerOptions } from "./caller.js";
import { type WebRuntimeOptions } from "./runtime.js";
export interface WebAppOptions {
    readonly runtime?: WebRuntimeOptions;
    readonly caller?: CallerProvider | WebCallerOptions;
    readonly navigation?: AppNavigationService | false;
    readonly uploads?: AppUploadService | false;
    readonly surfaces?: AppSurfaceBootstrap | undefined;
    readonly surfaceBootstrap?: WebAppSurfaceBootstrapOptions;
    readonly requestId?: AppRequestIdFactory;
    readonly diagnostics?: HolmDiagnosticsSink;
}
type WebAppExtension = HolmExtension<AppApi, "app">;
type WebAppExtensions = readonly [WebAppExtension];
export type WebApp = Holm<WebAppExtensions> & ExtensionNamespaces<WebAppExtensions>;
export declare function createWebApp(options?: WebAppOptions): WebApp;
export {};
//# sourceMappingURL=app.d.ts.map