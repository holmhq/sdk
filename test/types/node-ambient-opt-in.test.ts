import { strict as assert } from "node:assert";

import {
  createNodeOperatorCaller,
  createNodeTokenAuth,
  nodeRuntime,
  type NodeRuntimeFetch,
} from "../../src/node/index.js";
import { createFakeClock } from "../../src/test/index.js";

assert.equal(typeof process.versions.node, "string");

const fake = createFakeClock();
const fetch: NodeRuntimeFetch = async (_input, init) => {
  assert.equal(init?.signal?.aborted, false);
  return new Response('{"data":{"ok":true}}', {
    headers: { "content-type": "application/json" },
  });
};
const runtime = nodeRuntime({
  fetch,
  auth: createNodeTokenAuth({ token: "node-type-token", operatorId: "node-type-operator" }),
  clock: fake.clock,
  scheduler: fake.scheduler,
  environment: { get: () => process.env.HOLM_PROFILE },
  secureStore: { get: () => undefined },
});
const caller = createNodeOperatorCaller({ operatorId: "node-type-operator" });

void runtime;
void caller;
