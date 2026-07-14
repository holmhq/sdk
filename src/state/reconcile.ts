import {
  LifecycleError,
  type CapabilityRequirement,
  type CapabilityView,
  type HolmDiagnosticsSink,
} from "../core/index.js";
import type { HolmError } from "../core/errors.js";
import type { ResourceSnapshot } from "./resource.js";
import type { QueryResource } from "./query.js";

export const REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY = Object.freeze({
  id: "holm.realtime.public.subscribe",
  major: 1,
  minMinor: 0,
} as const satisfies CapabilityRequirement);

export type RealtimePublicSubscribeRequirement = typeof REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY;

export interface RealtimeHookSupports {
  readonly publicSubscribe: true;
  readonly privateChannels: false;
  readonly presence: false;
  readonly collaboration: false;
  readonly durableReplay: false;
}

export interface RealtimeInvalidateHint {
  readonly kind: "invalidate";
  readonly reason?: string;
  readonly refresh?: false;
}

export interface RealtimeInvalidateAndRefreshHint {
  readonly kind: "invalidate";
  readonly reason?: string;
  readonly refresh: true;
}

export interface RealtimeReconcileHint<TData> {
  readonly kind: "reconcile";
  readonly data: TData;
  readonly reason?: string;
}

export type RealtimeResourceHint<TData> =
  | RealtimeInvalidateHint
  | RealtimeInvalidateAndRefreshHint
  | RealtimeReconcileHint<TData>;

export interface RealtimeReconcileHook<TData, E extends HolmError = HolmError> {
  readonly durable: false;
  readonly supports: RealtimeHookSupports;
  handle(hint: RealtimeInvalidateAndRefreshHint): Promise<ResourceSnapshot<TData, E>>;
  handle(hint: RealtimeInvalidateHint | RealtimeReconcileHint<TData>): ResourceSnapshot<TData, E>;
  dispose(): void;
}

export interface RealtimeReconcileHookOptions<TData, E extends HolmError = HolmError> {
  readonly query: QueryResource<TData, E>;
  readonly capabilities: CapabilityView;
  readonly requirement?: RealtimePublicSubscribeRequirement;
  readonly diagnostics?: HolmDiagnosticsSink;
  readonly id?: string;
}

const realtimeHookSupports = Object.freeze({
  publicSubscribe: true,
  privateChannels: false,
  presence: false,
  collaboration: false,
  durableReplay: false,
} as const satisfies RealtimeHookSupports);

export function createRealtimeReconcileHook<TData, E extends HolmError = HolmError>(
  options: RealtimeReconcileHookOptions<TData, E>,
): RealtimeReconcileHook<TData, E> {
  const resourceId = normalizeResourceId(options.id);
  const requirement = normalizePublicRequirement(options.requirement ?? REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY);
  let disposed = false;

  function handle(hint: RealtimeInvalidateAndRefreshHint): Promise<ResourceSnapshot<TData, E>>;
  function handle(hint: RealtimeInvalidateHint | RealtimeReconcileHint<TData>): ResourceSnapshot<TData, E>;
  function handle(hint: RealtimeResourceHint<TData>): ResourceSnapshot<TData, E> | Promise<ResourceSnapshot<TData, E>> {
    assertNotDisposed(disposed);
    options.capabilities.require(requirement);
    if (hint.kind === "invalidate") {
      const invalidated = options.query.markStale();
      emitHookDiagnostic(options.diagnostics, resourceId, hint.kind, hint.reason, invalidated);
      if (hint.refresh === true) {
        return options.query.refresh({ force: true, ...(hint.reason === undefined ? {} : { reason: hint.reason }) });
      }
      return invalidated;
    }
    const reconciled = options.query.reconcile(hint.data, hint.reason === undefined ? {} : { reason: hint.reason });
    emitHookDiagnostic(options.diagnostics, resourceId, hint.kind, hint.reason, reconciled);
    return reconciled;
  }

  return Object.freeze({
    durable: false,
    supports: realtimeHookSupports,
    handle,
    dispose(): void {
      disposed = true;
    },
  });
}

function normalizePublicRequirement(requirement: CapabilityRequirement): RealtimePublicSubscribeRequirement {
  if (
    requirement.id !== REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY.id ||
    requirement.major !== REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY.major ||
    (requirement.minMinor ?? 0) !== REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY.minMinor
  ) {
    throw new TypeError("Realtime resource hooks are limited to public realtime subscribe invalidation/reconcile boundaries.");
  }
  return REALTIME_PUBLIC_SUBSCRIBE_CAPABILITY;
}

function emitHookDiagnostic(
  diagnostics: HolmDiagnosticsSink | undefined,
  resourceId: string,
  kind: RealtimeResourceHint<unknown>["kind"],
  reason: string | undefined,
  snapshot: ResourceSnapshot<unknown, unknown>,
): void {
  if (diagnostics === undefined) {
    return;
  }
  try {
    diagnostics.emit({
      channel: "state.realtime",
      code: kind === "invalidate" ? "state_realtime_invalidated" : "state_realtime_reconciled",
      severity: "debug",
      message: kind === "invalidate"
        ? "Realtime event invalidated a query resource."
        : "Realtime event reconciled a query resource.",
      details: {
        resourceId,
        phase: snapshot.phase,
        revision: snapshot.revision,
        ...(reason === undefined ? {} : { reason }),
      },
    });
  } catch {
    // Realtime hook diagnostics are observational only.
  }
}

function assertNotDisposed(disposed: boolean): void {
  if (!disposed) {
    return;
  }
  throw new LifecycleError({
    code: "state_realtime_hook_disposed",
    message: "State realtime reconcile hook has been disposed.",
  });
}

function normalizeResourceId(value: string | undefined): string {
  if (value === undefined) {
    return "realtime";
  }
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError("State realtime hook id must be a non-empty string when provided.");
  }
  return normalized;
}
