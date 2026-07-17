import { strict as assert } from "node:assert";
import { test } from "node:test";

import { bridgeRuntimeSupport } from "../../../src/bridge/index.js";
import { nodeRuntimeSupport } from "../../../src/node/index.js";
import { sobekRuntimeSupport } from "../../../src/sobek/index.js";

test("preview and reserved runtime support labels are machine-checkable", () => {
  assert.deepEqual(nodeRuntimeSupport, {
    packageName: "@holmhq/sdk/node",
    status: "preview",
    compatibility: "not frozen",
    production: "not production",
  });
  assert.deepEqual(sobekRuntimeSupport, {
    packageName: "@holmhq/sdk/sobek",
    status: "preview",
    compatibility: "not frozen",
    production: "not production",
  });
  assert.deepEqual(bridgeRuntimeSupport, {
    packageName: "@holmhq/sdk/bridge",
    status: "reserved",
    production: "not production",
    desktop: "unsupported",
    mobile: "unsupported",
    scope: "mocks, mailbox contracts, and service slots only",
  });
});
