import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  canonicalEncodeWireValue,
  createCallerFingerprint,
  createCapabilityRegistry,
  createCoreEnvironment,
  createStaticCallerProvider,
  createReadonlyBytes,
  CapabilityVersionError,
  HolmError,
  runtimeEnvelopeProtocol,
  serializeHolmError,
} from "../../dist/index.js";

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
