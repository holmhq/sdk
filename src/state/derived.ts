import { HolmError, LifecycleError, type HolmDiagnosticsSink } from "../core/index.js";
import type { Clock } from "../core/runtime.js";
import {
  createResourceController,
  type Resource,
  type ResourceSnapshot,
  type ResourceSnapshotListener,
  type ResourceUnsubscribe,
  type ResourceValueCopier,
} from "./resource.js";

type AnyResource = Resource<unknown, HolmError>;

type DependencySnapshots<TDependencies extends readonly Resource<unknown, HolmError>[]> = {
  readonly [Index in keyof TDependencies]: TDependencies[Index] extends Resource<infer TData, infer TError>
    ? ResourceSnapshot<TData, TError>
    : never;
};

export type DerivedResourceCompute<TData, TDependencies extends readonly Resource<unknown, HolmError>[]> = (
  snapshots: DependencySnapshots<TDependencies>,
) => TData;

export interface DerivedResourceOptions<TData, TDependencies extends readonly Resource<unknown, HolmError>[]> {
  readonly dependencies: TDependencies;
  readonly derive: DerivedResourceCompute<TData, TDependencies>;
  readonly clock?: Clock;
  readonly diagnostics?: HolmDiagnosticsSink;
  readonly id?: string;
  readonly copy?: ResourceValueCopier<TData>;
}

export interface DerivedResource<TData, E extends HolmError = HolmError> extends Resource<TData, E> {
  refresh(): ResourceSnapshot<TData, E>;
  dispose(): void;
}

export function createDerivedResource<
  TData,
  const TDependencies extends readonly Resource<unknown, HolmError>[],
  E extends HolmError = HolmError,
>(options: DerivedResourceOptions<TData, TDependencies>): DerivedResource<TData, E> {
  const resourceId = normalizeResourceId(options.id);
  const dependencies = normalizeDependencies(options.dependencies);
  const controller = createResourceController<TData, E>({
    ...(options.clock === undefined ? {} : { clock: options.clock }),
    ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
    id: resourceId,
    ...(options.copy === undefined ? {} : { copy: options.copy }),
  });
  let disposed = false;
  let unsubscribes: readonly ResourceUnsubscribe[] = dependencies.map((dependency) =>
    dependency.subscribe(() => {
      if (!disposed) {
        evaluate();
      }
    }),
  );

  const derived: DerivedResource<TData, E> = Object.freeze({
    getSnapshot(): ResourceSnapshot<TData, E> {
      return controller.resource.getSnapshot();
    },
    subscribe(listener: ResourceSnapshotListener): ResourceUnsubscribe {
      return controller.resource.subscribe(listener);
    },
    refresh(): ResourceSnapshot<TData, E> {
      assertNotDisposed();
      return evaluate();
    },
    dispose(): void {
      dispose();
    },
  });

  evaluate();

  return derived;

  function evaluate(): ResourceSnapshot<TData, E> {
    assertNotDisposed();
    const snapshots = dependencies.map((dependency) => dependency.getSnapshot()) as DependencySnapshots<TDependencies>;
    if (snapshots.some((snapshot) => snapshot.phase === "disposed")) {
      return dispose();
    }

    const errorSnapshot = snapshots.find((snapshot) => snapshot.phase === "error" && snapshot.error !== undefined);
    if (errorSnapshot?.error !== undefined) {
      const current = controller.getSnapshot();
      return controller.setError(errorSnapshot.error as E, {
        stale: snapshots.some((snapshot) => snapshot.stale) || current.data !== undefined,
        refreshing: false,
        retainData: current.data !== undefined,
      });
    }

    const hasEveryDependencyData = snapshots.every((snapshot) => snapshot.data !== undefined);
    if (!hasEveryDependencyData) {
      if (snapshots.some((snapshot) => snapshot.phase === "loading" || snapshot.refreshing)) {
        const current = controller.getSnapshot();
        return controller.setLoading({
          stale: snapshots.some((snapshot) => snapshot.stale) || current.data !== undefined,
          refreshing: snapshots.some((snapshot) => snapshot.refreshing),
          retainData: current.data !== undefined,
        });
      }
      return controller.setIdle();
    }

    try {
      const data = options.derive(snapshots);
      return controller.setReady(data, {
        stale: snapshots.some((snapshot) => snapshot.stale),
        refreshing: snapshots.some((snapshot) => snapshot.refreshing),
      });
    } catch (error) {
      const normalized = normalizeDerivedError(error, resourceId) as E;
      const current = controller.getSnapshot();
      return controller.setError(normalized, {
        stale: snapshots.some((snapshot) => snapshot.stale) || current.data !== undefined,
        refreshing: false,
        retainData: current.data !== undefined,
      });
    }
  }

  function dispose(): ResourceSnapshot<TData, E> {
    if (disposed) {
      return controller.getSnapshot();
    }
    disposed = true;
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
    unsubscribes = [];
    return controller.dispose();
  }

  function assertNotDisposed(): void {
    if (!disposed && controller.getSnapshot().phase !== "disposed") {
      return;
    }
    throw new LifecycleError({
      code: "state_derived_disposed",
      message: "State derived resource has been disposed.",
    });
  }
}

function normalizeDependencies<const TDependencies extends readonly AnyResource[]>(dependencies: TDependencies): TDependencies {
  if (!Array.isArray(dependencies) || dependencies.length === 0) {
    throw new TypeError("Derived resource dependencies must be a non-empty resource array.");
  }
  for (const dependency of dependencies) {
    if (typeof dependency?.getSnapshot !== "function" || typeof dependency.subscribe !== "function") {
      throw new TypeError("Derived resource dependencies must be state resources.");
    }
  }
  return Object.freeze([...dependencies]) as unknown as TDependencies;
}

function normalizeDerivedError(error: unknown, resourceId: string): HolmError {
  if (error instanceof HolmError) {
    return error;
  }
  return new HolmError({
    kind: "protocol",
    code: "state_derived_compute_error",
    message: "State derived resource computation failed.",
    details: { resourceId },
  });
}

function normalizeResourceId(value: string | undefined): string {
  if (value === undefined) {
    return "derived";
  }
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError("State derived id must be a non-empty string when provided.");
  }
  return normalized;
}
