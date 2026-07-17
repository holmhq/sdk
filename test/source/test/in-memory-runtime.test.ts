import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createInvocationContext } from "../../../src/core/index.js";
import { createInMemoryRuntimeAdapter } from "../../../src/test/index.js";
import { runRuntimeAdapterConformance } from "../runtime-adapters/conformance.js";

runRuntimeAdapterConformance({
  name: "createInMemoryRuntimeAdapter",
  createAdapter: (options) => createInMemoryRuntimeAdapter(options),
  getRequests: (adapter) => adapter.requests,
  getControls: (adapter) => adapter.controls,
});

test("Review #033 advisory 6: in-memory runtime readonly getters return frozen snapshots, not live arrays", async () => {
  const adapter = createInMemoryRuntimeAdapter({
    offers: [{ id: "com.example.reports", origin: "runtime", version: { major: 1, minor: 0 } }],
  });

  await adapter.invoke(
    {
      requestId: "req-readonly-getters",
      capability: { id: "com.example.reports", major: 1 },
      operation: "list",
      caller: createInvocationContext({ surface: "test", principal: { kind: "anonymous" } }, "req-readonly-getters", 0),
      callerFingerprint: "caller:v1:readonly",
      payload: { ok: true },
    },
    { timeoutMs: 25 },
  );

  const firstRequests = adapter.requests;
  const firstControls = adapter.controls;
  assert.equal(Object.isFrozen(firstRequests), true);
  assert.equal(Object.isFrozen(firstControls), true);
  assert.equal(Object.isFrozen(firstRequests[0]), true);
  assert.equal(Object.isFrozen(firstControls[0]), true);
  assert.throws(() => ((firstRequests as unknown[]).length = 0), TypeError);
  assert.throws(() => ((firstControls as unknown[]).push({})), TypeError);
  assert.equal(adapter.requests.length, 1);
  assert.notEqual(adapter.requests, firstRequests);
  assert.deepEqual(adapter.requests[0], firstRequests[0]);
});
