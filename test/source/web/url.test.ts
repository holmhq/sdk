import { strict as assert } from "node:assert";
import { test } from "node:test";

import { ProtocolError } from "../../../src/core/index.js";
import { resolveWebRequestUrl } from "../../../src/web/url.js";

test("web URL resolution enforces same-origin auth boundaries", () => {
  const base = new URL("https://app.example.test/root/");
  assert.equal(
    resolveWebRequestUrl("/api/items?existing=1#top", base, { z: 2, skip: null, a: "first" }),
    "https://app.example.test/api/items?a=first&existing=1&z=2#top",
  );
  assert.equal(
    resolveWebRequestUrl("https://app.example.test/api/me", base),
    "https://app.example.test/api/me",
  );
  assert.equal(resolveWebRequestUrl("/api/me", undefined), "/api/me");
  assert.throws(
    () => resolveWebRequestUrl("https://evil.example/api/me", base),
    (error: unknown) => error instanceof ProtocolError && error.code === "web_cross_origin_request",
  );
  assert.throws(
    () => resolveWebRequestUrl("https://user:pass@app.example.test/api/me", base),
    (error: unknown) => error instanceof ProtocolError && error.code === "web_credentialed_request_url",
  );
  assert.throws(
    () => resolveWebRequestUrl("http://[invalid", base),
    (error: unknown) => error instanceof ProtocolError && error.code === "invalid_web_request_url",
  );
});

test("web URL resolution uses ambient location only as an explicit same-origin authority", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "location");
  try {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { href: "https://ambient.example.test/app/" },
    });
    assert.equal(
      resolveWebRequestUrl("https://ambient.example.test/api/me", undefined),
      "https://ambient.example.test/api/me",
    );
    for (const bypass of ["//evil.example/api/me", "/\\evil.example/api/me", "\\/evil.example/api/me"]) {
      assert.throws(
        () => resolveWebRequestUrl(bypass, undefined),
        (error: unknown) => error instanceof ProtocolError && error.code === "web_cross_origin_request",
      );
    }

    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { href: "not a valid absolute URL" },
    });
    assert.throws(
      () => resolveWebRequestUrl("https://ambient.example.test/api/me", undefined),
      (error: unknown) => error instanceof ProtocolError && error.code === "web_cross_origin_request",
    );
  } finally {
    if (descriptor === undefined) {
      Reflect.deleteProperty(globalThis, "location");
    } else {
      Object.defineProperty(globalThis, "location", descriptor);
    }
  }
});
