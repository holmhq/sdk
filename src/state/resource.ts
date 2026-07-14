import {
  LifecycleError,
  type HolmDiagnosticsSink,
} from "../core/index.js";
import type { HolmError } from "../core/errors.js";
import type { ReadonlyDeep } from "../core/extensions.js";
import type { Clock } from "../core/runtime.js";
import { copyWireValue } from "../core/wire-value.js";

export type ResourcePhase = "idle" | "loading" | "ready" | "error" | "disposed";

export interface ResourceSnapshot<T, E = HolmError> {
  readonly revision: number;
  readonly phase: ResourcePhase;
  readonly data?: ReadonlyDeep<T>;
  readonly error?: E;
  readonly stale: boolean;
  readonly refreshing: boolean;
  readonly updatedAt?: number;
}

export type ResourceSnapshotListener = () => void;
export type ResourceUnsubscribe = () => void;

export interface Resource<T, E = HolmError> {
  getSnapshot(): ResourceSnapshot<T, E>;
  subscribe(listener: ResourceSnapshotListener): ResourceUnsubscribe;
  dispose(): void;
}

export type ResourceValueCopier<T> = (value: T) => T;

export interface ResourceControllerOptions<T> {
  readonly clock?: Clock;
  readonly diagnostics?: HolmDiagnosticsSink;
  readonly id?: string;
  readonly copy?: ResourceValueCopier<T>;
}

export interface ResourceLoadingOptions {
  readonly stale?: boolean;
  readonly refreshing?: boolean;
  readonly retainData?: boolean;
}

export interface ResourceReadyOptions {
  readonly stale?: boolean;
  readonly refreshing?: boolean;
}

export interface ResourceErrorOptions {
  readonly stale?: boolean;
  readonly refreshing?: boolean;
  readonly retainData?: boolean;
}

export interface ResourceController<T, E = HolmError> {
  readonly resource: Resource<T, E>;
  getSnapshot(): ResourceSnapshot<T, E>;
  setIdle(): ResourceSnapshot<T, E>;
  setLoading(options?: ResourceLoadingOptions): ResourceSnapshot<T, E>;
  setReady(data: T, options?: ResourceReadyOptions): ResourceSnapshot<T, E>;
  setError(error: E, options?: ResourceErrorOptions): ResourceSnapshot<T, E>;
  setStale(stale?: boolean): ResourceSnapshot<T, E>;
  dispose(): ResourceSnapshot<T, E>;
}

type SnapshotDraft<T, E> = {
  revision: number;
  phase: ResourcePhase;
  stale: boolean;
  refreshing: boolean;
  data?: ReadonlyDeep<T>;
  error?: E;
  updatedAt?: number;
};

