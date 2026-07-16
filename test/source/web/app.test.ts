import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createDiagnosticsSink } from "../../../src/core/index.js";
import { createWebApp, createWebCaller } from "../../../src/web/index.js";

test("createWebApp composes isolated runtime, caller, surfaces, and app namespace", async () => {
  const calls: string[] = [];
  const app = createWebApp({
    runtime: {
      baseUrl: "https://app.example.test/",
      cache: false,
      fetch: async (input) => {
        calls.push(String(input));
        return new Response('{"data":{"ok":true}}', {
          headers: { "content-type": "application/json" },
        });
      },
    },
    caller: {
      appId: "app_sales",
      origin: "https://app.example.test",
    },
    navigation: false,
    uploads: false,
    surfaceBootstrap: {
      runtimeGlobal: {
        __HOLM_SURFACES__: {
          analytics: "/system/analytics",
          login: "/auth/login",
        },
      },
    },
  });

  assert.deepEqual(await app.app.http.get("/api/health"), { ok: true });
  assert.equal(app.app.surface.analyticsUrl(), "/system/analytics");
  assert.equal(app.app.auth.login({ redirect: "/dashboard" }), "/auth/login?redirect=%2Fdashboard");
  assert.deepEqual(calls, ["https://app.example.test/api/health"]);
  assert.equal(app.lifecycle.state, "ready");
  await app.dispose();
});

test("createWebApp accepts explicit services without sharing composition state", async () => {
  const navigation: string[] = [];
  const uploadPaths: string[] = [];
  const diagnostics = createDiagnosticsSink();
  const app = createWebApp({
    runtime: {
      fetch: async () => new Response('{"data":{"ok":true}}', {
        headers: { "content-type": "application/json" },
      }),
      diagnostics,
    },
    caller: createWebCaller({ principal: { kind: "anonymous" } }),
    navigation: { assign: (href) => navigation.push(href) },
    uploads: {
      upload(request) {
        uploadPaths.push(request.path);
        return { uploaded: true };
      },
    },
    surfaces: { account: "/account" },
    requestId: (sequence) => `web-app-${sequence}`,
    diagnostics,
  });

  const raw = await app.app.http.requestRaw({ method: "GET", url: "/api/check" });
  assert.equal(raw.requestId, "web-app-1");
  assert.equal(app.app.auth.login(), "/auth/login");
  assert.equal(app.app.surface.accountUrl(), "/account");
  assert.deepEqual(await app.app.upload({ path: "/api/upload", files: [] }), { uploaded: true });
  assert.deepEqual(navigation, ["/auth/login"]);
  assert.deepEqual(uploadPaths, ["/api/upload"]);
  await app.dispose();
});

test("createWebApp resolves optional ambient services without requiring them", async () => {
  const fetchFixture: typeof fetch = async () => new Response('{"data":{"ok":true}}', {
    headers: { "content-type": "application/json" },
  });
  const headless = createWebApp({ runtime: { fetch: fetchFixture } });
  assert.deepEqual(await headless.app.auth.me(), { ok: true });
  await headless.dispose();

  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "location");
  const assigned: string[] = [];
  try {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { href: "/", assign: (href: string) => assigned.push(href) },
    });
    const ambient = createWebApp({ runtime: { fetch: fetchFixture }, uploads: false });
    assert.equal(ambient.app.auth.login(), "/auth/login");
    assert.deepEqual(assigned, ["/auth/login"]);
    await ambient.dispose();
  } finally {
    if (descriptor === undefined) {
      Reflect.deleteProperty(globalThis, "location");
    } else {
      Object.defineProperty(globalThis, "location", descriptor);
    }
  }
});

test("createWebApp keeps two default compositions isolated", async () => {
  const headers: string[] = [];
  const fetchFixture: typeof fetch = async (_input, init = {}) => {
    headers.push(new Headers(init.headers).get("authorization") ?? "session");
    return new Response('{"data":{"ok":true}}', {
      headers: { "content-type": "application/json" },
    });
  };
  const first = createWebApp({
    runtime: { fetch: fetchFixture, auth: { current: () => ({ kind: "bearer", scheme: "Bearer", token: "first" }) } },
    navigation: false,
    uploads: false,
  });
  const second = createWebApp({
    runtime: { fetch: fetchFixture, auth: { current: () => ({ kind: "bearer", scheme: "Bearer", token: "second" }) } },
    navigation: false,
    uploads: false,
  });

  await Promise.all([first.app.auth.me(), second.app.auth.me()]);
  assert.deepEqual(headers.sort(), ["Bearer first", "Bearer second"]);
  await Promise.all([first.dispose(), second.dispose()]);
});
