import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

interface AppRouteAuditEntry {
  readonly sourceKey: string;
  readonly methods: readonly string[];
  readonly path: string;
  readonly classification: "adopted" | "redesigned" | "deferred" | "intentionally-unsupported";
  readonly sdk: readonly string[];
  readonly rationale: string;
}

interface AppRouteAudit {
  readonly schema: "holm.sdk.app-route-audit/1";
  readonly source: {
    readonly repository: "holmhq/holm";
    readonly commit: string;
    readonly path: "packages/holm-sdk/app.audit.js";
  };
  readonly entries: readonly AppRouteAuditEntry[];
}

const ledgerPath = "koder/evidence/003_issue007_app_routes/route-audit.json";
const expectedSourceKeys = [
  "/auth/login",
  "GET /auth/qr/scanner",
  "POST /auth/anonymous/start",
  "POST /auth/anonymous/promote",
  "POST /auth/magic/request",
  "GET /auth/magic/complete",
  "POST /auth/magic/complete",
  "POST /auth/logout",
  "/api/apps/{id}/links",
  "POST /api/apps/{id}/links/import",
  "/api/apps/{id}/links/{idOrSlug}",
  "GET /api/me",
] as const;
const expectedRoutes = [
  "GET /auth/login",
  "GET /auth/qr/scanner",
  "POST /auth/anonymous/start",
  "POST /auth/anonymous/promote",
  "POST /auth/magic/request",
  "GET /auth/magic/complete",
  "POST /auth/magic/complete",
  "POST /auth/logout",
  "GET /api/apps/{id}/links",
  "POST /api/apps/{id}/links",
  "POST /api/apps/{id}/links/import",
  "GET /api/apps/{id}/links/{idOrSlug}",
  "PATCH /api/apps/{id}/links/{idOrSlug}",
  "DELETE /api/apps/{id}/links/{idOrSlug}",
  "GET /api/me",
] as const;

test("Issue 007 classifies every live app.audit.js route at a named Holm commit", async () => {
  const audit = JSON.parse(await readFile(ledgerPath, "utf8")) as AppRouteAudit;

  assert.equal(audit.schema, "holm.sdk.app-route-audit/1");
  assert.deepEqual(audit.source, {
    repository: "holmhq/holm",
    commit: "8deb00b7aa1cc07f39665fde6e81c1b33d3620c4",
    path: "packages/holm-sdk/app.audit.js",
  });
  assert.deepEqual(
    audit.entries.map((entry) => entry.sourceKey).sort(),
    [...expectedSourceKeys].sort(),
  );
  assert.deepEqual(
    audit.entries
      .flatMap((entry) => entry.methods.map((method) => `${method} ${entry.path}`))
      .sort(),
    [...expectedRoutes].sort(),
  );

  for (const entry of audit.entries) {
    assert.match(entry.rationale, /\S/);
    assert.equal(entry.methods.length > 0, true);
    assert.equal(new Set(entry.methods).size, entry.methods.length);
    assert.equal(entry.path.startsWith("/"), true);
    assert.equal(
      ["adopted", "redesigned", "deferred", "intentionally-unsupported"].includes(entry.classification),
      true,
    );
    if (entry.classification === "intentionally-unsupported") {
      assert.deepEqual(entry.sdk, []);
    } else {
      assert.equal(entry.sdk.length > 0, true);
    }
  }
});
