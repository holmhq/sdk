import { HolmError, serializeHolmError, type SerializedHolmError } from "./errors.js";
import type { WireObject, WireValue } from "./wire-value.js";

export type HolmDiagnosticSeverity = "debug" | "info" | "warn" | "error";

export interface HolmDiagnosticEventInput {
  readonly channel: string;
  readonly code: string;
  readonly severity: HolmDiagnosticSeverity;
  readonly message: string;
  readonly at?: number;
  readonly details?: unknown;
  readonly error?: unknown;
}

export interface HolmDiagnosticEvent {
  readonly channel: string;
  readonly code: string;
  readonly severity: HolmDiagnosticSeverity;
  readonly message: string;
  readonly at?: number;
  readonly details?: WireObject;
  readonly error?: SerializedHolmError;
}

export type HolmDiagnosticsHandler = (event: HolmDiagnosticEvent) => void | PromiseLike<void>;

export interface HolmDiagnosticsSink {
  emit(event: HolmDiagnosticEventInput): HolmDiagnosticEvent;
}

export interface DiagnosticsSinkOptions {
  readonly onHandlerError?: HolmDiagnosticsHandler;
}

const severities: readonly HolmDiagnosticSeverity[] = ["debug", "info", "warn", "error"];

export function createHolmDiagnosticEvent(input: HolmDiagnosticEventInput): HolmDiagnosticEvent {
  const at = normalizeOptionalTimestamp(input.at);
  return Object.freeze({
    channel: normalizeNonEmpty(input.channel, "diagnostic channel"),
    code: normalizeNonEmpty(input.code, "diagnostic code"),
    severity: normalizeSeverity(input.severity),
    message: normalizeNonEmpty(input.message, "diagnostic message"),
    ...(at === undefined ? {} : { at }),
    ...(input.details === undefined ? {} : { details: redactDiagnosticDetails(input.details) }),
    ...(input.error === undefined ? {} : { error: serializeHolmError(input.error) }),
  });
}

export function createDiagnosticsSink(
  handlers: HolmDiagnosticsHandler | readonly HolmDiagnosticsHandler[] = [],
  options: DiagnosticsSinkOptions = {},
): HolmDiagnosticsSink {
  const normalizedHandlers = normalizeHandlers(handlers);
  const onHandlerError = options.onHandlerError;

  function emit(input: HolmDiagnosticEventInput): HolmDiagnosticEvent {
    const event = createHolmDiagnosticEvent(input);
    for (const handler of normalizedHandlers) {
      notifyHandler(handler, event, onHandlerError);
    }
    return event;
  }

  return Object.freeze({ emit }) satisfies HolmDiagnosticsSink;
}

function normalizeHandlers(handlers: HolmDiagnosticsHandler | readonly HolmDiagnosticsHandler[]): readonly HolmDiagnosticsHandler[] {
  return Object.freeze(Array.isArray(handlers) ? [...handlers] : [handlers]);
}

function notifyHandler(
  handler: HolmDiagnosticsHandler,
  event: HolmDiagnosticEvent,
  onHandlerError: HolmDiagnosticsHandler | undefined,
): void {
  try {
    const result = handler(event);
    if (isPromiseLike(result)) {
      void Promise.resolve(result).catch((error: unknown) => reportHandlerError(error, event, onHandlerError));
    }
  } catch (error) {
    reportHandlerError(error, event, onHandlerError);
  }
}

function reportHandlerError(
  error: unknown,
  sourceEvent: HolmDiagnosticEvent,
  onHandlerError: HolmDiagnosticsHandler | undefined,
): void {
  if (onHandlerError === undefined) {
    return;
  }
  const event = createHolmDiagnosticEvent({
    channel: "core.diagnostics",
    code: "diagnostics_handler_error",
    severity: "error",
    message: "Diagnostics handler failed.",
    details: {
      sourceChannel: sourceEvent.channel,
      sourceCode: sourceEvent.code,
    },
    error,
  });
  try {
    const result = onHandlerError(event);
    if (isPromiseLike(result)) {
      void Promise.resolve(result).catch(() => undefined);
    }
  } catch {
    // Diagnostics must never alter the operation that produced the event.
  }
}

function normalizeSeverity(severity: HolmDiagnosticSeverity): HolmDiagnosticSeverity {
  if (!severities.includes(severity)) {
    throw new TypeError(`Unknown diagnostic severity: ${String(severity)}`);
  }
  return severity;
}

function normalizeOptionalTimestamp(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isFinite(value)) {
    throw new TypeError("Diagnostic timestamp must be finite when provided.");
  }
  return value;
}

function normalizeNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError(`Holm ${label} must be a non-empty string.`);
  }
  return normalized;
}

function redactDiagnosticDetails(details: unknown): WireObject {
  const serialized = new HolmError({
    kind: "protocol",
    code: "diagnostic_details",
    message: "Diagnostic details.",
    details,
  }).toJSON().details;
  if (serialized === undefined) {
    return Object.freeze({});
  }
  if (isWireObject(serialized)) {
    return serialized;
  }
  return Object.freeze({ value: serialized });
}

function isWireObject(value: WireValue): value is WireObject {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !("byteLength" in value);
}

function isPromiseLike(value: unknown): value is PromiseLike<void> {
  return typeof value === "object" && value !== null && typeof (value as { readonly then?: unknown }).then === "function";
}
