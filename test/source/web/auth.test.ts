import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createAppExtension } from "../../../src/app/index.js";
import { createCallerFingerprint, createHolm } from "../../../src/core/index.js";
import {
  createWebCaller,
  createWebTokenAuth,
  webRuntime,
} from "../../../src/web/index.js";

test("web explicit-token auth and caller context remain isolated across app clients", async () => {
  const authorization: string[] = [];
  const fixtureFetch: typeof fetch = async (_input, init = {}) => {
    authorization.push(new Headers(init.headers).get("authorization") ?? "");
    return new Response('{"data":{"ok":true}}', {
      headers: { "content-type": "application/json" },
    });
  };
  const alphaCaller = createWebCaller({
    principal: { kind: "member", id: "member_alpha" },
    appId: "app_sales",
    origin: "https://app.example.test",
  });
  const betaCaller = createWebCaller({
    principal: { kind: "member", id: "member_beta" },
    appId: "app_sales",
    origin: "https://app.example.test",
  });
  const alpha = createHolm({
    runtime: webRuntime({ fetch: fixtureFetch, auth: createWebTokenAuth({ token: "alpha-secret" }) }),
    caller: alphaCaller,
    extensions: [createAppExtension()] as const,
  });
  const beta = createHolm({
    runtime: webRuntime({ fetch: fixtureFetch, auth: createWebTokenAuth({ token: "beta-secret" }) }),
    caller: betaCaller,
    extensions: [createAppExtension()] as const,
  });

  await Promise.all([alpha.app.auth.me(), beta.app.auth.me()]);

  assert.deepEqual(authorization.sort(), ["Bearer alpha-secret", "Bearer beta-secret"]);
  assert.notEqual(createCallerFingerprint(await alphaCaller.current()), createCallerFingerprint(await betaCaller.current()));
  assert.equal(JSON.stringify(await alphaCaller.current()).includes("alpha-secret"), false);
  assert.equal(JSON.stringify(await betaCaller.current()).includes("beta-secret"), false);
  await Promise.all([alpha.dispose(), beta.dispose()]);
});

test("web dynamic token epochs cannot reuse prior-credential cache entries", async () => {
  let token = "first-secret";
  let fetchCalls = 0;
  const auth = createWebTokenAuth({ token: () => token });
  const app = createHolm({
    runtime: webRuntime({
      auth,
      fetch: async (_input, init = {}) => {
        fetchCalls += 1;
        return new Response(JSON.stringify({
          data: { authorization: new Headers(init.headers).get("authorization") },
        }), { headers: { "content-type": "application/json" } });
      },
    }),
    caller: createWebCaller(),
    extensions: [createAppExtension()] as const,
  });

  assert.deepEqual(await app.app.auth.me(), { authorization: "Bearer first-secret" });
  token = "second-secret";
  assert.deepEqual(await app.app.auth.me(), { authorization: "Bearer second-secret" });
  assert.equal(fetchCalls, 2);
  await app.dispose();

  let customCalls = 0;
  const custom = createHolm({
    runtime: webRuntime({
      auth: { current: () => ({ kind: "bearer", scheme: "Bearer", token: "custom-secret" }) },
      fetch: async () => {
        customCalls += 1;
        return new Response('{"data":{"ok":true}}', { headers: { "content-type": "application/json" } });
      },
    }),
    caller: createWebCaller(),
    extensions: [createAppExtension()] as const,
  });
  await custom.app.auth.me();
  await custom.app.auth.me();
  assert.equal(customCalls, 2);
  await custom.dispose();
});

test("web token and caller providers resolve fresh values per invocation", async () => {
  let token = "first-secret";
  let memberId = "member_first";
  const auth = createWebTokenAuth({ token: () => token, scheme: "Token" });
  const caller = createWebCaller({ principal: () => ({ kind: "member", id: memberId }) });

  assert.deepEqual(await auth.current(), {
    kind: "bearer",
    scheme: "Token",
    token: "first-secret",
    cachePartition: "web-token:0",
  });
  assert.deepEqual(await caller.current(), { surface: "web", principal: { kind: "member", id: "member_first" } });
  token = "second-secret";
  memberId = "member_second";
  assert.deepEqual(await auth.current(), {
    kind: "bearer",
    scheme: "Token",
    token: "second-secret",
    cachePartition: "web-token:1",
  });
  assert.deepEqual(await caller.current(), { surface: "web", principal: { kind: "member", id: "member_second" } });

  assert.throws(() => createWebTokenAuth({ token: " " }), /token/);
  assert.throws(() => createWebTokenAuth({ token: "secret", scheme: " " }), /scheme/);
  assert.throws(() => createWebCaller({ appId: " " }), /app id/);

  const transitions: Array<() => void> = [];
  let appId: string | undefined = "app_dynamic";
  const dynamic = createWebCaller({
    appId: () => appId,
    origin: () => "https://dynamic.example.test",
    scope: () => ({ id: "scope_1", type: "team" }),
    subscribe(listener) {
      transitions.push(listener);
      return () => transitions.splice(transitions.indexOf(listener), 1);
    },
  });
  assert.deepEqual(await dynamic.current(), {
    surface: "web",
    principal: { kind: "browser-session" },
    app: { id: "app_dynamic" },
    scope: { id: "scope_1", type: "team" },
    origin: "https://dynamic.example.test",
  });
  let transitionCount = 0;
  const unsubscribe = dynamic.subscribe?.(() => {
    transitionCount += 1;
  });
  transitions[0]?.();
  unsubscribe?.();
  assert.equal(transitionCount, 1);
  assert.equal(transitions.length, 0);
  appId = undefined;
  assert.equal((await dynamic.current()).app, undefined);
  appId = " ";
  await assert.rejects(async () => dynamic.current(), /app id/);

  assert.throws(() => createWebCaller({ origin: " " }), /origin/);
  const undefinedSubscribe = createWebCaller({
    subscribe: (() => undefined) as unknown as (listener: () => void) => () => void,
  });
  const noop = undefinedSubscribe.subscribe?.(() => undefined);
  assert.equal(typeof noop, "function");
  noop?.();

  const badOrigin = createWebCaller({ origin: () => " " });
  await assert.rejects(async () => badOrigin.current(), /origin/);
});
