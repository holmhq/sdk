import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  CancelledError,
  HolmError,
  canonicalEncodeWireValue,
  createCancellationController,
  createReadonlyBytes,
  isReadonlyBytes,
} from "../../../src/core/index.js";
import {
  RemoteError,
  ProtocolError,
  TransportError,
  canonicalTransportKey,
  createTransportRequest,
  decodeTransportResponse,
  encodeTransportBody,
  normalizeTransportError,
  redactTransportRequest,
} from "../../../src/transports/index.js";
import {
  binaryTransportFixture,
  jsonTransportFixture,
  rawTransportFixture,
} from "../../conformance/transport/fixtures.js";

test("transport contracts normalize request shape and deterministic keys without mutating inputs", () => {
  const mutableBody = { nested: { count: 1 }, bytes: createReadonlyBytes([1, 2, 3]) };
  const first = createTransportRequest({
    method: "post",
    url: "/api/reports",
    params: { z: "last", a: "first" },
    headers: { "X-Trace": " trace-1 ", Accept: "application/json" },
    body: { mode: "json", value: mutableBody },
    responseMode: "json",
    timeoutMs: 25,
  });
  const second = createTransportRequest({
    method: "POST",
    url: "/api/reports",
    params: { a: "first", z: "last" },
    headers: { accept: "application/json", "x-trace": " trace-1 " },
    body: { mode: "json", value: { bytes: createReadonlyBytes([1, 2, 3]), nested: { count: 1 } } },
    responseMode: "json",
    timeoutMs: 25,
  });

  mutableBody.nested.count = 99;

  assert.equal(first.method, "POST");
  assert.deepEqual(first.params, { a: "first", z: "last" });
  assert.deepEqual(first.headers, { accept: "application/json", "x-trace": "trace-1" });
  assert.equal(canonicalTransportKey(first), canonicalTransportKey(second));
  assert.equal(canonicalTransportKey(first).includes("trace-1"), false);
  assert.equal(first.body?.mode, "json");
  assert.equal(canonicalEncodeWireValue(first.body.value), '{"bytes":{"$holm":"bytes","base64":"AQID"},"nested":{"count":1}}');
  assert.equal(Object.isFrozen(first.body.value), true);
});



test("transport contracts validate invalid inputs and default optional fields", () => {
  const defaulted = createTransportRequest({ method: " get ", url: " /api/public " });
  assert.deepEqual(defaulted.params, {});
  assert.deepEqual(defaulted.headers, {});
  assert.equal(defaulted.responseMode, "json");
  assert.equal(Object.hasOwn(defaulted, "body"), false);
  assert.equal(Object.hasOwn(defaulted, "timeoutMs"), false);

  assert.throws(() => createTransportRequest({ method: " ", url: "/api", responseMode: "json" }), /method/);
  assert.throws(() => createTransportRequest({ method: "GET", url: " ", responseMode: "json" }), /URL/);
  assert.throws(
    () => createTransportRequest({ method: "GET", url: "/api", params: { bad: Number.NaN }, responseMode: "json" }),
    /param bad/,
  );
  assert.throws(
    () => createTransportRequest({ method: "GET", url: "/api", headers: { " ": "x" }, responseMode: "json" }),
    /headers/,
  );
  assert.throws(
    () => createTransportRequest({ method: "GET", url: "/api", responseMode: "xml" as never }),
    /Unknown transport response mode/,
  );
  assert.throws(
    () => createTransportRequest({ method: "GET", url: "/api", responseMode: "json", timeoutMs: -1 }),
    /timeout/,
  );
  assert.throws(() => encodeTransportBody({ mode: "raw", value: 1 as never }), /Raw transport body/);
});

test("transport canonical keys and redaction cover raw and binary body modes", () => {
  const raw = createTransportRequest({
    method: "POST",
    url: "/api/raw",
    body: { mode: "raw", value: "secret raw" },
    responseMode: "raw",
  });
  const binary = createTransportRequest({
    method: "POST",
    url: "/api/binary",
    body: { mode: "binary", value: new Uint8Array([7, 8]) },
    responseMode: "binary",
  });

  assert.equal(canonicalTransportKey(raw).includes("secret raw"), true);
  assert.equal(canonicalTransportKey(binary).includes("Bwg="), true);
  assert.deepEqual(redactTransportRequest(raw).body, { mode: "raw", value: "[redacted]" });
  assert.deepEqual(redactTransportRequest(binary).body, { mode: "binary", byteLength: 2 });
});


