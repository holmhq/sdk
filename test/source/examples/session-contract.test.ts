import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createStaticCallerProvider, type WireValue } from "../../../src/index.js";
import { createSessionModel, type SessionApp } from "../../../examples/shared/session-contract.js";

test("the shared session contract drives query and sign-out resources independently of the UI framework", async () => {
  let signedIn = true;
  let invalidations = 0;
  let reads = 0;
  const app: SessionApp = {
    app: {
      auth: {
        async me<Result = WireValue>(): Promise<Result> {
          reads += 1;
          return {
            member: signedIn ? { id: "member_1", name: "Ada" } : null,
          } as Result;
        },
        async logout<Result = WireValue>(): Promise<Result> {
          signedIn = false;
          return { signedOut: true } as Result;
        },
      },
      http: {
        async invalidateCache(): Promise<void> {
          invalidations += 1;
        },
      },
    },
  };
  const caller = createStaticCallerProvider({
    surface: "web",
    principal: { kind: "browser-session" },
  });
  const model = createSessionModel({ app, caller });

  const ready = await model.session.refresh({ reason: "example-test" });
  assert.equal(ready.phase, "ready");
  assert.deepEqual(ready.data, { member: { id: "member_1", name: "Ada" } });

  const signedOut = await model.signOut.execute({});
  assert.equal(signedOut.phase, "ready");
  assert.deepEqual(signedOut.data, { signedOut: true });
  assert.equal(invalidations, 1);

  await model.session.currentLoad();
  assert.deepEqual(model.session.getSnapshot().data, { member: null });
  assert.equal(reads, 2);

  model.dispose();
  assert.equal(model.session.getSnapshot().phase, "disposed");
  assert.equal(model.signOut.getSnapshot().phase, "disposed");
});

test("the shared session contract invalidates and reloads auth state even when Holm follows logout with an error", async () => {
  let invalidations = 0;
  let signedIn = true;
  const app: SessionApp = {
    app: {
      auth: {
        async me<Result = WireValue>(): Promise<Result> {
          return { member: signedIn ? { id: "member_1" } : null } as Result;
        },
        async logout<Result = WireValue>(): Promise<Result> {
          signedIn = false;
          throw new Error("redirect follow failed after cookie clear");
        },
      },
      http: {
        async invalidateCache(): Promise<void> {
          invalidations += 1;
        },
      },
    },
  };
  const model = createSessionModel({
    app,
    caller: createStaticCallerProvider({
      surface: "web",
      principal: { kind: "browser-session" },
    }),
  });

  await model.session.refresh();
  const result = await model.signOut.execute({});
  assert.equal(result.phase, "error");
  assert.equal(invalidations, 1);

  await model.session.currentLoad();
  assert.deepEqual(model.session.getSnapshot().data, { member: null });

  model.dispose();
});
