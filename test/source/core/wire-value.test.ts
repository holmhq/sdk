import { strict as assert } from "node:assert";
import { test } from "node:test";

import { HolmError } from "../../../src/core/errors.js";
import {
  canonicalEncodeWireValue,
  copyWireValue,
  createReadonlyBytes,
  assertWireValue,
  isReadonlyBytes,
  isWireValue,
} from "../../../src/core/wire-value.js";

test("wire-value rejects non-wire values with serialization errors", () => {
  class CustomValue {
    readonly value = true;
  }

  const invalidValues: readonly unknown[] = [
    undefined,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    1n,
    Symbol("bad"),
    () => "bad",
    new Date(0),
    new Map([["a", 1]]),
    new Error("bad"),
    new CustomValue(),
    { $holm: "not-bytes" },
    { $holm: "bytes", base64: "A" },
    { $holm: "bytes", base64: "AAB" },
    { $holm: "bytes", base64: "not base64?" },
    { $holm: "bytes", base64: "AB==" },
    { $holm: "bytes", base64: "AQ" },
    { $holm: "bytes", base64: "AQI" },
    { $holm: "bytes", base64: "AA==", extra: true },
    { $holm: "bytes", data: "AA==" },
  ];

  for (const value of invalidValues) {
    assert.throws(
      () => copyWireValue(value),
      (error) =>
        error instanceof HolmError &&
        error.kind === "serialization" &&
        error.code === "invalid_wire_value",
    );
  }
});

test("wire-value rejects cycles and shared object graphs", () => {
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;

  const shared: Record<string, unknown> = { ok: true };
  const sharedGraph = [shared, { nested: shared }];

  assert.throws(() => copyWireValue(cycle), /cycle or shared reference/);
  assert.throws(() => canonicalEncodeWireValue(sharedGraph), /cycle or shared reference/);
});

test("wire-value defensively copies objects, arrays, and bytes", () => {
  const mutableBytes = new Uint8Array([1, 2, 3]);
  const bytes = createReadonlyBytes(mutableBytes);
  mutableBytes[0] = 9;

  const input = { z: [bytes, { ok: true }], a: "first" };
  const copied = copyWireValue(input);

  assert.deepEqual(input, { z: [bytes, { ok: true }], a: "first" });
  assert.notEqual(copied, input);
  assert.equal(canonicalEncodeWireValue(copied), '{"a":"first","z":[{"$holm":"bytes","base64":"AQID"},{"ok":true}]}');

  assert.equal(bytes.at(0), 1);
  const exported = bytes.toUint8Array();
  exported[0] = 8;
  assert.equal(bytes.at(0), 1);
});

test("wire-value canonical encoding sorts keys recursively", () => {
  const left = { b: { z: null, a: true }, a: 1 };
  const right = { a: 1, b: { a: true, z: null } };

  assert.equal(canonicalEncodeWireValue(left), '{"a":1,"b":{"a":true,"z":null}}');
  assert.equal(canonicalEncodeWireValue(left), canonicalEncodeWireValue(right));
});

test("wire-value supports canonical $holm bytes tags", () => {
  const copied = copyWireValue({ $holm: "bytes", base64: "AP8B" });

  assert.equal(isReadonlyBytes(copied), true);
  assert.equal(canonicalEncodeWireValue(copied), '{"$holm":"bytes","base64":"AP8B"}');

  if (isReadonlyBytes(copied)) {
    assert.equal(copied.byteLength, 3);
    assert.equal(copied.at(-1), undefined);
    assert.equal(copied.at(1.5), undefined);
    assert.equal(copied.at(0), 0);
    assert.equal(copied.at(1), 255);
    assert.equal(copied.at(2), 1);
    assert.equal(copied.at(3), undefined);
    assert.deepEqual([...copied], [0, 255, 1]);
  }
});

test("wire-value supports predicates, assertions, iterable bytes, and short byte tags", () => {
  const nullPrototype = Object.create(null) as Record<string, unknown>;
  nullPrototype.ok = createReadonlyBytes(new Set([7, 8]));

  assert.equal(isWireValue(nullPrototype), true);
  assert.equal(isWireValue(undefined), false);
  assert.doesNotThrow(() => assertWireValue(nullPrototype));
  assert.throws(() => assertWireValue({ bad: undefined }), HolmError);
  assert.equal(canonicalEncodeWireValue(createReadonlyBytes([])), '{"$holm":"bytes","base64":""}');
  assert.equal(canonicalEncodeWireValue(createReadonlyBytes([1])), '{"$holm":"bytes","base64":"AQ=="}');
  assert.equal(canonicalEncodeWireValue(createReadonlyBytes([1, 2])), '{"$holm":"bytes","base64":"AQI="}');
  assert.equal(canonicalEncodeWireValue({ $holm: "bytes", base64: "AQ==" }), '{"$holm":"bytes","base64":"AQ=="}');
  assert.equal(canonicalEncodeWireValue({ $holm: "bytes", base64: "AQI=" }), '{"$holm":"bytes","base64":"AQI="}');
});

test("wire-value rejects invalid byte inputs", () => {
  const invalidBytes: readonly (ArrayLike<number> | Iterable<number>)[] = [
    [-1],
    [1.5],
    [256],
    ["x" as unknown as number],
  ];

  for (const input of invalidBytes) {
    assert.throws(() => createReadonlyBytes(input), /bytes must be integers/);
  }
});
