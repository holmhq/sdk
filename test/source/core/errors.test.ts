import { strict as assert } from "node:assert";
import { test } from "node:test";

import { HolmError, isHolmError, serializeHolmError, type HolmErrorOptions } from "../../../src/core/errors.js";
import { canonicalEncodeWireValue, createReadonlyBytes, isReadonlyBytes } from "../../../src/core/wire-value.js";

test("errors serialize HolmError values without unsafe implementation detail", () => {
  const cause = new Error("local cause with token");
  const error = new HolmError({
    kind: "remote",
    code: "holm.remote.denied",
    message: "Remote operation failed",
    status: 403,
    retryable: false,
    cause,
    details: {
      ok: "kept",
      token: "secret-token",
      payload: { nested: true },
      bytes: createReadonlyBytes([4, 5, 6]),
    },
  });

  const serialized = error.toJSON();

  assert.equal(isHolmError(error), true);
  assert.equal(serialized.$holm, "error");
  assert.equal(serialized.kind, "remote");
  assert.equal(serialized.status, 403);
  assert.equal(serialized.retryable, false);
  assert.equal(serialized.message, "Remote operation failed");
  assert.equal(Object.hasOwn(serialized, "stack"), false);
  assert.equal(Object.hasOwn(serialized, "cause"), false);
  assert.equal(
    canonicalEncodeWireValue(serialized.details ?? null),
    '{"bytes":{"$holm":"bytes","base64":"BAUG"},"ok":"kept","payload":"[redacted]","token":"[redacted]"}',
  );
});

test("errors copy byte details and reject forged byte-like objects", () => {
  let exported = new Uint8Array([9, 9, 9]);
  const forged = {
    $holm: "bytes",
    byteLength: 3,
    toUint8Array() {
      return exported;
    },
    toJSON() {
      return { $holm: "bytes", base64: "CQkJ" };
    },
  };
  const byteDetail = createReadonlyBytes([1, 2, 3]);
  const serialized = new HolmError({
    kind: "protocol",
    code: "details",
    message: "Details",
    details: { byteDetail, forged },
  }).toJSON();

  assert.equal(
    canonicalEncodeWireValue(serialized.details ?? null),
    '{"byteDetail":{"$holm":"bytes","base64":"AQID"},"forged":"[unserializable]"}',
  );

  if (serialized.details && typeof serialized.details === "object" && !Array.isArray(serialized.details)) {
    const details = serialized.details as { readonly byteDetail?: unknown };
    assert.equal(isReadonlyBytes(details.byteDetail), true);
    assert.notEqual(details.byteDetail, byteDetail);
  }

  exported = new Uint8Array([0, 0, 0]);
  assert.equal(
    canonicalEncodeWireValue(serialized.details ?? null),
    '{"byteDetail":{"$holm":"bytes","base64":"AQID"},"forged":"[unserializable]"}',
  );
});

test("errors redact unsupported detail values instead of throwing during serialization", () => {
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  const arrayCycle: unknown[] = [];
  arrayCycle.push(arrayCycle);
  const nullPrototype = Object.create(null) as Record<string, unknown>;
  nullPrototype.ok = "yes";

  const error = new HolmError({
    kind: "serialization",
    code: "invalid_wire_value",
    message: "Invalid payload",
    details: {
      authorization: "Bearer secret",
      keep: [1, true, null],
      dropped: () => "not serializable",
      bigint: 1n,
      symbol: Symbol("unsafe"),
      infinite: Number.POSITIVE_INFINITY,
      cycle,
      arrayCycle,
      date: new Date(0),
      nullPrototype,
    },
  });

  assert.deepEqual(error.toJSON().details, {
    arrayCycle: ["[unserializable]"],
    authorization: "[redacted]",
    bigint: "[unserializable]",
    cycle: { self: "[unserializable]" },
    date: "[unserializable]",
    dropped: "[unserializable]",
    infinite: "[unserializable]",
    keep: [1, true, null],
    nullPrototype: { ok: "yes" },
    symbol: "[unserializable]",
  });
});

test("errors normalize unknown thrown values to safe protocol errors", () => {
  const native = new Error("secret token should not leak");
  const nameless = new Error("nameless");
  nameless.name = "";
  const stringError = serializeHolmError("raw failure");
  const emptyStringError = serializeHolmError("");
  const numberError = serializeHolmError(7);
  const nativeError = serializeHolmError(native);
  const namelessError = serializeHolmError(nameless);

  assert.equal(stringError.kind, "protocol");
  assert.equal(stringError.code, "unknown_error");
  assert.equal(stringError.message, "Unexpected error");
  assert.deepEqual(stringError.details, { thrown: "string" });
  assert.deepEqual(emptyStringError.details, { thrown: "string" });
  assert.deepEqual(numberError.details, { thrown: "number" });
  assert.deepEqual(namelessError.details, { thrown: "error", name: "Error" });
  assert.equal(nativeError.message, "Unexpected error");
  assert.equal(Object.hasOwn(nativeError, "stack"), false);
  assert.deepEqual(serializeHolmError(new HolmError({ kind: "protocol", code: "x", message: "X" })), {
    $holm: "error",
    kind: "protocol",
    code: "x",
    message: "X",
  });
});

test("errors validate kind, code, status, and retryable inputs", () => {
  assert.equal(
    new HolmError({
      kind: "transport",
      code: "temporary",
      message: "Temporary transport failure",
      retryable: true,
    }).toJSON().retryable,
    true,
  );
  assert.equal(
    Object.hasOwn(
      new HolmError({
        kind: "protocol",
        code: "plain",
        message: "Plain protocol failure",
      }).toJSON(),
      "details",
    ),
    false,
  );
  assert.throws(
    () => new HolmError({ kind: "bad", code: "x", message: "x" } as unknown as HolmErrorOptions),
    /Unknown Holm error kind/,
  );
  assert.throws(() => new HolmError({ kind: "protocol", code: "", message: "x" }), /code/);
  assert.throws(() => new HolmError({ kind: "protocol", code: "x", message: "" }), /message/);
  assert.throws(() => new HolmError({ kind: "remote", code: "x", message: "x", status: 99 }), /status/);
  assert.throws(() => new HolmError({ kind: "remote", code: "x", message: "x", status: 600 }), /status/);
  assert.throws(() => new HolmError({ kind: "remote", code: "x", message: "x", status: 200.5 }), /status/);
  assert.throws(
    () =>
      new HolmError({
        kind: "remote",
        code: "x",
        message: "x",
        retryable: "yes",
      } as unknown as HolmErrorOptions),
    /retryable/,
  );
});
