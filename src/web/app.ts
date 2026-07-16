import {
  createAppExtension,
  type AppApi,
  type AppNavigationService,
  type AppRequestIdFactory,
  type AppSurfaceBootstrap,
  type AppUploadService,
} from "../app/index.js";
import type { CallerProvider } from "../core/caller.js";
import type { HolmDiagnosticsSink } from "../core/diagnostics.js";
import {
  createHolm,
  type Holm,
} from "../core/create-holm.js";
import type {
  ExtensionNamespaces,
  HolmExtension,
} from "../core/extensions.js";
import { readWebAppSurfaceBootstrap, type WebAppSurfaceBootstrapOptions } from "./bootstrap.js";
import { createWebCaller, type WebCallerOptions } from "./caller.js";
import { createWebNavigation } from "./navigation.js";
import { webRuntime, type WebRuntimeOptions } from "./runtime.js";
import { createWebUploadService } from "./upload-service.js";

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

const hasOwn = Object.prototype.hasOwnProperty;

export function createWebApp(options: WebAppOptions = {}): WebApp {
  const runtimeOptions = options.runtime ?? {};
  const runtime = webRuntime(runtimeOptions);
  const caller = resolveCaller(options.caller);
  const navigation = resolveNavigation(options.navigation);
  const uploads = resolveUploads(options.uploads, runtimeOptions);
  const surfaces = hasOwn.call(options, "surfaces")
    ? (options.surfaces ?? {})
    : readWebAppSurfaceBootstrap(options.surfaceBootstrap);
  const extension = createAppExtension({
    ...(options.requestId === undefined ? {} : { requestId: options.requestId }),
    ...(navigation === undefined ? {} : { navigation }),
    ...(uploads === undefined ? {} : { uploads }),
    surfaces,
  });
  return createHolm({
    runtime,
    caller,
    extensions: [extension] as const,
    ...((options.diagnostics ?? runtimeOptions.diagnostics) === undefined
      ? {}
      : { diagnostics: options.diagnostics ?? runtimeOptions.diagnostics }),
  });
}

function resolveCaller(caller: CallerProvider | WebCallerOptions | undefined): CallerProvider {
  if (caller !== undefined && typeof (caller as CallerProvider).current === "function") {
    return caller as CallerProvider;
  }
  return createWebCaller(caller as WebCallerOptions | undefined);
}

function resolveNavigation(
  navigation: AppNavigationService | false | undefined,
): AppNavigationService | undefined {
  if (navigation === false) {
    return undefined;
  }
  if (navigation !== undefined) {
    return navigation;
  }
  try {
    return createWebNavigation();
  } catch {
    return undefined;
  }
}

function resolveUploads(
  uploads: AppUploadService | false | undefined,
  runtime: WebRuntimeOptions,
): AppUploadService | undefined {
  if (uploads === false) {
    return undefined;
  }
  if (uploads !== undefined) {
    return uploads;
  }
  return createWebUploadService({
    ...(runtime.baseUrl === undefined ? {} : { baseUrl: runtime.baseUrl }),
    ...(runtime.fetch === undefined ? {} : { fetch: runtime.fetch }),
    ...(runtime.auth === undefined ? {} : { auth: runtime.auth }),
  });
}
