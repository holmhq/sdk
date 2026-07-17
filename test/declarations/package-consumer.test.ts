import {
  canonicalEncodeWireValue,
  createCapabilityRegistry,
  createCallerFingerprint,
  createInvocationContext,
  createCoreEnvironment,
  createDiagnosticsSink,
  createExtensionLifecycle,
  createHolm,
  createReadonlyBytes,
  createStaticCallerProvider,
  type CapabilityOffer,
  type CapabilitySnapshot,
  type CallerContext,
  type ExtensionLifecycle,
  type HolmExtension,
  HolmError,
  ProtocolError,
  TimeoutError,
  runtimeEnvelopeProtocol,
  type RuntimeAdapter,
  type Scheduler,
  type CoreEnvironment,
  type HolmDiagnosticEvent,
  type SerializedHolmError,
  type WireValue,
} from "@holmhq/sdk";
import {
  applyTransportAuth,
  createTransportCache,
  createTransportCacheKey,
  createTransportRequest,
  createReadonlyBytesUploadSource,
  createUploadFile,
  composeResumableUpload,
  decodeTransportResponse,
  redactUploadRequest,
  type ResumableUploadAdapter,
  type TransportCacheInvalidationResult,
  type TransportCachePolicy,
  type TransportCachePartition,
  type TransportRequest,
  type TransportResponseMode,
  type TransportSensitivityInput,
  type UploadCompletion,
  type UploadHandoff,
  type UploadProgressEvent,
  type UploadSession,
} from "@holmhq/sdk/transports";
import {
  HOLM_APP_HTTP_CAPABILITY,
  createAppExtension,
  type AppUploadService,
  type CompleteMagicLinkInput,
} from "@holmhq/sdk/app";
import {
  createNodeOperatorCaller,
  createNodeTokenAuth,
  createNodeUploadFile,
  nodeRuntime,
  nodeRuntimeSupport,
  UnsupportedNodeRuntimeServiceError,
  type NodeRuntimeFetch,
} from "@holmhq/sdk/node";
import {
  createFakeSobekInjectedRuntime,
  sobekRuntime,
  sobekRuntimeSupport,
  UnsupportedSobekRuntimeServiceError,
  type SobekInjectedRequest,
} from "@holmhq/sdk/sobek";
import { createFakeClock, createInMemoryRuntimeAdapter } from "@holmhq/sdk/test";
import {
  createDerivedResource,
  createQueryResource,
  createRealtimeReconcileHook,
  createResourceController,
  createResourceHistory,
  REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY,
  type DerivedResource,
  type Resource,
  type ResourceHistoryEntry,
  type ResourceSnapshot,
} from "@holmhq/sdk/state";

