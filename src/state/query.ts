import {
  CancelledError,
  createCallerFingerprint,
  createCallerPartitionedCacheKey,
  createCancellationController,
  HolmError,
  LifecycleError,
  normalizeCacheSourceIdentity,
  resolveCallerContext,
  type CacheSourceIdentity,
  type CallerContext,
  type CallerProvider,
  type CancellationSignal,
  type HolmDiagnosticsSink,
  type WireValue,
} from "../core/index.js";
import type { Clock } from "../core/runtime.js";
import { copyWireValue } from "../core/wire-value.js";
import {
  createResourceController,
  type Resource,
  type ResourceSnapshot,
  type ResourceSnapshotListener,
  type ResourceUnsubscribe,
  type ResourceValueCopier,
} from "./resource.js";

export type QueryKey = readonly unknown[];

export interface QueryLoadContext {
  readonly key: readonly WireValue[];
  readonly source: CacheSourceIdentity;
  readonly caller: CallerContext;
  readonly callerFingerprint: string;
  readonly cacheKey: string;
  readonly cancellation: CancellationSignal;
  readonly stale: boolean;
  readonly reason?: string;
}

export type QueryLoader<T> = (context: QueryLoadContext) => T | Promise<T>;

export interface QueryRefreshOptions {
  readonly cancellation?: CancellationSignal;
  readonly force?: boolean;
  readonly reason?: string;
}

export interface QueryResetOptions {
  readonly source?: CacheSourceIdentity;
  readonly caller?: CallerProvider;
  readonly reason?: string;
}

export interface QueryResourceOptions<T> {
  readonly key: QueryKey;
  readonly source: CacheSourceIdentity;
  readonly caller: CallerProvider;
  readonly load: QueryLoader<T>;
  readonly clock?: Clock;
  readonly diagnostics?: HolmDiagnosticsSink;
  readonly id?: string;
  readonly copy?: ResourceValueCopier<T>;
}

export interface QueryResource<T, E extends HolmError = HolmError> extends Resource<T, E> {
  refresh(options?: QueryRefreshOptions): Promise<ResourceSnapshot<T, E>>;
  currentLoad(): Promise<ResourceSnapshot<T, E>>;
  markStale(): ResourceSnapshot<T, E>;
  reset(options?: QueryResetOptions): ResourceSnapshot<T, E>;
  dispose(): void;
}

interface ActiveQueryLoad<T, E extends HolmError> {
  readonly token: object;
  readonly promise: Promise<ResourceSnapshot<T, E>>;
  readonly cancellation: ReturnType<typeof createCancellationController>;
  cleanup(): void;
}

