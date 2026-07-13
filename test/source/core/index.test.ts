import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createCoreEnvironment } from "../../../src/core/index.js";

test("core fixture reports the runtime-neutral core", () => {
  assert.equal(createCoreEnvironment(), "core");
});
