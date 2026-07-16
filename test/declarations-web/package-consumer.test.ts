import type { CapabilityRequirement, RuntimeAdapter } from "@holmhq/sdk";
import {
  HOLM_APP_HTTP_CAPABILITY,
  WEB_HTTP_REQUEST_OPERATION,
  createWebSessionAuth,
  createWebUploadFile,
  webRuntime,
  type WebRuntimeCacheOptions,
  type WebRuntimeOptions,
  type WebUploadBlobLike,
} from "@holmhq/sdk/web";

const auth = createWebSessionAuth({ credentials: "same-origin" });
const cache: WebRuntimeCacheOptions = { ttlMs: 30_000, swrMs: 60_000, maxEntries: 100 };
const options: WebRuntimeOptions = {
  baseUrl: new URL("https://app.example.test/"),
  fetch,
  auth,
  cache,
};
const runtime: RuntimeAdapter = webRuntime(options);
const capability: CapabilityRequirement = HOLM_APP_HTTP_CAPABILITY;
const operation: "request" = WEB_HTTP_REQUEST_OPERATION;
const blobLike: WebUploadBlobLike = {
  size: 3,
  type: "application/octet-stream",
  slice(start, end, type) {
    return type === undefined ? { size: end - start } : { size: end - start, type };
  },
};
const uploadFile = createWebUploadFile({ field: "web", blob: blobLike, name: "web.bin" });

// @ts-expect-error Web declaration consumers cannot select an unknown credentials mode.
createWebSessionAuth({ credentials: "always" });

void runtime;
void cache;
void capability;
void operation;
void uploadFile;
