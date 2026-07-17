import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";

import { stableJson } from "./lib/artifacts.mjs";
import { webBundleDefinitions } from "./lib/web-bundles.mjs";

const commonExports = `export * from "./index.js";
export * as core from "./core/index.js";
export * as app from "./app/index.js";
export * as web from "./web/index.js";
export * as transports from "./transports/index.js";
export * as state from "./state/index.js";
export {
  APP_HTTP_INVALIDATE_OPERATION,
  APP_HTTP_REQUEST_OPERATION,
  createAppExtension,
  normalizeAppSurfaces,
} from "./app/index.js";
export {
  HOLM_APP_HTTP_CAPABILITY,
  WEB_HTTP_REQUEST_OPERATION,
  WEB_UPLOAD_PROGRESS_MODE,
  createWebApp,
  createWebCaller,
  createWebLifecycle,
  createWebNavigation,
  createWebSessionAuth,
  createWebTokenAuth,
  createWebUploadFile,
  createWebUploadService,
  createWebUploadSource,
  readWebAppSurfaceBootstrap,
  webRuntime,
} from "./web/index.js";
export {
  RemoteError,
  TransportError,
  UploadError,
  applyTransportAuth,
  canonicalTransportKey,
  composeResumableUpload,
  createReadonlyBytesUploadSource,
  createTransportCache,
  createTransportCacheKey,
  createTransportRequest,
  createUploadFile,
  decodeTransportResponse,
  encodeTransportBody,
  normalizeTransportError,
  redactAuthenticatedTransport,
  redactTransportRequest,
  redactUploadChunk,
  redactUploadRequest,
} from "./transports/index.js";
export {
  REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY,
  createDerivedResource,
  createMutationResource,
  createQueryResource,
  createRealtimeReconcileHook,
  createResourceController,
  createResourceHistory,
} from "./state/index.js";
`;

const testExports = `export * as test from "./test/index.js";
export {
  createFakeClock,
  createInMemoryRuntimeAdapter,
} from "./test/index.js";
`;

for (const definition of webBundleDefinitions) {
  writeBundle(definition);
}

function writeBundle(definition) {
  const body = `${commonExports}${definition.includeTest ? testExports : ""}`;
  const header = `// @holmhq/sdk ${definition.kind}: ${definition.description}\n`;
  const source = `${header}${body}//# sourceMappingURL=${definition.path.split("/").at(-1)}.map\n`;
  const declaration = `${body}//# sourceMappingURL=${definition.declaration.split("/").at(-1)}.map\n`;

  writeArtifact(definition.path, source);
  writeArtifact(definition.declaration, declaration);
  writeArtifact(definition.sourceMap, stableJson(sourceMap(definition.path, source)));
  writeArtifact(definition.declarationMap, stableJson(sourceMap(definition.declaration, declaration)));
}

function writeArtifact(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function sourceMap(path, content) {
  return {
    version: 3,
    file: path.split("/").at(-1),
    sources: [relative(dirname(path), path).split("\\").join("/")],
    sourcesContent: [content],
    names: [],
    mappings: "",
  };
}