export function createQueryResource<T, E extends HolmError = HolmError>(
  options: QueryResourceOptions<T>,
): QueryResource<T, E> {
  const key = normalizeQueryKey(options.key);
  const controller = createResourceController<T, E>({
    ...(options.clock === undefined ? {} : { clock: options.clock }),
    ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
    ...(options.id === undefined ? {} : { id: options.id }),
    ...(options.copy === undefined ? {} : { copy: options.copy }),
  });
  let source = normalizeCacheSourceIdentity(options.source);
  let caller = options.caller;
  let callerUnsubscribe = subscribeToCaller(caller);
  let active: ActiveQueryLoad<T, E> | undefined;
  let disposed = false;

  const query: QueryResource<T, E> = Object.freeze({
    getSnapshot(): ResourceSnapshot<T, E> {
      return controller.resource.getSnapshot();
    },
    subscribe(listener: ResourceSnapshotListener): ResourceUnsubscribe {
      return controller.resource.subscribe(listener);
    },
    refresh(input: QueryRefreshOptions = {}): Promise<ResourceSnapshot<T, E>> {
      return refresh(input);
    },
    currentLoad(): Promise<ResourceSnapshot<T, E>> {
      return active?.promise ?? Promise.resolve(controller.getSnapshot());
    },
    markStale(): ResourceSnapshot<T, E> {
      return controller.setStale(true);
    },
    reset(input: QueryResetOptions = {}): ResourceSnapshot<T, E> {
      return reset(input);
    },
    dispose(): void {
      dispose();
    },
  });

  function refresh(input: QueryRefreshOptions = {}): Promise<ResourceSnapshot<T, E>> {
    assertNotDisposed();
    if (active !== undefined && input.force !== true) {
      return active.promise;
    }
    if (active !== undefined) {
      cancelActive("query refresh replaced");
    }

    const before = controller.getSnapshot();
    const hasData = before.data !== undefined;
    controller.setLoading({
      stale: before.stale || hasData,
      refreshing: hasData,
      retainData: hasData,
    });

    const cancellation = createCancellationController();
    const cleanupExternal = attachExternalCancellation(cancellation, input.cancellation);
    const token = Object.freeze({});
    const promise = Promise.resolve().then(() => runLoad(token, cancellation.signal, input)).finally(() => {
      if (active?.token === token) {
        active = undefined;
      }
      cleanupExternal();
    });
    active = Object.freeze({
      token,
      promise,
      cancellation,
      cleanup: cleanupExternal,
    });
    return promise;
  }

  async function runLoad(
    token: object,
    signal: CancellationSignal,
    input: QueryRefreshOptions,
  ): Promise<ResourceSnapshot<T, E>> {
    try {
      throwIfQueryCancelled(signal);
      const resolvedCaller = await resolveCallerContext(caller);
      throwIfQueryCancelled(signal);
      const callerFingerprint = createCallerFingerprint(resolvedCaller);
      const cacheKey = createQueryCacheKey(source, callerFingerprint, key);
      const context = Object.freeze({
        key,
        source,
        caller: resolvedCaller,
        callerFingerprint,
        cacheKey,
        cancellation: signal,
        stale: controller.getSnapshot().stale,
        ...(input.reason === undefined ? {} : { reason: input.reason }),
      }) satisfies QueryLoadContext;
      const data = await raceWithCancellation(invokeLoader(options.load, context), signal);
      if (!isActive(token)) {
        throw new CancelledError({ reason: signal.reason ?? "query load superseded" });
      }
      return controller.setReady(data);
    } catch (error) {
      const normalized = normalizeQueryError(error) as E;
      if (!isActive(token)) {
        throw normalized;
      }
      const current = controller.getSnapshot();
      return controller.setError(normalized, {
        stale: current.data !== undefined || current.stale,
        refreshing: false,
        retainData: current.data !== undefined,
      });
    }
  }

  function reset(input: QueryResetOptions = {}): ResourceSnapshot<T, E> {
    assertNotDisposed();
    const shouldReload = controller.getSnapshot().phase !== "idle";
    cancelActive("query reset");
    if (input.source !== undefined) {
      source = normalizeCacheSourceIdentity(input.source);
    }
    if (input.caller !== undefined) {
      callerUnsubscribe();
      caller = input.caller;
      callerUnsubscribe = subscribeToCaller(caller);
    }
    controller.setIdle();
    if (shouldReload) {
      void refresh({ force: true, ...(input.reason === undefined ? {} : { reason: input.reason }) }).catch(() => undefined);
    }
    return controller.getSnapshot();
  }

  function dispose(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    callerUnsubscribe();
    cancelActive("query disposed");
    controller.dispose();
  }

  function cancelActive(reason: string): void {
    const pending = active;
    if (pending === undefined) {
      return;
    }
    active = undefined;
    pending.cleanup();
    pending.cancellation.cancel(reason);
  }

  function subscribeToCaller(provider: CallerProvider): () => void {
    if (provider.subscribe === undefined) {
      return noop;
    }
    return provider.subscribe(() => {
      if (disposed) {
        return;
      }
      const snapshot = reset({ reason: "caller changed" });
      if (snapshot.phase === "loading") {
        active?.promise.catch(() => undefined);
      }
    });
  }

  function isActive(token: object): boolean {
    return !disposed && active?.token === token;
  }

  function assertNotDisposed(): void {
    if (!disposed && controller.getSnapshot().phase !== "disposed") {
      return;
    }
    throw new LifecycleError({
      code: "state_query_disposed",
      message: "State query resource has been disposed.",
    });
  }

  return query;
}

function normalizeQueryKey(key: QueryKey): readonly WireValue[] {
  if (!Array.isArray(key)) {
    throw new TypeError("Query key must be a canonical tuple array.");
  }
  return Object.freeze(copyWireValue(key) as readonly WireValue[]);
}

function createQueryCacheKey(source: CacheSourceIdentity, callerFingerprint: string, key: readonly WireValue[]): string {
  return createCallerPartitionedCacheKey({
    namespace: "state.query",
    source,
    callerFingerprint,
    operation: key,
  });
}

function attachExternalCancellation(
  cancellation: ReturnType<typeof createCancellationController>,
  external: CancellationSignal | undefined,
): () => void {
  if (external === undefined) {
    return noop;
  }
  if (external.cancelled) {
    cancellation.cancel(external.reason);
    return noop;
  }
  return external.onCancel(() => {
    cancellation.cancel(external.reason);
  });
}

function invokeLoader<T>(loader: QueryLoader<T>, context: QueryLoadContext): Promise<T> {
  try {
    return Promise.resolve(loader(context));
  } catch (error) {
    return Promise.reject(error);
  }
}

function raceWithCancellation<T>(work: Promise<T>, signal: CancellationSignal): Promise<T> {
  if (signal.cancelled) {
    return Promise.reject(new CancelledError(signal.reason === undefined ? {} : { reason: signal.reason }));
  }
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const unsubscribe = signal.onCancel(() => {
      finish(() => {
        reject(new CancelledError(signal.reason === undefined ? {} : { reason: signal.reason }));
      });
    });
    const finish = (callback: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      unsubscribe();
      callback();
    };
    work.then(
      (value) => {
        finish(() => resolve(value));
      },
      (error: unknown) => {
        finish(() => reject(error));
      },
    );
  });
}

function throwIfQueryCancelled(signal: CancellationSignal): void {
  if (signal.cancelled) {
    throw new CancelledError(signal.reason === undefined ? {} : { reason: signal.reason });
  }
}

function normalizeQueryError(error: unknown): HolmError {
  if (error instanceof HolmError) {
    return error;
  }
  return new HolmError({
    kind: "protocol",
    code: "state_query_loader_error",
    message: "State query loader failed.",
  });
}

function noop(): void {
  // Intentionally empty.
}
