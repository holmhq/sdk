import {
  createDerivedResource,
  createQueryResource,
  createRealtimeReconcileHook,
  createResourceHistory,
  type DerivedResource,
  type Resource,
  type ResourceHistoryEntry,
} from "../../src/state/index.js";
import { createCapabilityRegistry } from "../../src/core/index.js";

interface ReportData {
  readonly version: number;
  readonly labels: readonly string[];
}

const query = createQueryResource<ReportData>({
  key: ["reports"],
  source: { id: "runtime-test", surface: "test" },
  caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
  load: () => ({ version: 1, labels: ["ready"] }),
});

const derived = createDerivedResource({
  dependencies: [query] as const,
  derive(snapshots) {
    const labels: readonly string[] | undefined = snapshots[0].data?.labels;
    return { labelCount: labels?.length ?? 0 };
  },
});

const derivedResource: DerivedResource<{ readonly labelCount: number }> = derived;
const plainResource: Resource<{ readonly labelCount: number }> = derived;
const history = createResourceHistory(derived, { id: "typed-derived" });
const entries: readonly ResourceHistoryEntry[] = history.getEntries();
const hook = createRealtimeReconcileHook({ query, capabilities: createCapabilityRegistry([]) });

hook.supports.privateChannels satisfies false;
hook.supports.presence satisfies false;
hook.supports.collaboration satisfies false;

async function reconcile(): Promise<void> {
  const snapshot = hook.handle({ kind: "reconcile", data: { version: 2, labels: ["event"] } });
  if (snapshot.data !== undefined) {
    const version: number = snapshot.data.version;
    // @ts-expect-error Reconciled data remains deeply readonly.
    snapshot.data.labels.push("mutated");
    void version;
  }

  const refreshed = await hook.handle({ kind: "invalidate", refresh: true });
  void refreshed.phase;
}

// @ts-expect-error Derived resource data preserves declared payload shape.
derived.reconcile({ wrong: true });

// @ts-expect-error Realtime hook does not accept private/presence capability requirements.
createRealtimeReconcileHook({ query, capabilities: createCapabilityRegistry([]), requirement: { id: "holm.realtime.private", major: 1 } });

void derivedResource;
void plainResource;
void entries;
void reconcile;