test("transport body codecs round-trip json raw and binary conformance fixtures", () => {
  const json = encodeTransportBody({ mode: "json", value: jsonTransportFixture.body });
  const raw = encodeTransportBody({ mode: "raw", value: rawTransportFixture.body });
  const binary = encodeTransportBody({ mode: "binary", value: binaryTransportFixture.body });

  assert.equal(json.contentType, "application/json");
  assert.equal(json.body, jsonTransportFixture.encoded);
  assert.equal(raw.contentType, "text/plain;charset=utf-8");
  assert.equal(raw.body, rawTransportFixture.body);
  assert.equal(binary.contentType, "application/octet-stream");
  assert.equal(canonicalEncodeWireValue(binary.body), binaryTransportFixture.encoded);

  const decodedJson = decodeTransportResponse({
    requestId: "req-json",
    status: 200,
    body: json.body,
    responseMode: "json",
  });
  const decodedRaw = decodeTransportResponse({
    requestId: "req-raw",
    status: 200,
    body: raw.body,
    responseMode: "raw",
  });
  const decodedBinary = decodeTransportResponse({
    requestId: "req-binary",
    status: 200,
    body: binary.body,
    responseMode: "binary",
  });

  assert.equal(decodedJson.requestId, "req-json");
  assert.equal(canonicalEncodeWireValue(decodedJson.payload), jsonTransportFixture.encoded);
  assert.deepEqual(decodedRaw.payload, rawTransportFixture.body);
  assert.equal(canonicalEncodeWireValue(decodedBinary.payload), binaryTransportFixture.encoded);
  if (isReadonlyBytes(decodedBinary.payload)) {
    const exported = decodedBinary.payload.toUint8Array();
    exported[0] = 99;
    assert.equal(decodedBinary.payload.at(0), 4);
  }
});

test("transport response normalization distinguishes remote and protocol failures", () => {
  assert.throws(
    () => decodeTransportResponse({ requestId: "req-bad-json", status: 200, body: "{", responseMode: "json" }),
    (error: unknown) => error instanceof ProtocolError && error.code === "invalid_transport_response",
  );

  assert.throws(
    () =>
      decodeTransportResponse({
        requestId: "req-denied",
        status: 403,
        body: JSON.stringify({
          code: "holm.denied",
          message: "Denied",
          details: { authorization: "Bearer secret", safe: "kept" },
          retryable: false,
        }),
        responseMode: "json",
      }),
    (error: unknown) => {
      if (!(error instanceof RemoteError)) {
        return false;
      }
      const serialized = error.toJSON();
      return (
        serialized.status === 403 &&
        serialized.code === "holm.denied" &&
        serialized.retryable === false &&
        canonicalEncodeWireValue(serialized.details ?? null) ===
          '{"authorization":"[redacted]","safe":"kept"}'
      );
    },
  );

  assert.throws(
    () => decodeTransportResponse({ requestId: "req-empty", status: 204, body: "", responseMode: "json" }),
    (error: unknown) => error instanceof ProtocolError,
  );
});



