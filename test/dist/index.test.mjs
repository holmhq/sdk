import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  canonicalEncodeWireValue,
  createCallerFingerprint,
  createCapabilityRegistry,
  createCoreEnvironment,
  createDiagnosticsSink,
  createExtensionLifecycle,
  createHolm,
  createStaticCallerProvider,
  createReadonlyBytes,
  CancelledError,
  CapabilityVersionError,
  HolmError,
  ProtocolError,
  TimeoutError,
  runtimeEnvelopeProtocol,
  serializeHolmError,
} from "../../dist/index.js";
import {
  createAppExtension,
  HOLM_APP_HTTP_CAPABILITY as APP_HTTP_CAPABILITY,
} from "../../dist/app/index.js";
import {
  applyTransportAuth,
  createTransportCache,
  createTransportCacheKey,
  createTransportRequest,
  composeResumableUpload,
  createReadonlyBytesUploadSource,
  createUploadFile,
  decodeTransportResponse,
  redactAuthenticatedTransport,
  redactUploadRequest,
} from "../../dist/transports/index.js";
import {
  createNodeOperatorCaller,
  createNodeTokenAuth,
  createNodeUploadFile,
  nodeRuntime,
  nodeRuntimeSupport,
  UnsupportedNodeRuntimeServiceError,
} from "../../dist/node/index.js";
import {
  createFakeSobekInjectedRuntime,
  HOLM_APP_HTTP_CAPABILITY as SOBEK_APP_HTTP_CAPABILITY,
  SOBEK_HTTP_REQUEST_OPERATION,
  sobekRuntime,
  sobekRuntimeSupport,
  UnsupportedSobekRuntimeServiceError,
} from "../../dist/sobek/index.js";
import {
  bridgeMailboxProtocol,
  bridgeRuntimeSupport,
  copyBridgeMailboxEnvelope,
  createBridgeMailbox,
  createMockBridgeRuntime,
  createMockBridgeServices,
  createReservedDesktopBridgeRuntime,
  createReservedMobileBridgeRuntime,
  UnsupportedBridgeRuntimeServiceError,
} from "../../dist/bridge/index.js";
import {
  HOLM_APP_HTTP_CAPABILITY,
  WEB_HTTP_REQUEST_OPERATION,
  createWebApp,
  createWebSessionAuth,
  createWebUploadFile,
  webRuntime,
} from "../../dist/web/index.js";
import { createFakeClock, createInMemoryRuntimeAdapter } from "../../dist/test/index.js";
import {
  createDerivedResource,
  createMutationResource,
  createQueryResource,
  createRealtimeReconcileHook,
  createResourceController,
  createResourceHistory,
  REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY,
} from "../../dist/state/index.js";

async function readJsonArtifact(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
}

async function readTextArtifact(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

async function collectGeneratedEsmGraph(relativeEntry) {
  const visited = new Set();
  const externalSpecifiers = new Set();
  const stack = [new URL(relativeEntry, import.meta.url)];
  const importPattern = /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;

  while (stack.length > 0) {
    const url = stack.pop();
    const path = url.pathname;
    if (visited.has(path)) {
      continue;
    }
    visited.add(path);
    const source = await readFile(url, "utf8");
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (specifier.startsWith(".")) {
        stack.push(new URL(specifier, url));
      } else {
        externalSpecifiers.add(specifier);
      }
    }
  }

  return { visited: [...visited].sort(), externalSpecifiers: [...externalSpecifiers].sort() };
}

