import { CancelledError, throwIfCancelled } from "../core/cancellation.js";
import type { HolmDiagnosticsSink } from "../core/diagnostics.js";
import type {
  CancellationSignal,
  Clock,
  OperationResponse,
  Scheduler,
} from "../core/runtime.js";
import {
  createTransportCache,
  type TransportCache,
  type TransportCachePolicy,
} from "../transports/index.js";

export interface WebRuntimeCacheOptions {
  readonly ttlMs?: number;
  readonly swrMs?: number;
  readonly maxEntries?: number;
}

export interface WebRuntimeCacheState {
  readonly instance: TransportCache;
  readonly policy: TransportCachePolicy;
}

export function createWebRuntimeCache(
  options: false | WebRuntimeCacheOptions | undefined,
  clock: Clock,
  scheduler: Scheduler,
  diagnostics: HolmDiagnosticsSink | undefined,
): WebRuntimeCacheState | undefined {
  if (options === false) {
    return undefined;
  }
  const policy = Object.freeze({
    ttlMs: normalizeCacheDuration(options?.ttlMs ?? 30_000, "ttlMs"),
    swrMs: normalizeCacheDuration(options?.swrMs ?? 60_000, "swrMs"),
  });
  return Object.freeze({
    instance: createTransportCache({
      clock,
      scheduler,
      maxEntries: options?.maxEntries ?? 100,
      ...(diagnostics === undefined ? {} : { diagnostics }),
    }),
    policy,
  });
}

export function waitForWebResponse(
  response: Promise<OperationResponse>,
  cancellation: CancellationSignal | undefined,
): Promise<OperationResponse> {
  if (cancellation === undefined) {
    return response;
  }
  throwIfCancelled(cancellation);
  return new Promise<OperationResponse>((resolve, reject) => {
    let settled = false;
    const unsubscribe = cancellation.onCancel(() => {
      finish(() => reject(new CancelledError(cancellation.reason === undefined ? {} : { reason: cancellation.reason })));
    });
    const finish = (complete: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      unsubscribe();
      complete();
    };
    response.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error)),
    );
  });
}

export function rebindResponseRequestId(response: OperationResponse, requestId: string): OperationResponse {
  return Object.freeze({
    ...response,
    requestId,
  });
}

function normalizeCacheDuration(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`Web runtime cache ${label} must be a non-negative finite number.`);
  }
  return value;
}
