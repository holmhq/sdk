import {
  canonicalEncodeWireValue,
  createCapabilityRegistry,
  createCallerFingerprint,
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
import { createNodeTokenAuth, createNodeUploadFile } from "@holmhq/sdk/node";
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
void decoded;
void appliedTransport;
void transportSensitivity;
void uploadProgress;
void uploaded;
void uploadDiagnostic;
void nodeUploadFile;
void invalidEnvironment;
