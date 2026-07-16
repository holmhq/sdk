import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  HOLM_APP_HTTP_CAPABILITY,
  createAppExtension,
} from "../../../src/app/index.js";
import { createHolm, createReadonlyBytes, createStaticCallerProvider } from "../../../src/core/index.js";
import { createFakeClock, createInMemoryRuntimeAdapter } from "../../../src/test/index.js";
import { createReadonlyBytesUploadSource, createUploadFile } from "../../../src/transports/index.js";
import { webRuntime } from "../../../src/web/index.js";

test("app extension routes custom HTTP and member auth through one web runtime", async () => {
  const calls: Array<{
    readonly url: string;
    readonly method: string;
    readonly body: unknown;
    readonly credentials: RequestInit["credentials"];
  }> = [];
  const runtime = webRuntime({
    baseUrl: "https://app.example.test/",
    fetch: async (input, init = {}) => {
      const body = typeof init.body === "string" && init.body !== "" ? JSON.parse(init.body) : undefined;
      calls.push({
        url: String(input),
        method: init.method ?? "GET",
        body,
        credentials: init.credentials,
      });
      const path = new URL(String(input)).pathname;
      if (path === "/api/me") {
        return jsonResponse({ member: { id: "member_1" } });
      }
      if (path === "/auth/anonymous/start") {
        return jsonResponse({ anonymous: true, app: body?.app });
      }
      return jsonResponse({ widgets: ["one"], body });
    },
  });
  const holm = createHolm({
    runtime,
    caller: createStaticCallerProvider({
      surface: "web",
      principal: { kind: "browser-session" },
      app: { id: "app_sales" },
      origin: "https://app.example.test",
    }),
    extensions: [createAppExtension()] as const,
  });

  const widgets = await holm.app.http.get<{ readonly widgets: readonly string[] }>("/api/widgets", {
    params: { view: "compact" },
  });
  const me = await holm.app.auth.me<{ readonly member: { readonly id: string } }>();
  const anonymous = await holm.app.auth.startAnonymous<{ readonly anonymous: boolean; readonly app: string }>({
    appId: "app_sales",
  });

  assert.deepEqual(widgets, { widgets: ["one"] });
  assert.deepEqual(me, { member: { id: "member_1" } });
  assert.deepEqual(anonymous, { anonymous: true, app: "app_sales" });
  assert.deepEqual(calls, [
    {
      url: "https://app.example.test/api/widgets?view=compact",
      method: "GET",
      body: undefined,
      credentials: "same-origin",
    },
    {
      url: "https://app.example.test/api/me",
      method: "GET",
      body: undefined,
      credentials: "same-origin",
    },
    {
      url: "https://app.example.test/auth/anonymous/start",
      method: "POST",
      body: { app: "app_sales" },
      credentials: "same-origin",
    },
  ]);
  await holm.dispose();
});

test("app auth adopts Holm routes while keeping navigation optional and injected", async () => {
  const requests: Array<{ readonly path: string; readonly method: string; readonly body: unknown }> = [];
  const navigations: string[] = [];
  const holm = createHolm({
    runtime: webRuntime({
      baseUrl: "https://app.example.test/",
      cache: false,
      fetch: async (input, init = {}) => {
        requests.push({
          path: new URL(String(input)).pathname,
          method: init.method ?? "GET",
          body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
        });
        return jsonResponse({ ok: true });
      },
    }),
    caller: createStaticCallerProvider({ surface: "web", principal: { kind: "browser-session" } }),
    extensions: [
      createAppExtension({
        navigation: {
          assign(href) {
            navigations.push(href);
          },
        },
      }),
    ] as const,
  });

  assert.equal(holm.app.auth.loginHref({ redirect: "/dashboard" }), "/auth/login?redirect=%2Fdashboard");
  assert.equal(holm.app.auth.login({ redirect: "/dashboard" }), "/auth/login?redirect=%2Fdashboard");
  assert.equal(
    holm.app.auth.qrScannerHref({ appId: "app sales", redirect: "/card?id=1" }),
    "/auth/qr/scanner?app=app%20sales&redirect=%2Fcard%3Fid%3D1",
  );
  assert.equal(holm.app.auth.scanQRCode({ appId: "app_sales" }), "/auth/qr/scanner?app=app_sales");
  await holm.app.auth.promoteAnonymous({ appId: "app_sales" });
  await holm.app.auth.requestMagicLink("person@example.test", {
    appId: "app_sales",
    redirect: "/welcome",
  });
  await holm.app.auth.completeMagicLink("magic-secret");
  await holm.app.auth.completeMagicLink({ email: "person@example.test", key: "123456" });
  await holm.app.auth.logout();

  assert.deepEqual(navigations, [
    "/auth/login?redirect=%2Fdashboard",
    "/auth/qr/scanner?app=app_sales",
  ]);
  assert.deepEqual(requests, [
    {
      path: "/auth/anonymous/promote",
      method: "POST",
      body: { app: "app_sales" },
    },
    {
      path: "/auth/magic/request",
      method: "POST",
      body: { app: "app_sales", email: "person@example.test", redirect: "/welcome" },
    },
    {
      path: "/auth/magic/complete",
      method: "POST",
      body: { token: "magic-secret" },
    },
    {
      path: "/auth/magic/complete",
      method: "POST",
      body: { email: "person@example.test", key: "123456" },
    },
    {
      path: "/auth/logout",
      method: "POST",
      body: {},
    },
  ]);
  await holm.dispose();

  const headless = createAppExtension();
  assert.equal(headless.namespace, "app");
});

