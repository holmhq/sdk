import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  canonicalEncodeWireValue,
  createCoreEnvironment,
  createReadonlyBytes,
  HolmError,
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