function jsonFetchResponse(body, options = {}) {
  return {
    status: options.status ?? 200,
    url: options.url ?? "",
    headers: new Map([["content-type", "application/json"]]),
    text: async () => body,
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

test("generated package artifacts expose isolated Issue 009 runtime subpaths", async () => {
  const packageJson = await readJsonArtifact("../../package.json");
  const manifest = await readJsonArtifact("../../dist/manifest.json");
  const sizeReport = await readJsonArtifact("../../dist/size-report.json");
  const manifestPaths = new Set(manifest.artifacts.map((artifact) => artifact.path));
  const sizedPaths = new Set(sizeReport.artifacts.map((artifact) => artifact.path));
  const runtimeSubpaths = ["./web", "./node", "./sobek", "./test", "./bridge"];

  for (const subpath of runtimeSubpaths) {
    assert.deepEqual(packageJson.exports[subpath], {
      types: `./dist/${subpath.slice(2)}/index.d.ts`,
      import: `./dist/${subpath.slice(2)}/index.js`,
    });
    assert.equal(manifestPaths.has(`dist/${subpath.slice(2)}/index.js`), true, `${subpath} ESM is in the dist manifest`);
    assert.equal(manifestPaths.has(`dist/${subpath.slice(2)}/index.d.ts`), true, `${subpath} declarations are in the dist manifest`);
    assert.equal(sizedPaths.has(`dist/${subpath.slice(2)}/index.js`), true, `${subpath} ESM is covered by the size gate`);
  }

  for (const runtimeFile of [
    "dist/node/runtime.js",
    "dist/node/services.js",
    "dist/node/upload.js",
    "dist/sobek/runtime.js",
    "dist/bridge/index.js",
    "dist/test/index.js",
  ]) {
    assert.equal(manifestPaths.has(runtimeFile), true, `${runtimeFile} is in the dist manifest`);
    assert.equal(sizedPaths.has(runtimeFile), true, `${runtimeFile} is covered by the size gate`);
  }

  const rootEsm = await readTextArtifact("../../dist/index.js");
  assert.equal(/\.\/(web|node|sobek|bridge|test)\//.test(rootEsm), false, "root import must not pull runtime subpaths implicitly");
});

test("generated ESM artifact exposes the S02 preview/reserved support labels", () => {
  assert.deepEqual(nodeRuntimeSupport, {
    packageName: "@holmhq/sdk/node",
    status: "preview",
    compatibility: "not frozen",
    production: "not production",
  });
  assert.deepEqual(sobekRuntimeSupport, {
    packageName: "@holmhq/sdk/sobek",
    status: "preview",
    compatibility: "not frozen",
    production: "not production",
  });
  assert.deepEqual(bridgeRuntimeSupport, {
    packageName: "@holmhq/sdk/bridge",
    status: "reserved",
    production: "not production",
    desktop: "unsupported",
    mobile: "unsupported",
    scope: "mocks, mailbox contracts, and service slots only",
  });
});

test("stable generated ESM subpaths do not import preview or reserved runtimes", async () => {
  for (const entry of [
    "../../dist/index.js",
    "../../dist/core/index.js",
    "../../dist/transports/index.js",
    "../../dist/app/index.js",
    "../../dist/web/index.js",
    "../../dist/state/index.js",
    "../../dist/test/index.js",
  ]) {
    const graph = await collectGeneratedEsmGraph(entry);
    assert.deepEqual(
      graph.externalSpecifiers.filter((specifier) => specifier === "node" || specifier.startsWith("node:")),
      [],
      `${entry} must not import Node built-ins`,
    );
    assert.deepEqual(
      graph.visited.filter((path) => /\/dist\/(?:node|sobek|bridge)\//.test(path)),
      [],
      `${entry} must not evaluate preview/reserved runtime modules`,
    );
  }
});

test("deterministic v0.1 web and BFBB bundles are importable, recorded, and exclude unavailable runtimes", async () => {
  const packageJson = await readJsonArtifact("../../package.json");
  const manifest = await readJsonArtifact("../../dist/manifest.json");
  const sizeReport = await readJsonArtifact("../../dist/size-report.json");
  const licenseReport = await readJsonArtifact("../../dist/license-report.json");
  const manifestByPath = new Map(manifest.artifacts.map((artifact) => [artifact.path, artifact]));
  const sizeByPath = new Map(sizeReport.artifacts.map((artifact) => [artifact.path, artifact]));
  const licenseByPath = new Map((licenseReport.artifacts ?? []).map((artifact) => [artifact.path, artifact]));
  const bundlePaths = ["dist/holm.js", "dist/holm-web.js"];

  assert.equal(packageJson.version, "0.1.0");
  assert.notEqual(packageJson.private, true, "public 0.1.0 package must not remain private");
  assert.equal(packageJson.publishConfig?.access, "public");
  assert.equal(manifest.package?.version, "0.1.0");
  assert.equal(manifest.package?.private, false);
  assert.equal(licenseReport.package?.version, "0.1.0");
  assert.equal(licenseReport.package?.private, false);
  for (const bundlePath of bundlePaths) {
    for (const artifactPath of [bundlePath, `${bundlePath}.map`, bundlePath.replace(/\.js$/, ".d.ts"), bundlePath.replace(/\.js$/, ".d.ts.map")]) {
      assert.equal(manifestByPath.has(artifactPath), true, `${artifactPath} is covered by the dist manifest`);
      assert.equal(licenseByPath.get(artifactPath)?.license, "MIT", `${artifactPath} has a license record`);
    }
    assert.equal(sizeByPath.has(bundlePath), true, `${bundlePath} is covered by the size gate`);
  }

  const holm = await import("../../dist/holm.js");
  const holmWeb = await import("../../dist/holm-web.js");
  assert.equal(typeof holm.createHolm, "function");
  assert.equal(typeof holm.createWebApp, "function");
  assert.equal(typeof holm.createTransportRequest, "function");
  assert.equal(typeof holm.createQueryResource, "function");
  assert.equal(typeof holm.createInMemoryRuntimeAdapter, "function");
  assert.equal(typeof holm.web.webRuntime, "function");
  assert.equal(typeof holm.node, "undefined");
  assert.equal(typeof holm.sobek, "undefined");
  assert.equal(typeof holm.bridge, "undefined");
  assert.equal(typeof holmWeb.createWebApp, "function");
  assert.equal(typeof holmWeb.createInMemoryRuntimeAdapter, "undefined", "narrow web bundle excludes test helpers");

  for (const entry of ["../../dist/holm.js", "../../dist/holm-web.js"]) {
    const graph = await collectGeneratedEsmGraph(entry);
    assert.deepEqual(graph.externalSpecifiers.filter((specifier) => specifier === "node" || specifier.startsWith("node:")), []);
    assert.deepEqual(graph.visited.filter((path) => /\/dist\/(?:node|sobek|bridge)\//.test(path)), []);
  }

  assert.deepEqual(manifestByPath.get("dist/holm.js")?.includedCapabilities, [
    "core",
    "app",
    "web",
    "transports",
    "state",
    "test",
  ]);
  assert.deepEqual(manifestByPath.get("dist/holm-web.js")?.includedCapabilities, [
    "core",
    "app",
    "web",
    "transports",
    "state",
  ]);
  for (const bundlePath of bundlePaths) {
    assert.deepEqual(manifestByPath.get(bundlePath)?.excludedCapabilities, [
      "admin",
      "actions/generated-cli",
      "realtime-runtime",
      "collaboration",
      "framework-bindings",
      "crdt-engines",
      "node-cli",
      "sobek-server",
      "desktop-mobile-production-bridge",
      "arbitrary-ssr",
    ]);
  }
});

test("generated ESM artifact exposes the S01 core fixture", () => {
  assert.equal(createCoreEnvironment(), "core");
});

test("generated ESM artifact exposes S04 wire values and errors", () => {
  const encoded = canonicalEncodeWireValue({
    bytes: createReadonlyBytes([1, 2, 3]),
    ok: true,
  });
  const error = new HolmError({
    kind: "serialization",
    code: "invalid_wire_value",
    message: "Invalid wire value",
    details: { token: "secret" },
  });

  assert.equal(encoded, '{"bytes":{"$holm":"bytes","base64":"AQID"},"ok":true}');
  assert.equal(serializeHolmError(error).details.token, "[redacted]");
});

test("generated ESM artifact exposes S05 capability negotiation", () => {
  const registry = createCapabilityRegistry([
    { id: "com.example.reports", origin: "runtime", version: { major: 1, minor: 0 } },
    { id: "com.example.reports", origin: "runtime", version: { major: 1, minor: 2 } },
  ]);

  assert.equal(registry.require({ id: "com.example.reports", major: 1, minMinor: 1 }).version.minor, 2);
  assert.throws(
    () => registry.require({ id: "com.example.reports", major: 2 }),
    CapabilityVersionError,
  );
});

test("generated ESM artifact exposes S06 runtime invocation caller helpers", async () => {
  const caller = createStaticCallerProvider({ surface: "test", principal: { kind: "anonymous" } });
  const first = await caller.current();
  const second = await caller.current();

  assert.equal(runtimeEnvelopeProtocol, "holm.sdk.runtime/1");
  assert.equal(createCallerFingerprint(first), createCallerFingerprint(second));
  assert.notEqual(first, second);
});

test("generated ESM artifact exposes S07 extension lifecycle", async () => {
  const effects = [];
  const lifecycle = createExtensionLifecycle(
    [
      {
        id: "com.example.reports",
        namespace: "reports",
        version: { major: 1, minor: 0 },
        setup() {
          return {
            api: { list: () => ["ready"] },
            start: () => {
              effects.push("start");
            },
            dispose: () => {
              effects.push("dispose");
            },
          };
        },
      },
    ],
    { capabilities: createCapabilityRegistry([]) },
  );

  assert.equal(Object.isFrozen(lifecycle.namespaces.reports), true);
  await lifecycle.start();
  await lifecycle.dispose();
  assert.deepEqual(effects, ["start", "dispose"]);
});

test("generated ESM artifact exposes S09 transport auth and error contracts", async () => {
  const request = createTransportRequest({
    method: "POST",
    url: "/api/reports",
    body: { mode: "json", value: { ok: true } },
    responseMode: "json",
  });
  const nodeAuth = createNodeTokenAuth({ token: "dist-secret" });
  const webAuth = createWebSessionAuth({ credentials: "include" });
  const authenticated = await applyTransportAuth(request, nodeAuth);
  const webAuthenticated = await applyTransportAuth(request, webAuth);
  const decoded = decodeTransportResponse({
    requestId: "req-dist-transport",
    status: 200,
    body: '{"ok":true}',
    responseMode: "json",
  });

  assert.equal(authenticated.request.headers.authorization, "Bearer dist-secret");
  assert.equal(JSON.stringify(redactAuthenticatedTransport(authenticated)).includes("dist-secret"), false);
  assert.equal(webAuthenticated.privateProof.credentials, "include");
  assert.deepEqual(decoded.payload, { ok: true });
});

test("generated ESM artifact exposes the Issue 007 app extension and web composition", async () => {
  const fetch = async () => jsonFetchResponse('{"data":{"ok":true}}');
  const runtime = webRuntime({ fetch, cache: false });
  const extension = createAppExtension({ requestId: (sequence) => `dist-app-${sequence}` });
  const holm = createHolm({
    runtime,
    caller: createStaticCallerProvider({ surface: "web", principal: { kind: "browser-session" } }),
    extensions: [extension],
  });
  const response = await holm.app.http.get("/api/check");
  assert.deepEqual(response, { ok: true });
  assert.equal(APP_HTTP_CAPABILITY.id, "holm.http.app");
  await holm.dispose();

  const convenience = createWebApp({
    runtime: { fetch, cache: false },
    navigation: false,
    uploads: false,
    surfaces: { analytics: "/analytics" },
  });
  assert.deepEqual(await convenience.app.auth.me(), { ok: true });
  assert.equal(convenience.app.surface.analyticsUrl(), "/analytics");
  await convenience.dispose();
});

test("generated ESM artifact exposes the Issue 009 Sobek injected runtime contract", async () => {
  const calls = [];
  const fake = createFakeSobekInjectedRuntime({
    handler(request) {
      calls.push(request);
      return {
        status: 200,
        headers: { "content-type": ["application/json; charset=utf-8"] },
        body: { path: request.path, caller: request.caller.principal, bytes: createReadonlyBytes([6, 7]) },
      };
    },
  });
  const runtime = sobekRuntime({ id: "dist-sobek", runtime: fake });
  const caller = { surface: "server", principal: { kind: "service", id: "dist-sobek" }, app: { id: "dist-app" } };
  await runtime.start();
  const response = await runtime.invoke({
    requestId: "req-dist-sobek",
    capability: SOBEK_APP_HTTP_CAPABILITY,
    operation: SOBEK_HTTP_REQUEST_OPERATION,
    caller: { ...caller, invocationId: "req-dist-sobek", startedAt: 9 },
    callerFingerprint: createCallerFingerprint(caller),
    payload: { method: "GET", path: "/api/sobek", caller: { principal: { kind: "member", id: "hint" } } },
  }, {});

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/api/sobek");
  assert.deepEqual(calls[0].caller.principal, { kind: "service", id: "dist-sobek" });
  assert.deepEqual(response.payload, { path: "/api/sobek", caller: { kind: "service", id: "dist-sobek" }, bytes: createReadonlyBytes([6, 7]) });
  assert.throws(() => sobekRuntime({ id: "dist-sobek-missing" }).clock.now(), UnsupportedSobekRuntimeServiceError);
  await runtime.dispose();
});

test("generated ESM artifact exposes the Issue 009 reserved bridge mocks and service slots", async () => {
  const services = createMockBridgeServices({
    adapter: "dist-bridge",
    surface: "desktop",
    secureStorage: { entries: { token: "dist-token" } },
  });
  const runtime = createMockBridgeRuntime({
    id: "dist-bridge",
    surface: "desktop",
    capabilities: [{ id: "com.example.bridge", origin: "runtime", version: { major: 1, minor: 0 } }],
    services,
    handlers: {
      "com.example.bridge:echo": (request) => ({
        requestId: request.requestId,
        payload: { echo: request.payload, token: services.secureStorage.get("token") },
      }),
    },
  });
  const mailbox = createBridgeMailbox({ post: () => undefined });
  const pending = mailbox.request({
    requestId: "req-dist-bridge-mailbox",
    capability: { id: "com.example.bridge", major: 1 },
    operation: "echo",
    payload: { bytes: createReadonlyBytes([1, 2]) },
  });
  assert.equal(mailbox.receive({
    protocol: bridgeMailboxProtocol,
    kind: "response",
    requestId: "req-dist-bridge-mailbox",
    payload: { ok: true },
  }), true);
  assert.equal(mailbox.receive({
    protocol: bridgeMailboxProtocol,
    kind: "response",
    requestId: "req-dist-bridge-mailbox",
    payload: { late: true },
  }), false);
  assert.deepEqual(copyBridgeMailboxEnvelope({
    protocol: bridgeMailboxProtocol,
    kind: "event",
    eventId: "evt-dist",
    name: "connectivity",
    payload: { online: true },
  }).payload, { online: true });

  assert.deepEqual(await createReservedDesktopBridgeRuntime({ id: "dist-desktop" }).start(), []);
  assert.deepEqual(await createReservedMobileBridgeRuntime({ id: "dist-mobile" }).start(), []);
  assert.throws(() => createReservedDesktopBridgeRuntime({ id: "dist-missing" }).clock.now(), UnsupportedBridgeRuntimeServiceError);
  assert.deepEqual((await pending).payload, { ok: true });
  await runtime.start();
  const caller = { surface: "desktop", principal: { kind: "member", id: "dist-bridge" }, app: { id: "dist-app" } };
  const response = await runtime.invoke({
    requestId: "req-dist-bridge",
    capability: { id: "com.example.bridge", major: 1 },
    operation: "echo",
    caller: { ...caller, invocationId: "req-dist-bridge", startedAt: 7 },
    callerFingerprint: createCallerFingerprint(caller),
    payload: { value: "ready" },
  }, {});
  assert.deepEqual(response.payload, { echo: { value: "ready" }, token: "dist-token" });
});

test("generated ESM artifact exposes the Issue 009 Node/CLI runtime services", async () => {
  const fake = createFakeClock(9);
  const calls = [];
  const runtime = nodeRuntime({
    baseUrl: "https://cli.example.test/",
    fetch: async (input, init) => {
      calls.push({ input, init });
      return jsonFetchResponse('{"data":{"ok":true}}');
    },
    auth: createNodeTokenAuth({ token: "dist-node-token", operatorId: "dist-operator" }),
    clock: fake.clock,
    scheduler: fake.scheduler,
    environment: { get: (name) => name === "HOLM_PROFILE" ? "dist" : undefined },
    secureStore: { get: (key) => key === "holm.token" ? "dist-secret" : undefined },
  });
  const caller = await createNodeOperatorCaller({ operatorId: "dist-operator" }).current();
  await runtime.start();
  const response = await runtime.invoke({
    requestId: "req-dist-node",
    capability: HOLM_APP_HTTP_CAPABILITY,
    operation: "request",
    caller: { ...caller, invocationId: "req-dist-node", startedAt: 9 },
    callerFingerprint: createCallerFingerprint(caller),
    payload: createTransportRequest({ method: "GET", url: "/api/node" }),
  }, {});

  assert.deepEqual(response.payload, { ok: true });
  assert.equal(calls[0].input, "https://cli.example.test/api/node");
  assert.equal(calls[0].init.headers.authorization, "Bearer dist-node-token");
  assert.equal(await runtime.services.environment.get("HOLM_PROFILE"), "dist");
  assert.equal(JSON.stringify(response).includes("dist-node-token"), false);
  assert.throws(() => nodeRuntime({ id: "dist-missing" }).clock.now(), UnsupportedNodeRuntimeServiceError);
  await runtime.dispose();
});

test("generated ESM artifact exposes the Issue 007 web Fetch runtime", async () => {
  const calls = [];
  const runtime = webRuntime({
    baseUrl: "https://app.example.test/",
    fetch: async (input, init) => {
      calls.push({ input: String(input), init });
      return jsonFetchResponse('{"data":{"member":{"id":"member_dist"}}}');
    },
  });
  const holm = createHolm({
    runtime,
    caller: createStaticCallerProvider({ surface: "web", principal: { kind: "browser-session" } }),
  });

  const response = await holm.invoke({
    capability: HOLM_APP_HTTP_CAPABILITY,
    operation: WEB_HTTP_REQUEST_OPERATION,
    payload: createTransportRequest({ method: "GET", url: "/api/me" }),
    requestId: "req-dist-web",
  });
  const cached = await holm.invoke({
    capability: HOLM_APP_HTTP_CAPABILITY,
    operation: WEB_HTTP_REQUEST_OPERATION,
    payload: createTransportRequest({ method: "GET", url: "/api/me" }),
    requestId: "req-dist-web-cached",
  });

  assert.deepEqual(response.payload, { member: { id: "member_dist" } });
  assert.equal(cached.requestId, "req-dist-web-cached");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, "https://app.example.test/api/me");
  assert.equal(calls[0].init.credentials, "same-origin");
  await holm.dispose();
});

test("generated ESM artifact exposes S12 upload seam helpers", async () => {
  const progress = [];
  const file = createUploadFile({
    field: "file",
    name: "dist.txt",
    type: "text/plain",
    source: createReadonlyBytesUploadSource(createReadonlyBytes([1, 2, 3])),
  });
  const adapter = {
    createSession() {
      return { id: "upl_dist", chunkSize: 2 };
    },
    uploadChunk(input) {
      return { nextOffset: input.offset + input.chunk.byteLength };
    },
    completeSession() {
      return { id: "upl_dist", tempRef: "tmp_dist", name: "dist.txt", type: "text/plain", size: 3 };
    },
  };
  const handoff = await composeResumableUpload(
    { path: "/api/upload", files: [file], onProgress: (event) => progress.push(event.loaded) },
    adapter,
  );
  const nodeUpload = createNodeUploadFile({ field: "node", name: "node.bin", bytes: [4, 5] });
  const webUpload = createWebUploadFile({
    field: "web",
    name: "web.bin",
    blob: { size: 2, type: "application/octet-stream", slice: (start, end, type) => ({ size: end - start, type }) },
  });

  assert.equal(handoff.file.upload_id, "upl_dist");
  assert.deepEqual(progress, [0, 2, 3]);
  assert.equal(redactUploadRequest({ path: "/api/upload", fields: [{ name: "caption", value: "secret" }], files: [file] }).fields[0].value, "[redacted]");
  assert.equal(nodeUpload.size, 2);
  assert.equal(webUpload.size, 2);
});

test("generated ESM artifact exposes S11 cache invalidation and diagnostics", async () => {
  const fake = createFakeClock();
  const diagnostics = [];
  const cache = createTransportCache({
    clock: fake.clock,
    scheduler: fake.scheduler,
    maxEntries: 2,
    diagnostics: createDiagnosticsSink((event) => {
      diagnostics.push(event);
    }),
  });
  const request = createTransportRequest({ method: "GET", url: "/api/cache", responseMode: "json" });
  const partition = { source: { id: "runtime-test", surface: "test" }, callerFingerprint: "caller:v1:dist" };
  let loads = 0;

  const key = createTransportCacheKey({ partition, request });
  const first = await cache.getOrLoad(
    { partition, request, policy: { ttlMs: 100, swrMs: 25 }, tags: ["dist"] },
    () => ({ requestId: "req-cache", payload: { loads: (loads += 1) } }),
  );
  const second = await cache.getOrLoad(
    { partition, request, policy: { ttlMs: 100, swrMs: 25 }, tags: ["dist"] },
    () => ({ requestId: "req-cache-2", payload: { loads: (loads += 1) } }),
  );
  const invalidated = cache.invalidateForMutation({ partition, tags: ["dist"] });

  assert.equal(key.startsWith("cache:v1:"), true);
  assert.deepEqual(first.payload, { loads: 1 });
  assert.deepEqual(second.payload, { loads: 1 });
  assert.equal(invalidated.removed, 1);
  assert.equal(diagnostics.some((event) => event.code === "transport_cache_update"), true);
  assert.equal(diagnostics.some((event) => event.code === "transport_cache_invalidate"), true);
});

test("generated ESM artifact exposes S14 state query refresh and reset", async () => {
  let caller = { surface: "test", principal: { kind: "member", id: "alpha" } };
  const listeners = new Set();
  const query = createQueryResource({
    key: ["dist-query"],
    source: { id: "runtime-a", surface: "test" },
    caller: {
      current: () => caller,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    load: (context) => ({ owner: context.caller.principal.id, source: context.source.id }),
  });

  assert.deepEqual((await query.refresh()).data, { owner: "alpha", source: "runtime-a" });
  const stale = query.markStale();
  caller = { surface: "test", principal: { kind: "member", id: "beta" } };
  for (const listener of listeners) listener();
  const reset = query.getSnapshot();
  assert.equal(stale.stale, true);
  assert.equal(reset.phase, "loading");
  assert.equal("data" in reset, false);
  assert.deepEqual((await query.currentLoad()).data, { owner: "beta", source: "runtime-a" });
  assert.deepEqual((await query.reset({ source: { id: "runtime-b", surface: "test" } }).phase), "loading");
  assert.deepEqual((await query.currentLoad()).data, { owner: "beta", source: "runtime-b" });
});

test("generated ESM artifact exposes S16 derived resources and realtime reconcile hooks", async () => {
  const left = createResourceController();
  const right = createResourceController();
  left.setReady({ count: 1 });
  right.setReady({ count: 2 });
  const derived = createDerivedResource({
    dependencies: [left.resource, right.resource],
    derive: ([leftSnapshot, rightSnapshot]) => ({
      total: leftSnapshot.data.count + rightSnapshot.data.count,
    }),
  });
  const history = createResourceHistory(derived, { id: "dist-derived" });
  left.setReady({ count: 4 });

  const capabilities = createCapabilityRegistry([
    { id: REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY.id, version: { major: 1, minor: 0 }, origin: "runtime" },
  ]);
  const query = createQueryResource({
    key: ["dist-realtime"],
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    load: () => ({ version: 1, labels: ["load"] }),
  });
  const hook = createRealtimeReconcileHook({ query, capabilities });
  const reconciled = hook.handle({ kind: "reconcile", data: { version: 2, labels: ["event"] } });
  const invalidated = hook.handle({ kind: "invalidate", reason: "dist-broadcast" });

  assert.deepEqual(derived.getSnapshot().data, { total: 6 });
  assert.equal(history.getEntries().length, 1);
  assert.equal(hook.durable, false);
  assert.equal(hook.supports.privateChannels, false);
  assert.deepEqual(reconciled.data, { version: 2, labels: ["event"] });
  assert.equal(invalidated.stale, true);
});

test("generated ESM artifact exposes S15 state mutation optimistic invalidation", async () => {
  const invalidations = [];
  const mutation = createMutationResource({
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    optimistic: (payload) => ({ version: 0, label: payload.label }),
    execute: () => ({ version: 1, label: "server" }),
    invalidates: [{ tags: ["dist-mutation"] }],
    onInvalidate: (event) => invalidations.push(event),
  });

  const ready = await mutation.execute({ label: "draft" });

  assert.equal(ready.phase, "ready");
  assert.deepEqual(ready.data, { version: 1, label: "server" });
  assert.deepEqual(invalidations[0].invalidations, [{ tags: ["dist-mutation"] }]);

  const invalidationStarted = deferred();
  const invalidation = deferred();
  const cancellable = createMutationResource({
    source: { id: "runtime-a", surface: "test" },
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
    execute: () => ({ version: 2, label: "server" }),
    invalidates: [{ tags: ["dist-mutation"] }],
    onInvalidate: () => {
      invalidationStarted.resolve();
      return invalidation.promise;
    },
  });
  const pending = cancellable.execute({ label: "reset" });
  await invalidationStarted.promise;
  assert.equal(cancellable.reset().phase, "idle");
  invalidation.resolve();
  await assert.rejects(pending, CancelledError);
  assert.equal(cancellable.getSnapshot().phase, "idle");
});

test("generated ESM artifact exposes S13 state resource lifecycle", () => {
  const diagnostics = [];
  const controller = createResourceController({
    clock: { now: () => 77 },
    diagnostics: createDiagnosticsSink((event) => diagnostics.push(event)),
  });
  const phases = [];
  const unsubscribe = controller.resource.subscribe(() => {
    phases.push(controller.resource.getSnapshot().phase);
  });

  const source = { count: 1, labels: ["dist"] };
  const ready = controller.setReady(source);
  source.labels.push("mutated");
  controller.resource.subscribe(() => {
    throw new Error("dist secret should be redacted");
  });
  controller.setLoading({ refreshing: true, stale: true });
  controller.resource.dispose();
  unsubscribe();

  assert.equal(ready.phase, "ready");
  assert.equal(ready.updatedAt, 77);
  assert.deepEqual(ready.data, { count: 1, labels: ["dist"] });
  assert.equal(Object.isFrozen(ready.data.labels), true);
  assert.deepEqual(phases, ["ready", "loading", "disposed"]);
  assert.equal(controller.resource.getSnapshot().phase, "disposed");
  assert.equal(diagnostics[0].code, "state_resource_listener_error");
});

test("generated ESM artifact exposes S08 createHolm lifecycle fakes", async () => {
  const fake = createFakeClock(7);
  const runtime = createInMemoryRuntimeAdapter({
    clock: fake.clock,
    scheduler: fake.scheduler,
    offers: [{ id: "com.example.reports", origin: "runtime", version: { major: 1, minor: 0 } }],
  });
  const holm = createHolm({
    runtime,
    caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
  });

  await holm.start();
  const response = await holm.invoke({
    capability: { id: "com.example.reports", major: 1 },
    operation: "list",
    payload: { ok: true },
    requestId: "req-dist",
  });

  assert.equal(holm.lifecycle.state, "ready");
  assert.deepEqual(response.payload, { ok: true });
  assert.equal(runtime.requests[0].caller.startedAt, 7);
  assert.equal(new TimeoutError({ timeoutMs: 1 }).code, "operation_timeout");

  runtime.setHandler("com.example.reports:mismatch", () => ({
    requestId: "req-dist-other",
    payload: { crossed: true },
  }));
  await assert.rejects(
    () =>
      holm.invoke({
        capability: { id: "com.example.reports", major: 1 },
        operation: "mismatch",
        payload: null,
        requestId: "req-dist-expected",
      }),
    (error) => error instanceof ProtocolError && error.code === "runtime_response_mismatch",
  );
  await holm.dispose();
});
