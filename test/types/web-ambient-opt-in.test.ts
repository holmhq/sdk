import type { CapabilityRequirement, RuntimeAdapter } from "../../src/core/index.js";
import {
  HOLM_APP_HTTP_CAPABILITY,
  WEB_HTTP_REQUEST_OPERATION,
  createWebApp,
  createWebCaller,
  createWebLifecycle,
  createWebUploadService,
  webRuntime,
  type WebApp,
  type WebRuntimeCacheOptions,
  type WebRuntimeOptions,
} from "../../src/web/index.js";

const userAgent: string = window.navigator.userAgent;
const element: HTMLElement = document.createElement("holm-fixture");
const cache: WebRuntimeCacheOptions = { ttlMs: 30_000, swrMs: 60_000, maxEntries: 100 };
const options: WebRuntimeOptions = {
  baseUrl: new URL("https://app.example.test/"),
  fetch,
  cache,
};
const runtime: RuntimeAdapter = webRuntime(options);
const caller = createWebCaller({ appId: "app_sales", origin: window.location.origin });
const uploadService = createWebUploadService({ baseUrl: new URL("https://app.example.test/"), fetch });
const app: WebApp = createWebApp({ runtime: options, caller, uploads: uploadService });
const lifecycle = createWebLifecycle({ document, page: window });
const capability: CapabilityRequirement = HOLM_APP_HTTP_CAPABILITY;
const operation: "request" = WEB_HTTP_REQUEST_OPERATION;

// @ts-expect-error Web runtime URLs must be strings or URL instances.
webRuntime({ baseUrl: 42 });

void userAgent;
void element;
void cache;
void runtime;
void caller;
void uploadService;
void app;
void lifecycle;
void capability;
void operation;
