import {
  CancelledError,
  createCallerFingerprint,
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
} from "../core/index.js";
import type { ReadonlyDeep } from "../core/extensions.js";
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

export interface MutationInvalidation {
  readonly tags?: readonly string[];
  readonly prefixes?: readonly string[];
}

export interface MutationExecuteOptions {
  readonly cancellation?: CancellationSignal;
  readonly reason?: string;
}

export interface MutationExecuteContext<TPayload> {
  readonly payload: ReadonlyDeep<TPayload>;
  readonly source: CacheSourceIdentity;
  readonly caller: CallerContext;
  readonly callerFingerprint: string;
  readonly cancellation: CancellationSignal;
  readonly reason?: string;
}

export type MutationExecutor<TPayload, TResult> = (
  payload: ReadonlyDeep<TPayload>,
  context: MutationExecuteContext<TPayload>,
) => TResult | Promise<TResult>;

export type MutationOptimisticUpdate<TPayload, TResult> = (
  payload: ReadonlyDeep<TPayload>,
  context: MutationExecuteContext<TPayload>,
) => TResult | undefined;

export type MutationInvalidationDeclaration<TPayload, TResult> =
  | readonly MutationInvalidation[]
  | ((
    result: ReadonlyDeep<TResult>,
    payload: ReadonlyDeep<TPayload>,
    context: MutationExecuteContext<TPayload>,
  ) => readonly MutationInvalidation[]);

export interface MutationInvalidationEvent<TPayload, TResult> {
  readonly source: CacheSourceIdentity;
  readonly caller: CallerContext;
  readonly callerFingerprint: string;
  readonly payload: ReadonlyDeep<TPayload>;
  readonly result: ReadonlyDeep<TResult>;
  readonly invalidations: readonly MutationInvalidation[];
  readonly reason?: string;
}

export type MutationInvalidationHook<TPayload, TResult> = (
  event: MutationInvalidationEvent<TPayload, TResult>,
) => void | PromiseLike<void>;

export type MutationErrorNormalizer<TPayload, E extends HolmError> = (
  error: unknown,
  context: MutationExecuteContext<TPayload>,
) => E;

export interface MutationResourceOptions<TPayload, TResult, E extends HolmError = HolmError> {
  readonly source: CacheSourceIdentity;
  readonly caller: CallerProvider;
  readonly execute: MutationExecutor<TPayload, TResult>;
  readonly optimistic?: MutationOptimisticUpdate<TPayload, TResult>;
  readonly invalidates?: MutationInvalidationDeclaration<TPayload, TResult>;
  readonly onInvalidate?: MutationInvalidationHook<TPayload, TResult>;
  readonly normalizeError?: MutationErrorNormalizer<TPayload, E>;
  readonly clock?: Clock;
  readonly diagnostics?: HolmDiagnosticsSink;
  readonly id?: string;
  readonly copy?: ResourceValueCopier<TResult>;
}

export interface MutationResource<TPayload, TResult, E extends HolmError = HolmError> extends Resource<TResult, E> {
  execute(payload: TPayload, options?: MutationExecuteOptions): Promise<ResourceSnapshot<TResult, E>>;
  currentExecution(): Promise<ResourceSnapshot<TResult, E>>;
  reset(): ResourceSnapshot<TResult, E>;
  dispose(): void;
}

interface ActiveMutation<TResult, E extends HolmError> {
  readonly token: object;
  readonly promise: Promise<ResourceSnapshot<TResult, E>>;
  readonly cancellation: ReturnType<typeof createCancellationController>;
  cleanup(): void;
}