const environment: CoreEnvironment = createCoreEnvironment();
const bytes = createReadonlyBytes([1, 2, 3]);
const value: WireValue = { environment, bytes };
const encoded: string = canonicalEncodeWireValue(value);
const error = new HolmError({
  kind: "serialization",
  code: "invalid_wire_value",
  message: "Invalid wire value",
});
const serialized: SerializedHolmError = error.toJSON();
const registry = createCapabilityRegistry([
  { id: "com.example.reports", origin: "runtime", version: { major: 1, minor: 0 } },
]);
const capability: CapabilityOffer = registry.require({ id: "com.example.reports", major: 1 });
const capabilitySnapshot: CapabilitySnapshot = registry.getSnapshot();
const callerContext: CallerContext = { surface: "test", principal: { kind: "anonymous" } };
const caller = createStaticCallerProvider(callerContext);
const fingerprint: string = createCallerFingerprint(callerContext);
const scheduler: Scheduler = { schedule: () => ({ cancel: () => undefined }) };
const runtime: RuntimeAdapter = {
  id: "runtime-test",
  surface: "test",
  clock: { now: () => 1 },
  scheduler,
  async start() {
    return [];
  },
  async invoke(request) {
    return { requestId: request.requestId, payload: null };
  },
  async dispose() {
    return undefined;
  },
};
const appUploadService: AppUploadService = {
  upload: (request) => ({ path: request.path }),
};
const appExtension = createAppExtension({ uploads: appUploadService });
const appCapability: CapabilityOffer = {
  id: HOLM_APP_HTTP_CAPABILITY.id,
  origin: "runtime",
  version: { major: 1, minor: 0 },
};
const magicInput: CompleteMagicLinkInput = { token: "declaration-token" };
const reportsExtension = {
  id: "com.example.reports",
  namespace: "reports",
  version: { major: 1, minor: 0 },
  setup() {
    return { api: { list: () => ["ready"] as const } };
  },
} satisfies HolmExtension<{ readonly list: () => readonly string[] }, "reports">;
const extensionLifecycle: ExtensionLifecycle = createExtensionLifecycle([reportsExtension] as const, {
  capabilities: createCapabilityRegistry([]),
});
const fake = createFakeClock();
const nodeFetch: NodeRuntimeFetch = async (_input, _init) => ({
  status: 200,
  headers: new Map([["content-type", "application/json"]]),
  text: async () => "{\"data\":{\"ok\":true}}",
  arrayBuffer: async () => new ArrayBuffer(0),
});
const nodeRuntimeAdapter = nodeRuntime({
  fetch: nodeFetch,
  auth: createNodeTokenAuth({ token: "decl-node-token", operatorId: "decl-operator" }),
  clock: fake.clock,
  scheduler: fake.scheduler,
  environment: { get: () => undefined },
  secureStore: { get: () => undefined },
});
const nodeCaller = createNodeOperatorCaller({ operatorId: "decl-operator", app: { id: "decl-app" } });
const nodeServiceError = new UnsupportedNodeRuntimeServiceError({ adapter: "decl-node", service: "environment" });
const sobekCaller = createInvocationContext(
  { surface: "server", principal: { kind: "service", id: "decl-sobek" }, app: { id: "decl-app" } },
  "req-decl-sobek",
  1,
  "declaration",
);
const sobekInjectedRequest: SobekInjectedRequest = {
  requestId: "req-decl-sobek",
  method: "GET",
  path: "/api/declarations",
  query: {},
  headers: {},
  caller: sobekCaller,
};
const sobekFake = createFakeSobekInjectedRuntime({ handler: () => ({ status: 200, body: { ok: true } }) });
const sobekRuntimeAdapter = sobekRuntime({ runtime: sobekFake });
const sobekServiceError = new UnsupportedSobekRuntimeServiceError({ adapter: "decl-sobek", service: "runtime" });
const testRuntime = createInMemoryRuntimeAdapter({ clock: fake.clock, scheduler: fake.scheduler });
const holm = createHolm({ runtime: testRuntime, caller, diagnostics: createDiagnosticsSink() });
const stateController = createResourceController<{ readonly count: number }>();
const stateResource: Resource<{ readonly count: number }> = stateController.resource;
const stateSnapshot: ResourceSnapshot<{ readonly count: number }> = stateController.setReady({ count: 1 });
const stateUnsubscribe = stateResource.subscribe(() => undefined);
stateUnsubscribe();
const derivedState = createDerivedResource({
  dependencies: [stateResource] as const,
  derive(snapshots) {
    return { doubled: (snapshots[0].data?.count ?? 0) * 2 };
  },
});
const typedDerivedState: DerivedResource<{ readonly doubled: number }> = derivedState;
const stateHistory = createResourceHistory(derivedState, { id: "decl-derived" });
const stateHistoryEntries: readonly ResourceHistoryEntry[] = stateHistory.getEntries();
const stateRealtimeCapabilities = createCapabilityRegistry([
  { id: REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY.id, origin: "runtime", version: { major: 1, minor: 0 } },
]);
const stateQuery = createQueryResource({
  key: ["decl-realtime"],
  source: { id: "runtime-test", surface: "test" },
  caller,
  load: () => ({ count: 1 }),
});
const stateRealtimeHook = createRealtimeReconcileHook({ query: stateQuery, capabilities: stateRealtimeCapabilities });
stateRealtimeHook.supports.presence satisfies false;
const stateRealtimeSnapshot = stateRealtimeHook.handle({ kind: "reconcile", data: { count: 2 } });
const timeout = new TimeoutError({ timeoutMs: 1 });
const protocolError = new ProtocolError({ code: "decl_protocol", message: "Declaration protocol error." });
const responseMode: TransportResponseMode = "json";
const transportSensitivity: TransportSensitivityInput = { url: true, params: ["access"], headers: ["x-proof"] };
const transportRequest: TransportRequest = createTransportRequest({
  method: "GET",
  url: "/api/reports",
  responseMode,
  sensitive: transportSensitivity,
});
const cachePolicy: TransportCachePolicy = { ttlMs: 100, swrMs: 25 };
const cachePartition: TransportCachePartition = {
  source: { id: "runtime-test", surface: "test" },
  callerFingerprint: fingerprint,
};
const transportCacheKey = createTransportCacheKey({ partition: cachePartition, request: transportRequest });
const diagnostics = createDiagnosticsSink((event: HolmDiagnosticEvent) => {
  void event.code;
});
const transportCache = createTransportCache({ clock: fake.clock, scheduler: fake.scheduler, maxEntries: 2, diagnostics });
const cachedTransport = transportCache.getOrLoad(
  { partition: cachePartition, request: transportRequest, policy: cachePolicy, tags: ["reports"] },
  () => ({ requestId: "req-cache", payload: { ok: true } }),
);
const cacheInvalidation: TransportCacheInvalidationResult = transportCache.invalidateForMutation({
  partition: cachePartition,
  tags: ["reports"],
});
const nodeAuth = createNodeTokenAuth({ token: "test-token" });
const decoded = decodeTransportResponse({ requestId: "req-decl", status: 200, body: "{\"ok\":true}", responseMode });
const appliedTransport = applyTransportAuth(transportRequest, nodeAuth);
const uploadSource = createReadonlyBytesUploadSource(bytes);
const uploadFile = createUploadFile({ field: "file", name: "decl.bin", source: uploadSource });
const uploadProgress: UploadProgressEvent = { loaded: 1, total: 2, percent: 50 };
const uploadAdapter: ResumableUploadAdapter<UploadHandoff> = {
  createSession(): UploadSession {
    return { id: "upl_decl", chunkSize: 2 };
  },
  uploadChunk(input) {
    return { nextOffset: input.offset + input.chunk.byteLength };
  },
  completeSession(): UploadCompletion {
    return { id: "upl_decl", name: "decl.bin", type: "application/octet-stream", size: 3 };
  },
};
const uploaded = composeResumableUpload({ path: "/api/upload", files: [uploadFile] }, uploadAdapter);
const uploadDiagnostic = redactUploadRequest({ path: "/api/upload", files: [uploadFile] });
const nodeUploadFile = createNodeUploadFile({ field: "node", name: "node.bin", bytes: [1, 2, 3] });
const declarationNodeStatus: "preview" = nodeRuntimeSupport.status;
const declarationNodeCompatibility: "not frozen" = nodeRuntimeSupport.compatibility;
const declarationSobekStatus: "preview" = sobekRuntimeSupport.status;
const declarationSobekCompatibility: "not frozen" = sobekRuntimeSupport.compatibility;