export function createResourceController<T, E = HolmError>(
  options: ResourceControllerOptions<T> = {},
): ResourceController<T, E> {
  const listeners = new Set<ResourceSnapshotListener>();
  const resourceId = normalizeResourceId(options.id);
  let snapshot = freezeSnapshot<T, E>({ revision: 0, phase: "idle", stale: false, refreshing: false });

  const resource: Resource<T, E> = Object.freeze({
    getSnapshot: () => snapshot,
    subscribe(listener: ResourceSnapshotListener) {
      if (typeof listener !== "function") {
        throw new TypeError("State resource listener must be a function.");
      }
      if (snapshot.phase === "disposed") {
        return noop;
      }
      listeners.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) {
          return;
        }
        subscribed = false;
        listeners.delete(listener);
      };
    },
    dispose() {
      dispose();
    },
  });

  function getSnapshot(): ResourceSnapshot<T, E> {
    return snapshot;
  }

  function setIdle(): ResourceSnapshot<T, E> {
    assertActive(snapshot);
    return install({
      phase: "idle",
      stale: false,
      refreshing: false,
    });
  }

  function setLoading(input: ResourceLoadingOptions = {}): ResourceSnapshot<T, E> {
    assertActive(snapshot);
    const retainData = input.retainData ?? input.refreshing === true;
    return install({
      phase: "loading",
      stale: input.stale ?? false,
      refreshing: input.refreshing ?? false,
      ...(retainData && snapshot.data !== undefined ? { data: copyResourceValue(snapshot.data as T, options.copy) } : {}),
    });
  }

  function setReady(data: T, input: ResourceReadyOptions = {}): ResourceSnapshot<T, E> {
    assertActive(snapshot);
    const updatedAt = timestamp(options.clock);
    return install({
      phase: "ready",
      data: copyResourceValue(data, options.copy),
      stale: input.stale ?? false,
      refreshing: input.refreshing ?? false,
      ...(updatedAt === undefined ? {} : { updatedAt }),
    });
  }

  function setError(error: E, input: ResourceErrorOptions = {}): ResourceSnapshot<T, E> {
    assertActive(snapshot);
    const retainData = input.retainData ?? snapshot.data !== undefined;
    const updatedAt = timestamp(options.clock);
    return install({
      phase: "error",
      error,
      stale: input.stale ?? false,
      refreshing: input.refreshing ?? false,
      ...(updatedAt === undefined ? {} : { updatedAt }),
      ...(retainData && snapshot.data !== undefined ? { data: copyResourceValue(snapshot.data as T, options.copy) } : {}),
    });
  }

  function setStale(stale = true): ResourceSnapshot<T, E> {
    assertActive(snapshot);
    return install({
      phase: snapshot.phase,
      stale,
      refreshing: false,
      ...(snapshot.data === undefined ? {} : { data: copyResourceValue(snapshot.data as T, options.copy) }),
      ...(snapshot.error === undefined ? {} : { error: snapshot.error }),
      ...(snapshot.updatedAt === undefined ? {} : { updatedAt: snapshot.updatedAt }),
    });
  }

  function dispose(): ResourceSnapshot<T, E> {
    if (snapshot.phase === "disposed") {
      return snapshot;
    }
    const updatedAt = timestamp(options.clock);
    const next = freezeSnapshot<T, E>({
      revision: snapshot.revision + 1,
      phase: "disposed",
      stale: false,
      refreshing: false,
      ...(updatedAt === undefined ? {} : { updatedAt }),
    });
    snapshot = next;
    const currentListeners = [...listeners];
    listeners.clear();
    notify(currentListeners);
    return snapshot;
  }

  function install(input: Omit<SnapshotDraft<T, E>, "revision">): ResourceSnapshot<T, E> {
    const next = freezeSnapshot<T, E>({ revision: snapshot.revision + 1, ...input });
    snapshot = next;
    notify([...listeners]);
    return snapshot;
  }

  function notify(currentListeners: readonly ResourceSnapshotListener[]): void {
    currentListeners.forEach((listener, index) => {
      try {
        listener();
      } catch (error) {
        reportListenerError(options.diagnostics, resourceId, snapshot, index, error);
      }
    });
  }

  return Object.freeze({
    resource,
    getSnapshot,
    setIdle,
    setLoading,
    setReady,
    setError,
    setStale,
    dispose,
  });
}

function assertActive(snapshot: ResourceSnapshot<unknown, unknown>): void {
  if (snapshot.phase !== "disposed") {
    return;
  }
  throw new LifecycleError({
    code: "state_resource_disposed",
    message: "State resource has been disposed.",
  });
}

function copyResourceValue<T>(value: T, copier: ResourceValueCopier<T> | undefined): ReadonlyDeep<T> {
  if (copier !== undefined) {
    return deepFreeze(copier(value), new WeakSet<object>()) as ReadonlyDeep<T>;
  }
  return copyWireValue(value) as ReadonlyDeep<T>;
}

function deepFreeze<T>(value: T, seen: WeakSet<object>): T {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return value;
  }
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const key of Object.keys(value)) {
    deepFreeze((value as Record<string, unknown>)[key], seen);
  }
  return Object.freeze(value);
}

function freezeSnapshot<T, E>(draft: SnapshotDraft<T, E>): ResourceSnapshot<T, E> {
  const cleaned: SnapshotDraft<T, E> = {
    revision: draft.revision,
    phase: draft.phase,
    stale: draft.stale,
    refreshing: draft.refreshing,
  };
  if (draft.data !== undefined) {
    cleaned.data = draft.data;
  }
  if (draft.error !== undefined) {
    cleaned.error = draft.error;
  }
  if (draft.updatedAt !== undefined) {
    cleaned.updatedAt = draft.updatedAt;
  }
  return Object.freeze(cleaned);
}

function timestamp(clock: Clock | undefined): number | undefined {
  if (clock === undefined) {
    return undefined;
  }
  const at = clock.now();
  if (!Number.isFinite(at)) {
    throw new TypeError("State resource clock must return a finite timestamp.");
  }
  return at;
}

function normalizeResourceId(value: string | undefined): string {
  if (value === undefined) {
    return "resource";
  }
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError("State resource id must be a non-empty string when provided.");
  }
  return normalized;
}

function reportListenerError(
  diagnostics: HolmDiagnosticsSink | undefined,
  resourceId: string,
  snapshot: ResourceSnapshot<unknown, unknown>,
  listenerIndex: number,
  error: unknown,
): void {
  if (diagnostics === undefined) {
    return;
  }
  try {
    diagnostics.emit({
      channel: "state.resource",
      code: "state_resource_listener_error",
      severity: "error",
      message: "State resource listener failed.",
      details: {
        resourceId,
        phase: snapshot.phase,
        revision: snapshot.revision,
        listenerIndex,
      },
      error,
    });
  } catch {
    // Diagnostics are observational and must not alter resource delivery.
  }
}

function noop(): void {
  // Intentionally empty.
}
