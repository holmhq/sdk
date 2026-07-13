import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createCoreEnvironment } from "../../dist/index.js";

test("generated ESM artifact exposes the S01 core fixture", () => {
  assert.equal(createCoreEnvironment(), "core");
});
