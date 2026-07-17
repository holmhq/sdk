// @holmhq/sdk browser-bfbb-composition: Complete private v0.1-web browser/BFBB convenience composition for vendored ESM use.
export * from "./index.js";
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
export * as test from "./test/index.js";
export {
  createFakeClock,
  createInMemoryRuntimeAdapter,
} from "./test/index.js";
//# sourceMappingURL=holm.js.map