test("transport response normalization covers fallback remote envelopes and invalid modes", () => {
  const emptyRemote = (() => {
    try {
      decodeTransportResponse({ requestId: "req-empty-remote", status: 500, body: "", responseMode: "raw" });
    } catch (error) {
      return error;
    }
    throw new Error("expected remote error");
  })();
  const invalidRemote = (() => {
    try {
      decodeTransportResponse({ requestId: "req-invalid-remote", status: 502, body: "not json", responseMode: "json" });
    } catch (error) {
      return error;
    }
    throw new Error("expected remote error");
  })();
  const defaultEnvelopeRemote = (() => {
    try {
      decodeTransportResponse({ requestId: "req-default-remote", status: 404, body: "{}", responseMode: "json" });
    } catch (error) {
      return error;
    }
    throw new Error("expected remote error");
  })();

  assert.equal(emptyRemote instanceof RemoteError, true);
  assert.equal(invalidRemote instanceof RemoteError, true);
  assert.equal(defaultEnvelopeRemote instanceof RemoteError, true);
  assert.equal((defaultEnvelopeRemote as RemoteError).code, "holm.remote_error");
  assert.equal((defaultEnvelopeRemote as RemoteError).message, "Remote operation failed.");
  assert.throws(
    () => decodeTransportResponse({ requestId: "req-status", status: 99, body: "", responseMode: "raw" }),
    (error: unknown) => error instanceof ProtocolError && error.code === "invalid_transport_status",
  );
  assert.throws(
    () => decodeTransportResponse({ requestId: "req-raw-invalid", status: 200, body: 1, responseMode: "raw" }),
    ProtocolError,
  );
  assert.throws(
    () => decodeTransportResponse({ requestId: "req-binary-invalid", status: 200, body: {}, responseMode: "binary" }),
    ProtocolError,
  );
  assert.throws(
    () => decodeTransportResponse({ requestId: "req-binary-primitive", status: 200, body: "not-bytes", responseMode: "binary" }),
    ProtocolError,
  );
  assert.equal(
    canonicalEncodeWireValue(
      decodeTransportResponse({ requestId: "req-binary-u8", status: 200, body: new Uint8Array([9]), responseMode: "binary" }).payload,
    ),
    '{"$holm":"bytes","base64":"CQ=="}',
  );
});


test("transport errors normalize abort cancellation and network failures", () => {
  const cancellation = createCancellationController();
  cancellation.cancel("caller aborted");

  const cancelled = normalizeTransportError(new Error("socket closed"), { cancellation: cancellation.signal });
  const abortLike = normalizeTransportError({ name: "AbortError", message: "aborted" });
  const transport = normalizeTransportError(new Error("token secret should not leak"), {
    request: createTransportRequest({
      method: "GET",
      url: "/api/secret",
      headers: { authorization: "Bearer secret-token" },
      responseMode: "json",
    }),
  });
  const existing = new HolmError({ kind: "protocol", code: "already", message: "Already normalized" });

  assert.equal(cancelled instanceof CancelledError, true);
  assert.equal(abortLike instanceof CancelledError, true);
  assert.equal(transport instanceof TransportError, true);
  assert.equal(transport.retryable, true);
  assert.equal(JSON.stringify(transport.toJSON()).includes("secret-token"), false);
  assert.equal(normalizeTransportError(existing), existing);
});



test("transport error constructors and normalization cover custom metadata branches", () => {
  const transport = new TransportError({
    code: "custom_transport",
    message: "Custom transport",
    details: { safe: true },
    retryable: false,
    cause: new Error("cause"),
  });
  const remote = new RemoteError({
    code: "holm.custom",
    message: "Custom remote",
    status: 409,
    cause: new Error("remote cause"),
  });
  const protocol = new ProtocolError({
    code: "custom_protocol",
    message: "Custom protocol",
    details: { reason: "fixture" },
    cause: new Error("protocol cause"),
  });
  const noReasonCancellation = createCancellationController();
  noReasonCancellation.cancel();

  assert.equal(transport.retryable, false);
  assert.equal(transport.code, "custom_transport");
  assert.equal(remote.toJSON().details, undefined);
  assert.equal(protocol.code, "custom_protocol");
  assert.equal(normalizeTransportError({ code: "ABORT_ERR" }) instanceof CancelledError, true);
  assert.equal(normalizeTransportError("boom") instanceof TransportError, true);
  assert.equal(normalizeTransportError("boom", { cancellation: noReasonCancellation.signal }) instanceof CancelledError, true);
});


test("transport redaction removes secrets from diagnostics while preserving route evidence", () => {
  const request = createTransportRequest({
    method: "POST",
    url: "/api/reports",
    headers: { authorization: "Bearer secret-token", cookie: "holm_session=secret", "x-trace": "abc" },
    body: { mode: "json", value: { payload: "do not log", safe: "kept" } },
    responseMode: "json",
  });

  const diagnostic = redactTransportRequest(request);

  assert.deepEqual(diagnostic.headers, {
    authorization: "[redacted]",
    cookie: "[redacted]",
    "x-trace": "abc",
  });
  assert.deepEqual(diagnostic.body, { mode: "json", value: "[redacted]" });
  assert.equal(JSON.stringify(diagnostic).includes("secret-token"), false);
  assert.equal(JSON.stringify(diagnostic).includes("do not log"), false);
});
