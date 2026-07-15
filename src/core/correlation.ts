import type { HolmDiagnosticsSink } from "./diagnostics.js";
import { ProtocolError } from "./errors.js";
import type { Clock, OperationResponse } from "./runtime.js";

export type InvocationResponseOutcome = "accepted" | "duplicate" | "late";

export interface InvocationResponseHandle {
  readonly requestId: string;
  accept(response: OperationResponse): InvocationResponseOutcome;
  cancel(): void;
  fail(): void;
}

export interface InvocationResponseTracker {
  begin(requestId: string): InvocationResponseHandle;
  clear(): void;
}

export interface InvocationResponseTrackerOptions {
  readonly clock: Clock;
  readonly diagnostics?: HolmDiagnosticsSink;
  readonly maxTerminalRequests?: number;
}

type InvocationResponseState = "active" | "accepted" | "cancelled" | "failed";

interface TrackedInvocationResponse {
  readonly requestId: string;
  state: InvocationResponseState;
}

export function createInvocationResponseTracker(
  options: InvocationResponseTrackerOptions,
): InvocationResponseTracker {
  const maxTerminalRequests = normalizeMaxTerminalRequests(options.maxTerminalRequests ?? 1024);
  const tracked = new Map<string, TrackedInvocationResponse>();
  const terminal: TrackedInvocationResponse[] = [];

  function begin(requestId: string): InvocationResponseHandle {
    const normalizedRequestId = normalizeInvocationRequestId(requestId);
    const existing = tracked.get(normalizedRequestId);
    if (existing !== undefined) {
      emit("runtime_request_duplicate", "warn", "Runtime request ID was already used.", {
        requestId: normalizedRequestId,
        state: existing.state,
      });
      throw new ProtocolError({
        code: "runtime_request_duplicate",
        message: "Runtime request ID must identify exactly one logical request.",
        details: { requestId: normalizedRequestId, state: existing.state },
      });
    }

    const record: TrackedInvocationResponse = { requestId: normalizedRequestId, state: "active" };
    tracked.set(normalizedRequestId, record);
    return Object.freeze({
      requestId: normalizedRequestId,
      accept(response: OperationResponse): InvocationResponseOutcome {
        if (response.requestId !== normalizedRequestId) {
          finish(record, "failed");
          emit("runtime_response_mismatch", "error", "Runtime response did not match its request ID.", {
            expectedRequestId: normalizedRequestId,
            actualRequestId: response.requestId,
          });
          throw new ProtocolError({
            code: "runtime_response_mismatch",
            message: "Runtime response request ID does not match the logical request.",
            details: { expectedRequestId: normalizedRequestId, actualRequestId: response.requestId },
          });
        }
        if (record.state === "active") {
          finish(record, "accepted");
          return "accepted";
        }
        if (record.state === "accepted") {
          emit("runtime_response_duplicate", "warn", "Duplicate runtime response was ignored.", {
            requestId: normalizedRequestId,
          });
          return "duplicate";
        }
        emit("runtime_response_late", "info", "Late runtime response was ignored.", {
          requestId: normalizedRequestId,
          terminalState: record.state,
        });
        return "late";
      },
      cancel(): void {
        finish(record, "cancelled");
      },
      fail(): void {
        finish(record, "failed");
      },
    });
  }

  function finish(record: TrackedInvocationResponse, state: Exclude<InvocationResponseState, "active">): void {
    if (record.state !== "active") {
      return;
    }
    record.state = state;
    terminal.push(record);
    while (terminal.length > maxTerminalRequests) {
      const expired = terminal.shift();
      if (expired !== undefined && tracked.get(expired.requestId) === expired) {
        tracked.delete(expired.requestId);
      }
    }
  }

  function clear(): void {
    for (const record of tracked.values()) {
      if (record.state === "active") {
        record.state = "cancelled";
      }
    }
    tracked.clear();
    terminal.splice(0);
  }

  function emit(
    code: string,
    severity: "info" | "warn" | "error",
    message: string,
    details: unknown,
  ): void {
    options.diagnostics?.emit({
      channel: "core.invoke",
      code,
      severity,
      message,
      at: options.clock.now(),
      details,
    });
  }

  return Object.freeze({ begin, clear });
}

export function normalizeInvocationRequestId(requestId: string): string {
  const normalized = requestId.trim();
  if (normalized === "") {
    throw new ProtocolError({
      code: "runtime_request_id_invalid",
      message: "Runtime request ID must be a non-empty string.",
    });
  }
  return normalized;
}

function normalizeMaxTerminalRequests(value: number): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError("Invocation response tracker capacity must be a positive integer.");
  }
  return value;
}
