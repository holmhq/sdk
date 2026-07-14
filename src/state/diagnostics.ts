import { type HolmDiagnosticsSink } from "../core/index.js";
import type { Clock } from "../core/runtime.js";
import type { Resource, ResourcePhase, ResourceSnapshot } from "./resource.js";

export interface ResourceHistoryEntry {
  readonly resourceId: string;
  readonly revision: number;
  readonly phase: ResourcePhase;
  readonly stale: boolean;
  readonly refreshing: boolean;
  readonly hasData: boolean;
  readonly at?: number;
  readonly updatedAt?: number;
  readonly errorCode?: string;
}

export interface ResourceHistoryOptions {
  readonly id?: string;
  readonly capacity?: number;
  readonly includeInitial?: boolean;
  readonly clock?: Clock;
  readonly diagnostics?: HolmDiagnosticsSink;
}

export interface ResourceHistory {
  getEntries(): readonly ResourceHistoryEntry[];
  dispose(): void;
}

export function createResourceHistory(
  resource: Resource<unknown, { readonly code?: string }>,
  options: ResourceHistoryOptions = {},
): ResourceHistory {
  const resourceId = normalizeResourceId(options.id);
  const capacity = normalizeCapacity(options.capacity);
  const entries: ResourceHistoryEntry[] = [];
  let disposed = false;

  const unsubscribe = resource.subscribe(() => {
    if (!disposed) {
      record(resource.getSnapshot());
    }
  });

  if (options.includeInitial === true) {
    record(resource.getSnapshot());
  }

  return Object.freeze({
    getEntries(): readonly ResourceHistoryEntry[] {
      return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
    },
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      unsubscribe();
    },
  });

  function record(snapshot: ResourceSnapshot<unknown, { readonly code?: string }>): void {
    const at = timestamp(options.clock);
    const entry = Object.freeze({
      resourceId,
      revision: snapshot.revision,
      phase: snapshot.phase,
      stale: snapshot.stale,
      refreshing: snapshot.refreshing,
      hasData: snapshot.data !== undefined,
      ...(at === undefined ? {} : { at }),
      ...(snapshot.updatedAt === undefined ? {} : { updatedAt: snapshot.updatedAt }),
      ...(snapshot.error?.code === undefined ? {} : { errorCode: snapshot.error.code }),
    }) satisfies ResourceHistoryEntry;
    entries.push(entry);
    while (entries.length > capacity) {
      entries.shift();
    }
    emitHistoryDiagnostic(options.diagnostics, entry);
  }
}

function emitHistoryDiagnostic(diagnostics: HolmDiagnosticsSink | undefined, entry: ResourceHistoryEntry): void {
  if (diagnostics === undefined) {
    return;
  }
  try {
    diagnostics.emit({
      channel: "state.history",
      code: "state_resource_history_recorded",
      severity: "debug",
      message: "State resource history entry recorded.",
      details: entry,
    });
  } catch {
    // History is observational and must not alter resource delivery.
  }
}

function timestamp(clock: Clock | undefined): number | undefined {
  if (clock === undefined) {
    return undefined;
  }
  const value = clock.now();
  if (!Number.isFinite(value)) {
    throw new TypeError("State resource history clock must return a finite timestamp.");
  }
  return value;
}

function normalizeCapacity(value: number | undefined): number {
  if (value === undefined) {
    return 100;
  }
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError("State resource history capacity must be a positive integer.");
  }
  return value;
}

function normalizeResourceId(value: string | undefined): string {
  if (value === undefined) {
    return "resource";
  }
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError("State resource history id must be a non-empty string when provided.");
  }
  return normalized;
}
