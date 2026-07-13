import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  canonicalEncodeWireValue,
  createCallerFingerprint,
  createCapabilityRegistry,
  createCoreEnvironment,
  createExtensionLifecycle,
  createHolm,
  createStaticCallerProvider,
  createReadonlyBytes,
  CapabilityVersionError,
  HolmError,
  TimeoutError,
  runtimeEnvelopeProtocol,
  serializeHolmError,
} from "../../dist/index.js";
import {
  applyTransportAuth,
  createTransportRequest,
  decodeTransportResponse,
  redactAuthenticatedTransport,
} from "../../dist/transports/index.js";
import { createNodeTokenAuth } from "../../dist/node/index.js";
import { createWebSessionAuth } from "../../dist/web/index.js";
import { createFakeClock, createInMemoryRuntimeAdapter } from "../../dist/test/index.js";

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
});