// @ts-expect-error Declaration consumers must not widen the core fixture value.
const invalidEnvironment: CoreEnvironment = "browser";

// @ts-expect-error Declaration state snapshots are immutable.
stateSnapshot.data = { count: 2 };

void environment;
void encoded;
void serialized;
void capability;
void capabilitySnapshot;
void caller;
void fingerprint;
void runtime;
void runtimeEnvelopeProtocol;
void extensionLifecycle;
void appExtension;
void appCapability;
void magicInput;
void holm;
void stateController;
void stateResource;
void stateSnapshot;
void typedDerivedState;
void stateHistoryEntries;
void stateRealtimeHook;
void stateRealtimeSnapshot;
void timeout;
void protocolError;
void transportRequest;
void cachePolicy;
void cachePartition;
void transportCacheKey;
void transportCache;
void cachedTransport;
void cacheInvalidation;
void diagnostics;
void nodeAuth;
void nodeRuntimeAdapter;
void nodeCaller;
void nodeServiceError;
void sobekInjectedRequest;
void sobekRuntimeAdapter;
void sobekServiceError;
void decoded;
void appliedTransport;
void transportSensitivity;
void uploadProgress;
void uploaded;
void uploadDiagnostic;
void nodeUploadFile;
void declarationNodeStatus;
void declarationNodeCompatibility;
void declarationSobekStatus;
void declarationSobekCompatibility;
void invalidEnvironment;