test("app links, surface URLs, and pagination preserve adopted browser behavior", async () => {
  const calls: Array<{ readonly method: string; readonly url: string; readonly body: unknown }> = [];
  const holm = createHolm({
    runtime: webRuntime({
      baseUrl: "https://app.example.test/",
      cache: false,
      fetch: async (input, init = {}) => {
        const url = new URL(String(input));
        const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
        calls.push({ method: init.method ?? "GET", url: `${url.pathname}${url.search}`, body });
        if (url.pathname === "/api/feed") {
          const offset = Number(url.searchParams.get("offset") ?? 0);
          return jsonResponse(offset === 0 ? { entries: ["a", "b"] } : { items: ["c"] });
        }
        return jsonResponse({ ok: true });
      },
    }),
    caller: createStaticCallerProvider({ surface: "web", principal: { kind: "browser-session" } }),
    extensions: [
      createAppExtension({
        surfaces: {
          analytics: "/system/analytics",
          login: "/auth/login",
          logout: "/auth/logout",
          browserEvents: "/api/browser-events",
        },
      }),
    ] as const,
  });

  assert.equal(holm.app.surface.analyticsUrl(), "/system/analytics");
  assert.equal(holm.app.surface.settingsUrl(), null);
  assert.equal(holm.app.surface.loginUrl({ redirect: "/reports" }), "/auth/login?redirect=%2Freports");
  assert.equal(holm.app.surface.logoutUrl("/goodbye"), "/auth/logout?redirect=%2Fgoodbye");
  assert.equal(holm.app.surface.browserEventsUrl(), "/api/browser-events");

  await holm.app.links.list("app sales", { limit: 10 });
  await holm.app.links.get("app sales", "weekly/report");
  await holm.app.links.create("app sales", { slug: "weekly" });
  await holm.app.links.update("app sales", "weekly/report", { expires: true });
  await holm.app.links.delete("app sales", "weekly/report");

  const pages = holm.app.paginate<string>("/api/feed", { limit: 2, params: { category: "news" } });
  assert.deepEqual(await pages.next(), { items: ["a", "b"], done: false });
  assert.deepEqual(await pages.next(), { items: ["c"], done: true });
  assert.deepEqual(await pages.next(), { items: [], done: true });
  pages.reset();
  assert.deepEqual(await pages.next(), { items: ["a", "b"], done: false });

  assert.deepEqual(calls.slice(0, 5), [
    { method: "GET", url: "/api/apps/app%20sales/links?limit=10", body: undefined },
    { method: "GET", url: "/api/apps/app%20sales/links/weekly%2Freport", body: undefined },
    { method: "POST", url: "/api/apps/app%20sales/links", body: { slug: "weekly" } },
    { method: "PATCH", url: "/api/apps/app%20sales/links/weekly%2Freport", body: { expires: true } },
    { method: "DELETE", url: "/api/apps/app%20sales/links/weekly%2Freport", body: undefined },
  ]);
  assert.deepEqual(calls.slice(5), [
    { method: "GET", url: "/api/feed?category=news&limit=2&offset=0", body: undefined },
    { method: "GET", url: "/api/feed?category=news&limit=2&offset=2", body: undefined },
    { method: "GET", url: "/api/feed?category=news&limit=2&offset=0", body: undefined },
  ]);
  await holm.dispose();
});

test("app uploads and link imports require an explicit runtime upload service", async () => {
  const paths: string[] = [];
  const file = createUploadFile({
    field: "file",
    name: "report.txt",
    type: "text/plain",
    source: createReadonlyBytesUploadSource(createReadonlyBytes([1, 2, 3])),
  });
  const holm = createHolm({
    runtime: webRuntime({ fetch: async () => jsonResponse({ ok: true }) }),
    caller: createStaticCallerProvider({ surface: "web", principal: { kind: "browser-session" } }),
    extensions: [
      createAppExtension({
        uploads: {
          async upload(request) {
            paths.push(request.path);
            return { ok: true, path: request.path };
          },
        },
      }),
    ] as const,
  });

  assert.deepEqual(
    await holm.app.upload<{ readonly ok: boolean; readonly path: string }>({
      path: "/api/upload",
      files: [file],
    }),
    { ok: true, path: "/api/upload" },
  );
  assert.deepEqual(
    await holm.app.links.import<{ readonly ok: boolean; readonly path: string }>("app sales", {
      fields: [{ name: "slug", value: "weekly" }],
      files: [file],
    }),
    { ok: true, path: "/api/apps/app%20sales/links/import" },
  );
  assert.deepEqual(paths, ["/api/upload", "/api/apps/app%20sales/links/import"]);
  await holm.dispose();

  const withoutUploads = createHolm({
    runtime: webRuntime({ fetch: async () => jsonResponse({ ok: true }) }),
    caller: createStaticCallerProvider({ surface: "web", principal: { kind: "browser-session" } }),
    extensions: [createAppExtension()] as const,
  });
  await assert.rejects(
    () => withoutUploads.app.upload({ path: "/api/upload", files: [file] }),
    /upload service/,
  );
  await withoutUploads.dispose();
});

