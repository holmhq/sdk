import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

const ledgerPath = "koder/evidence/004_issue008_admin_routes/route-audit.json";
const holmRoot = resolve(process.env.HOLM_ROOT?.trim() || `${homedir()}/Projects/holmhq/holm/master`);
const relevantPaths = [
  "packages/holm-sdk/admin.audit.js",
  "packages/holm-sdk/admin.js",
  "packages/holm-sdk/surface.audit.js",
  "packages/holm-sdk/types.js",
  "packages/holm-sdk/client.js",
];

const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
const head = git(["rev-parse", "HEAD"]);
const relevantStatus = git(["status", "--short", "--untracked-files=all", "--", ...relevantPaths]);
if (relevantStatus !== "") {
  fail(`live Holm admin authority paths are dirty:\n${relevantStatus}`);
}

const auditUrl = pathToFileURL(resolve(holmRoot, "packages/holm-sdk/admin.audit.js"));
auditUrl.searchParams.set("commit", head);
const { supportedAdminRouteInventory, intentionallyExcludedAdminRoutes } = await import(auditUrl.href);
const liveEntries = Object.entries(supportedAdminRouteInventory).map(([sourceKey, entry]) => normalizeEntry(sourceKey, entry));
const ledgerEntries = ledger.entries.map(({ sourceKey, methods, path, sdk, helper, notes }) => ({
  sourceKey,
  methods,
  path,
  sdk,
  ...(helper === true ? { helper: true } : {}),
  ...(notes === undefined ? {} : { notes }),
}));
const liveExclusions = Object.entries(intentionallyExcludedAdminRoutes).map(([sourceKey, rationale]) => ({ sourceKey, rationale }));
const ledgerExclusions = ledger.exclusions.map(({ sourceKey, rationale }) => ({ sourceKey, rationale }));

assertSame("supported admin route inventory", ledgerEntries, liveEntries);
assertSame("intentional admin exclusions", ledgerExclusions, liveExclusions);

const relevantDiff = git(["diff", "--name-only", `${ledger.source.commit}..${head}`, "--", ...relevantPaths]);
const methodCount = new Set(liveEntries.flatMap((entry) => entry.sdk)).size;
const routeCount = liveEntries.reduce((count, entry) => count + entry.methods.length, 0);
console.log(
  `Holm admin authority check passed at ${head}: ${liveEntries.length} keys, ${routeCount} route/method contracts, ${methodCount} methods, ${liveExclusions.length} exclusions.`,
);
if (head !== ledger.source.commit) {
  console.log(
    relevantDiff === ""
      ? `Ledger content remains current; relevant paths are unchanged since ${ledger.source.commit}.`
      : `Relevant commits changed but normalized live inventory remains byte-equivalent: ${relevantDiff.replaceAll("\n", ", ")}.`,
  );
}

function normalizeEntry(sourceKey, entry) {
  const match = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) (\/.*)$/.exec(sourceKey);
  const methods = match ? [match[1]] : [...(entry.methods ?? [])];
  const path = match ? match[2] : sourceKey;
  return {
    sourceKey,
    methods,
    path,
    sdk: [...entry.sdk],
    ...(entry.helper === true ? { helper: true } : {}),
    ...(entry.notes === undefined ? {} : { notes: entry.notes }),
  };
}

function assertSame(label, expected, actual) {
  if (JSON.stringify(expected) === JSON.stringify(actual)) return;
  fail(`${label} drifted from ${ledgerPath}; refresh and review the authority ledger before release`);
}

function git(args) {
  return execFileSync("git", ["-C", holmRoot, ...args], { encoding: "utf8" }).trim();
}

function fail(message) {
  console.error(`Holm admin authority check failed: ${message}`);
  process.exit(1);
}
