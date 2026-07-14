import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  createDiagnosticsSink,
  createHolmDiagnosticEvent,
  type HolmDiagnosticEvent,
} from "../../../src/core/index.js";

function findCode(events: readonly HolmDiagnosticEvent[], code: string): HolmDiagnosticEvent {
  const event = events.find((item) => item.code === code);
  assert.notEqual(event, undefined);
  return event as HolmDiagnosticEvent;
}

test("core diagnostics redact secrets freeze events and isolate handler failures", () => {
  const primary: HolmDiagnosticEvent[] = [];
  const secondary: HolmDiagnosticEvent[] = [];
  const handlerErrors: HolmDiagnosticEvent[] = [];
  const sink = createDiagnosticsSink([
    (event) => {
      primary.push(event);
      throw new Error("handler token secret must not leak");
    },
    (event) => {
      secondary.push(event);
    },
  ], {
    onHandlerError: (event) => {
      handlerErrors.push(event);
    },
  });

  const emitted = sink.emit({
    channel: "transport.cache",
    code: "cache_update",
    severity: "info",
    message: "Cache updated.",
    at: 42,
    details: {
      authorization: "Bearer secret-token",
      nested: { payload: { token: "nested-secret" }, safe: "kept" },
      safe: "visible",
    },
    error: new Error("background token secret must not leak"),
  });

  assert.equal(Object.isFrozen(emitted), true);
  assert.equal(Object.isFrozen(emitted.details), true);
  assert.equal(primary.length, 1);
  assert.equal(secondary.length, 1);
  assert.equal(handlerErrors.length, 1);
  assert.equal(emitted.details?.authorization, "[redacted]");
  assert.deepEqual(emitted.details?.nested, { payload: "[redacted]", safe: "kept" });
  assert.equal(emitted.error?.message, "Unexpected error");
  assert.equal(JSON.stringify([emitted, handlerErrors]).includes("secret-token"), false);
  assert.equal(JSON.stringify([emitted, handlerErrors]).includes("nested-secret"), false);
  assert.equal(JSON.stringify([emitted, handlerErrors]).includes("handler token secret"), false);
});

test("core diagnostics validate compact event fields without ambient runtime services", () => {
  const observed: HolmDiagnosticEvent[] = [];
  const sink = createDiagnosticsSink((event) => {
    observed.push(event);
  });
  const event = createHolmDiagnosticEvent({
    channel: "transport.cache",
    code: "background_error",
    severity: "error",
    message: "Background refresh failed.",
    details: { cookie: "holm_session=secret", route: "/api/reports" },
  });

  sink.emit(event);

  assert.equal(findCode(observed, "background_error").details?.cookie, "[redacted]");
  assert.equal(findCode(observed, "background_error").details?.route, "/api/reports");
  assert.throws(
    () => createHolmDiagnosticEvent({ channel: " ", code: "x", severity: "info", message: "valid" }),
    /channel/,
  );
  assert.throws(
    () => createHolmDiagnosticEvent({ channel: "core", code: " ", severity: "info", message: "valid" }),
    /code/,
  );
  assert.throws(
    () => createHolmDiagnosticEvent({ channel: "core", code: "x", severity: "fatal" as never, message: "valid" }),
    /severity/,
  );
  const minimal = createDiagnosticsSink().emit({
    channel: "core",
    code: "minimal",
    severity: "debug",
    message: "Minimal event.",
  });
  const scalarDetails = createHolmDiagnosticEvent({
    channel: "core",
    code: "scalar",
    severity: "warn",
    message: "Scalar detail.",
    details: "kept",
  });

  assert.equal(minimal.details, undefined);
  assert.deepEqual(scalarDetails.details, { value: "kept" });
  assert.throws(
    () => createHolmDiagnosticEvent({ channel: "core", code: "x", severity: "info", message: "valid", at: Number.NaN }),
    /timestamp/,
  );
  assert.throws(
    () => createHolmDiagnosticEvent({ channel: "core", code: "x", severity: "info", message: " " }),
    /message/,
  );
});

test("core diagnostics isolate async handler failures and handler-error failures", async () => {
  const handlerErrors: HolmDiagnosticEvent[] = [];
  const sink = createDiagnosticsSink(
    () => Promise.reject(new Error("async token secret must not leak")),
    {
      onHandlerError: (event) => {
        handlerErrors.push(event);
        return Promise.reject(new Error("secondary secret must not leak"));
      },
    },
  );
  const throwingErrorSink = createDiagnosticsSink(
    () => {
      throw new Error("sync secret must not leak");
    },
    {
      onHandlerError: () => {
        throw new Error("handler-error secret must not leak");
      },
    },
  );

  sink.emit({ channel: "core", code: "async", severity: "error", message: "Async failure." });
  assert.doesNotThrow(() =>
    throwingErrorSink.emit({ channel: "core", code: "throw", severity: "error", message: "Throw failure." }),
  );
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(handlerErrors.length, 1);
  assert.equal(handlerErrors[0]?.code, "diagnostics_handler_error");
  assert.equal(JSON.stringify(handlerErrors).includes("async token secret"), false);
  assert.equal(JSON.stringify(handlerErrors).includes("secondary secret"), false);
});
