import {
  createResourceController,
  type Resource,
  type ResourcePhase,
  type ResourceSnapshot,
} from "../../src/state/index.js";

interface ReportData {
  readonly title: string;
  readonly tags: readonly string[];
}

const controller = createResourceController<ReportData>();
const resource: Resource<ReportData> = controller.resource;
const snapshot: ResourceSnapshot<ReportData> = resource.getSnapshot();
const phase: ResourcePhase = snapshot.phase;
const unsubscribe = resource.subscribe(() => undefined);
const ready = controller.setReady({ title: "ready", tags: ["state"] });

if (ready.data !== undefined) {
  const title: string = ready.data.title;
  const tags: readonly string[] = ready.data.tags;

  // @ts-expect-error Resource snapshot data is deeply readonly.
  ready.data.title = "mutated";

  // @ts-expect-error Resource snapshot arrays are readonly.
  ready.data.tags.push("mutated");

  void title;
  void tags;
}

// @ts-expect-error Resource listeners must be functions.
resource.subscribe("not a listener");

// @ts-expect-error Resource values preserve their declared payload shape.
controller.setReady({ title: "wrong", tags: [1] });

unsubscribe();
void phase;
void snapshot;
