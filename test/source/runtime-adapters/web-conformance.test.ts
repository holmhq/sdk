import { webRuntime } from "../../../src/web/index.js";
import { runHttpAppRuntimeAdapterConformance } from "./conformance.js";

runHttpAppRuntimeAdapterConformance({
  name: "webRuntime",
  createAdapter: (options) => webRuntime(options),
});
