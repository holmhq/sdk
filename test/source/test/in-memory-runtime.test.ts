import { createInMemoryRuntimeAdapter } from "../../../src/test/index.js";
import { runRuntimeAdapterConformance } from "../runtime-adapters/conformance.js";

runRuntimeAdapterConformance({
  name: "createInMemoryRuntimeAdapter",
  createAdapter: (options) => createInMemoryRuntimeAdapter(options),
  getRequests: (adapter) => adapter.requests,
  getControls: (adapter) => adapter.controls,
});