export function createMutationResource<TPayload, TResult, E extends HolmError = HolmError>(
  options: MutationResourceOptions<TPayload, TResult, E>,
): MutationResource<TPayload, TResult, E> {
  const resourceId = normalizeResourceId(options.id);
  const controller = createResourceController<TResult, E>({
    ...(options.clock === undefined ? {} : { clock: options.clock }),
    ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
    id: resourceId,
    ...(options.copy === undefined ? {} : { copy: options.copy }),
  });
  const source = normalizeCacheSourceIdentity(options.source);
  let active: ActiveMutation<TResult, E> | undefined;
  let disposed = false;

  const mutation: MutationResource<TPayload, TResult, E> = Object.freeze({
    getSnapshot(): ResourceSnapshot<TResult, E> {
      return controller.resource.getSnapshot();
    },
    subscribe(listener: ResourceSnapshotListener): ResourceUnsubscribe {
      return controller.resource.subscribe(listener);
    },
    execute(payload: TPayload, input: MutationExecuteOptions = {}): Promise<ResourceSnapshot<TResult, E>> {
      return execute(payload, input);
    },
    currentExecution(): Promise<ResourceSnapshot<TResult, E>> {
      return active?.promise ?? Promise.resolve(controller.getSnapshot());
    },
    reset(): ResourceSnapshot<TResult, E> {
      return reset();
    },
    dispose(): void {
      dispose();
    },
  });

  function execute(payload: TPayload, input: MutationExecuteOptions): Promise<ResourceSnapshot<TResult, E>> {
    assertNotDisposed();
    if (active !== undefined) {
      throw new LifecycleError({
        code: "state_mutation_busy",
        message: "State mutation resource already has an active execution.",
      });
    }

    const copiedPayload = copyMutationPayload(payload);
    const before = controller.getSnapshot();
    controller.setLoading({
      stale: before.data !== undefined || before.stale,
      refreshing: false,
      retainData: before.data !== undefined,
    });

    const cancellation = createCancellationController();
    const cleanupExternal = attachExternalCancellation(cancellation, input.cancellation);
    const token = Object.freeze({});
    const promise = Promise.resolve()
      .then(() => runMutation(token, before, copiedPayload, cancellation.signal, input))
      .finally(() => {
        if (active?.token === token) {
          active = undefined;
        }
        cleanupExternal();
      });
    active = Object.freeze({ token, promise, cancellation, cleanup: cleanupExternal });
    return promise;
  }

  async function runMutation(
    token: object,
    before: ResourceSnapshot<TResult, E>,
    payload: ReadonlyDeep<TPayload>,
    signal: CancellationSignal,
    input: MutationExecuteOptions,
  ): Promise<ResourceSnapshot<TResult, E>> {
    let context: MutationExecuteContext<TPayload> | undefined;
    let optimisticApplied = false;
    try {
      throwIfMutationCancelled(signal);
      const caller = await resolveCallerContext(options.caller);
      throwIfMutationCancelled(signal);
      const callerFingerprint = createCallerFingerprint(caller);
      context = Object.freeze({
        payload,
        source,
        caller,
        callerFingerprint,
        cancellation: signal,
        ...(input.reason === undefined ? {} : { reason: input.reason }),
      }) satisfies MutationExecuteContext<TPayload>;

      if (options.optimistic !== undefined) {
        const optimistic = options.optimistic(payload, context);
        if (optimistic !== undefined) {
          optimisticApplied = true;
          controller.setReady(optimistic, { stale: true, refreshing: true });
        }
      }

      const result = await raceWithCancellation(invokeExecutor(options.execute, payload, context), signal);
      if (!isActive(token)) {
        throw new CancelledError({ reason: signal.reason ?? "mutation execution superseded" });
      }
      const ready = controller.setReady(result);
      await emitInvalidation(ready, payload, context);
      if (!isActive(token)) {
        throw new CancelledError({ reason: signal.reason ?? "mutation execution superseded" });
      }
      return ready;
    } catch (error) {
      const normalized = normalizeMutationError(error, context, payload) as E;
      if (!isActive(token)) {
        throw normalized;
      }
      if (optimisticApplied) {
        return rollbackToError(before, normalized);
      }
      const current = controller.getSnapshot();
      return controller.setError(normalized, {
        stale: current.data !== undefined || before.stale,
        refreshing: false,
        retainData: current.data !== undefined,
      });
    }
  }

  function rollbackToError(before: ResourceSnapshot<TResult, E>, error: E): ResourceSnapshot<TResult, E> {
    if (before.data !== undefined) {
      controller.setReady(before.data as TResult, { stale: before.stale, refreshing: before.refreshing });
      return controller.setError(error, { stale: true, refreshing: false, retainData: true });
    }
    if (before.phase === "idle") {
      controller.setIdle();
    }
    return controller.setError(error, { stale: before.stale, refreshing: false, retainData: false });
  }

  async function emitInvalidation(
    ready: ResourceSnapshot<TResult, E>,
    payload: ReadonlyDeep<TPayload>,
    context: MutationExecuteContext<TPayload>,
  ): Promise<void> {
    if (options.onInvalidate === undefined || ready.data === undefined) {
      return;
    }
    const invalidations = resolveInvalidations(options.invalidates, ready.data, payload, context);
    if (invalidations.length === 0) {
      return;
    }
    const event = Object.freeze({
      source,
      caller: context.caller,
      callerFingerprint: context.callerFingerprint,
      payload,
      result: ready.data,
      invalidations,
      ...(context.reason === undefined ? {} : { reason: context.reason }),
    }) satisfies MutationInvalidationEvent<TPayload, TResult>;
    try {
      await options.onInvalidate(event);
    } catch (error) {
      reportInvalidationHookError(error, invalidations, context);
    }
  }

  function reset(): ResourceSnapshot<TResult, E> {
    assertNotDisposed();
    cancelActive("mutation reset");
    return controller.setIdle();
  }

  function dispose(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    cancelActive("mutation disposed");
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

  function normalizeMutationError(
    error: unknown,
    context: MutationExecuteContext<TPayload> | undefined,
    payload: ReadonlyDeep<TPayload>,
  ): HolmError {
    if (context !== undefined && options.normalizeError !== undefined) {
      return options.normalizeError(error, context);
    }
    if (error instanceof HolmError) {
      return error;
    }
    return new HolmError({
      kind: "protocol",
      code: "state_mutation_execute_error",
      message: "State mutation executor failed.",
      details: { resourceId, payload },
    });
  }

  function reportInvalidationHookError(
    error: unknown,
    invalidations: readonly MutationInvalidation[],
    context: MutationExecuteContext<TPayload>,
  ): void {
    options.diagnostics?.emit({
      channel: "state.mutation",
      code: "state_mutation_invalidate_hook_error",
      severity: "error",
      message: "State mutation invalidation hook failed.",
      details: {
        resourceId,
        callerFingerprint: context.callerFingerprint,
        invalidations,
      },
      error,
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
      code: "state_mutation_disposed",
      message: "State mutation resource has been disposed.",
    });
  }

  return mutation;
}

function copyMutationPayload<TPayload>(payload: TPayload): ReadonlyDeep<TPayload> {
  return copyWireValue(payload) as ReadonlyDeep<TPayload>;
}

function resolveInvalidations<TPayload, TResult>(
  declaration: MutationInvalidationDeclaration<TPayload, TResult> | undefined,
  result: ReadonlyDeep<TResult>,
  payload: ReadonlyDeep<TPayload>,
  context: MutationExecuteContext<TPayload>,
): readonly MutationInvalidation[] {
  const invalidations = typeof declaration === "function"
    ? declaration(result, payload, context)
    : declaration ?? [];
  return Object.freeze(invalidations.map(normalizeInvalidation));
}

function normalizeInvalidation(input: MutationInvalidation): MutationInvalidation {
  const tags = normalizeStrings(input.tags ?? [], "tag");
  const prefixes = normalizeStrings(input.prefixes ?? [], "prefix");
  if (tags.length === 0 && prefixes.length === 0) {
    throw new TypeError("Mutation invalidation requires a tag or prefix.");
  }
  return Object.freeze({
    ...(prefixes.length === 0 ? {} : { prefixes }),
    ...(tags.length === 0 ? {} : { tags }),
  });
}

function normalizeStrings(values: readonly string[], label: string): readonly string[] {
  const normalized = [...new Set(values.map((value) => normalizeNonEmpty(value, label)))].sort();
  return Object.freeze(normalized);
}

function normalizeNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError(`Mutation invalidation ${label} must be a non-empty string.`);
  }
  return normalized;
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

function invokeExecutor<TPayload, TResult>(
  executor: MutationExecutor<TPayload, TResult>,
  payload: ReadonlyDeep<TPayload>,
  context: MutationExecuteContext<TPayload>,
): Promise<TResult> {
  try {
    return Promise.resolve(executor(payload, context));
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

function throwIfMutationCancelled(signal: CancellationSignal): void {
  if (signal.cancelled) {
    throw new CancelledError(signal.reason === undefined ? {} : { reason: signal.reason });
  }
}

function normalizeResourceId(value: string | undefined): string {
  if (value === undefined) {
    return "mutation";
  }
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError("State mutation id must be a non-empty string when provided.");
  }
  return normalized;
}

function noop(): void {
  // Intentionally empty.
}