test("app helpers cover low-level HTTP controls and validation branches", async () => {
  const fake = createFakeClock(10);
  const runtime = createInMemoryRuntimeAdapter({
    clock: fake.clock,
    scheduler: fake.scheduler,
    offers: [{
      id: HOLM_APP_HTTP_CAPABILITY.id,
      origin: "runtime",
      version: { major: 1, minor: 0 },
    }],
  });
  runtime.setHandler("holm.http.app:request", (request) => {
    const payload = request.payload as { readonly url?: string };
    const response = payload.url === "/array"
      ? ["array-item"]
      : payload.url === "/items"
        ? { items: ["item-value"] }
        : payload.url === "/scalar"
          ? "not-a-page"
          : request.payload;
    return {
      requestId: request.requestId,
      payload: response,
      metadata: { fixture: true },
    };
  });
  const holm = createHolm({
    runtime,
    caller: createStaticCallerProvider({ surface: "test", principal: { kind: "anonymous" } }),
    extensions: [
      createAppExtension({
        requestId: (sequence) => `custom-${sequence}`,
        surfaces: {
          settings: "/settings",
          members: "/members",
          account: "/account",
          login: "/login?mode=app#top",
          logout: " ",
          browser_events: "/events",
        },
      }),
    ] as const,
  });

  const raw = await holm.app.http.requestRaw({
    method: "GET",
    url: "/raw",
    timeoutMs: 25,
    responseMode: "raw",
  }, { reason: "fixture.raw" });
  const requested = await holm.app.http.request({ method: "POST", url: "/request", body: { mode: "raw", value: "body" } });
  await holm.app.http.put("/put", { ok: true });
  await holm.app.http.get("/override", { timeoutMs: 50, control: { timeoutMs: 5 } });
  await holm.app.auth.startAnonymous();
  await holm.app.auth.promoteAnonymous();
  await holm.app.auth.completeMagicLink({ token: "token-value" });

  assert.equal(raw.requestId, "custom-1");
  assert.deepEqual(raw.metadata, { fixture: true });
  assert.equal((requested as { readonly url: string }).url, "/request");
  assert.equal(runtime.requests[0]?.caller.reason, "fixture.raw");
  assert.equal(runtime.controls[0]?.timeoutMs, 25);
  assert.equal(runtime.controls[3]?.timeoutMs, 5);
  assert.equal(holm.app.auth.loginHref(), "/auth/login");
  assert.equal(holm.app.auth.qrScannerHref(), "/auth/qr/scanner");
  assert.equal(holm.app.surface.settingsUrl(), "/settings");
  assert.equal(holm.app.surface.membersUrl(), "/members");
  assert.equal(holm.app.surface.accountUrl(), "/account");
  assert.equal(holm.app.surface.loginUrl(), "/login?mode=app#top");
  assert.equal(holm.app.surface.loginUrl("/next"), "/login?mode=app&redirect=%2Fnext#top");
  assert.equal(holm.app.surface.logoutUrl(), null);
  assert.equal(holm.app.surface.browserEventsUrl(), "/events");

  assert.deepEqual(await holm.app.paginate<string>("/array", { limit: 2 }).next(), {
    items: ["array-item"],
    done: true,
  });
  assert.deepEqual(await holm.app.paginate<string>("/items", { limit: 2 }).next(), {
    items: ["item-value"],
    done: true,
  });
  assert.deepEqual(await holm.app.paginate<string>("/scalar", { limit: 2 }).next(), {
    items: [],
    done: true,
  });
  assert.throws(() => holm.app.paginate("/bad", { limit: 0 }), /positive safe integer/);
  assert.throws(() => holm.app.auth.requestMagicLink(" "), /email/);
  assert.throws(() => holm.app.auth.completeMagicLink(" "), /token/);
  assert.throws(() => holm.app.auth.completeMagicLink({ email: "person@example.test", key: " " }), /key/);
  assert.throws(() => holm.app.links.list(" "), /App id/);
  assert.throws(() => holm.app.links.get("app", " "), /Link id or slug/);
  await holm.dispose();
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
