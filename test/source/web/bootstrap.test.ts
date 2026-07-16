import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  createWebNavigation,
  readWebAppSurfaceBootstrap,
} from "../../../src/web/index.js";

test("web surface bootstrap maps __HOLM_SURFACES__ behind an explicit boundary", () => {
  const runtimeGlobal = {
    __HOLM_SURFACES__: {
      analytics: "/system/analytics",
      settings: " ",
      login: "/auth/login",
      browser_events: "/api/browser-events",
      unknown: "/ignored",
    },
  };

  const surfaces = readWebAppSurfaceBootstrap({ runtimeGlobal });

  assert.deepEqual(surfaces, {
    analytics: "/system/analytics",
    login: "/auth/login",
    browserEvents: "/api/browser-events",
  });
  assert.equal(Object.isFrozen(surfaces), true);
  assert.deepEqual(
    readWebAppSurfaceBootstrap({
      runtimeGlobal,
      surfaces: { account: "/account", browserEvents: "/events" },
    }),
    { account: "/account", browserEvents: "/events" },
  );
  assert.deepEqual(readWebAppSurfaceBootstrap({ runtimeGlobal: { __HOLM_SURFACES__: "invalid" } }), {});
  assert.deepEqual(readWebAppSurfaceBootstrap({ runtimeGlobal, surfaces: undefined }), {});

  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "__HOLM_SURFACES__");
  try {
    Object.defineProperty(globalThis, "__HOLM_SURFACES__", {
      configurable: true,
      value: { members: "/ambient-members" },
    });
    assert.deepEqual(readWebAppSurfaceBootstrap(), { members: "/ambient-members" });
  } finally {
    if (descriptor === undefined) {
      Reflect.deleteProperty(globalThis, "__HOLM_SURFACES__");
    } else {
      Object.defineProperty(globalThis, "__HOLM_SURFACES__", descriptor);
    }
  }
});

test("web navigation wraps location assignment without leaking window into app code", () => {
  const assigned: string[] = [];
  const navigation = createWebNavigation({
    href: "https://app.example.test/",
    assign(href) {
      assigned.push(href);
    },
  });
  navigation.assign("/auth/login?redirect=%2Fdashboard");
  assert.deepEqual(assigned, ["/auth/login?redirect=%2Fdashboard"]);

  const fallbackLocation = { href: "https://app.example.test/" };
  createWebNavigation(fallbackLocation).assign("/next");
  assert.equal(fallbackLocation.href, "/next");
  assert.throws(() => createWebNavigation(null), /location service/);

  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "location");
  const ambientAssigned: string[] = [];
  try {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { href: "/", assign: (href: string) => ambientAssigned.push(href) },
    });
    createWebNavigation().assign("/ambient");
    assert.deepEqual(ambientAssigned, ["/ambient"]);
  } finally {
    if (descriptor === undefined) {
      Reflect.deleteProperty(globalThis, "location");
    } else {
      Object.defineProperty(globalThis, "location", descriptor);
    }
  }
});
