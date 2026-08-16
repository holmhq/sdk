import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { validateRouteDispositions } from "../../scripts/check-holm-route-dispositions.mjs";

const registryPath = "koder/evidence/007_holm_v0207_route_registry/route-registry.json";
const dispositionsPath = "koder/evidence/008_holm_v0207_route_dispositions/route-dispositions.json";
const adminLedgerPath = "koder/evidence/004_issue008_admin_routes/route-audit.json";
const appLedgerPath = "koder/evidence/003_issue007_app_routes/route-audit.json";

const [registry, document, adminLedger, appLedger] = await Promise.all(
  [registryPath, dispositionsPath, adminLedgerPath, appLedgerPath].map(async (path) =>
    JSON.parse(await readFile(path, "utf8"))),
);

function validate(options = {}) {
  return validateRouteDispositions({
    registry: options.registry ?? registry,
    document: options.document ?? document,
    adminLedger: options.adminLedger ?? adminLedger,
    appLedger: options.appLedger ?? appLedger,
  });
}

function clone(value) {
  return structuredClone(value);
}

function findResolved(result, identity) {
  return result.resolved.find((entry) =>
    entry.method === identity.method
    && entry.path === identity.path
    && entry.source_group === identity.source_group
    && entry.lane === identity.lane);
}

test("the composed disposition ledger classifies all 261 signed route identities", () => {
  const result = validate();
  assert.deepEqual(result.errors, []);
  assert.equal(result.resolved.length, 261);
  assert.equal(new Set(result.resolved.map((entry) => entry.identity)).size, 261);
  assert.deepEqual(result.summary, document.expected);
  assert.deepEqual(result.summary.implementation, {
    current: 187,
    "s3-candidate": 0,
    none: 74,
  });
});

test("the two shared space-key route rows retain distinct lane dispositions", () => {
  const result = validate();
  assert.deepEqual(result.errors, []);

  const dashboard = findResolved(result, {
    method: "POST",
    path: "/api/spaces/{space}/keys",
    source_group: "internal/handlers/spaces.go",
    lane: "dashboard-admin",
  });
  const memberHost = findResolved(result, {
    method: "POST",
    path: "/api/spaces/{space}/keys",
    source_group: "internal/handlers/spaces.go",
    lane: "member-host",
  });

  assert.equal(dashboard?.classification, "adopted");
  assert.equal(dashboard?.implementation, "current");
  assert.equal(dashboard?.sdk.includes("admin:spaces.keys.create"), true);
  assert.equal(memberHost?.classification, "deferred");
  assert.equal(memberHost?.implementation, "none");
  assert.deepEqual(memberHost?.sdk, []);
});

test("S3 promotes only the two stable retention contracts from the 21-row admin delta", () => {
  const result = validate();
  assert.deepEqual(result.errors, []);
  const delta = result.resolved.filter((entry) => entry.group === "s2-admin-delta");
  assert.equal(delta.length, 21);

  assert.deepEqual(
    delta.map((entry) => `${entry.method} ${entry.path}`).sort(),
    [
      "DELETE /api/system/policy/keys/{key}",
      "DELETE /api/system/scan-shield/rules/{id}",
      "GET /api/system/census",
      "GET /api/system/db/candidates",
      "GET /api/system/db/retention/status",
      "GET /api/system/db/usage",
      "GET /api/system/policy/keys",
      "GET /api/system/policy/keys/{key}",
      "GET /api/system/policy/keys/{key}/default",
      "GET /api/system/policy/registry",
      "GET /api/system/scan-shield/events",
      "GET /api/system/scan-shield/rules",
      "GET /api/system/scan-shield/status",
      "POST /api/hosts/swap",
      "POST /api/hosts/{host}/reserve",
      "POST /api/hosts/{host}/split",
      "POST /api/system/census/disable",
      "POST /api/system/census/enable",
      "POST /api/system/db/retention/run",
      "POST /api/system/scan-shield/rules",
      "PUT /api/system/policy/keys/{key}",
    ].sort(),
  );

  const promoted = delta.filter((entry) => entry.implemented_in === "sdk#019/S3");
  assert.deepEqual(
    promoted.map((entry) => `${entry.method} ${entry.path}`).sort(),
    [
      "GET /api/system/db/retention/status",
      "POST /api/system/db/retention/run",
    ],
  );
  assert.equal(promoted.every((entry) => entry.classification === "adopted"), true);
  assert.equal(promoted.every((entry) => entry.implementation === "current"), true);
  assert.equal(promoted.every((entry) => entry.stability === "stable"), true);
  assert.equal(promoted.every((entry) => entry.sdk.length === 1), true);
  assert.equal(promoted.every((entry) => entry.contract_authority !== undefined), true);

  const deferred = delta.filter((entry) => entry.classification === "deferred");
  assert.equal(deferred.length, 19);
  assert.equal(deferred.every((entry) => entry.implementation === "none"), true);
});

test("canonical CI runs the offline disposition check", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(
    packageJson.scripts["test:holm-route-dispositions"],
    "node --test test/tooling/check-holm-route-dispositions.test.mjs && node scripts/check-holm-route-dispositions.mjs",
  );
  assert.equal(packageJson.scripts.ci.includes("npm run test:holm-route-dispositions"), true);
});

test("validation fails closed on missing, duplicate, stale, and conflicting decisions", () => {
  const missing = clone(document);
  missing.overrides = missing.overrides.filter((entry) => entry.path !== "/debug/census");
  assert.equal(validate({ document: missing }).errors.some((error) => error.includes("missing disposition") && error.includes("/debug/census")), true);

  const duplicate = clone(document);
  duplicate.overrides.push(clone(duplicate.overrides[0]));
  assert.equal(validate({ document: duplicate }).errors.some((error) => error.includes("duplicate override identity")), true);

  const stale = clone(document);
  stale.overrides.push({
    method: "GET",
    path: "/not-a-holm-route",
    source_group: "test",
    lane: "test",
    classification: "excluded",
    implementation: "none",
    rationale: "Negative fixture.",
    basis: ["test:negative-fixture"],
  });
  assert.equal(validate({ document: stale }).errors.some((error) => error.includes("stale override identity")), true);

  const conflict = clone(document);
  conflict.overrides = conflict.overrides.filter((entry) => entry.path !== "/auth/login");
  assert.equal(validate({ document: conflict }).errors.some((error) => error.includes("conflicting inherited classifications") && error.includes("/auth/login")), true);

  const reordered = clone(document);
  [reordered.overrides[0], reordered.overrides[1]] = [reordered.overrides[1], reordered.overrides[0]];
  assert.equal(validate({ document: reordered }).errors.some((error) => error.includes("signed registry order")), true);

  const malformedBasis = clone(document);
  malformedBasis.overrides[0].basis = [42];
  assert.equal(validate({ document: malformedBasis }).errors.some((error) => error.includes("basis must contain only non-empty strings")), true);
});

test("provenance and S3 admission constraints fail closed", () => {
  const wrongCommit = clone(document);
  wrongCommit.source.holm_commit = "0".repeat(40);
  assert.equal(validate({ document: wrongCommit }).errors.some((error) => error.includes("Holm commit")), true);

  const previewRegistry = clone(registry);
  const status = previewRegistry.data.routes.find((route) =>
    route.method === "GET" && route.path === "/api/system/db/retention/status");
  status.stability = "preview";
  assert.equal(validate({ registry: previewRegistry }).errors.some((error) => error.includes("implemented_in") && error.includes("must be stable")), true);

  const missingAuthority = clone(document);
  const promoted = missingAuthority.overrides.find((entry) => entry.implemented_in === "sdk#019/S3");
  delete promoted.contract_authority;
  assert.equal(validate({ document: missingAuthority }).errors.some((error) => error.includes("contract_authority")), true);
});
