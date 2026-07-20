import { existsSync, readFileSync } from "node:fs";

import { readJson } from "./lib/artifacts.mjs";

const failures = [];
const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const requiredDocs = [
  "docs/v0.1.md",
  "docs/v0.2.md",
  "docs/admin.md",
  "docs/capabilities.md",
  "docs/migration.md",
  "docs/vendoring.md",
  "docs/agent-guide.md",
  "CHANGELOG.md",
];

for (const path of requiredDocs) {
  if (!existsSync(path)) {
    failures.push(`${path}: missing release document`);
  }
}

const readText = (path) => existsSync(path) ? readFileSync(path, "utf8") : "";
const readme = readText("README.md");
const release = readText("docs/v0.2.md");
const admin = readText("docs/admin.md");
const capabilities = readText("docs/capabilities.md");
const migration = readText("docs/migration.md");
const vendoring = readText("docs/vendoring.md");
const agentGuide = readText("docs/agent-guide.md");
const examplesReadme = readText("examples/README.md");
const currentDocs = [readme, release, admin, capabilities, migration, vendoring, agentGuide, examplesReadme].join("\n");

requireEqual("package.json version", packageJson.version, "0.2.0");
requireEqual("package-lock root version", packageLock.version, "0.2.0");
requireEqual("package-lock packages[''].version", packageLock.packages?.[""]?.version, "0.2.0");
requireEqual("package publish access", packageJson.publishConfig?.access, "public");
if (packageJson.private === true) {
  failures.push("package.json: 0.2.0 release must not be private");
}

for (const needle of [
  "Why Holm SDK",
  "Is it for you?",
  "When it may not fit",
  "Quick start",
  "For coding agents",
  "docs/agent-guide.md",
  "npm install @holmhq/sdk",
]) {
  requireIncludes(readme, needle, `README ${needle}`);
}

const expectedRows = [
  ["`@holmhq/sdk`", "stable"],
  ["`@holmhq/sdk/core`", "stable"],
  ["`@holmhq/sdk/transports`", "stable"],
  ["`@holmhq/sdk/app`", "stable"],
  ["`@holmhq/sdk/web`", "stable"],
  ["`@holmhq/sdk/state`", "stable"],
  ["`@holmhq/sdk/test`", "stable"],
  ["`@holmhq/sdk/admin`", "preview"],
  ["`@holmhq/sdk/node`", "preview"],
  ["`@holmhq/sdk/sobek`", "preview"],
  ["`@holmhq/sdk/bridge`", "reserved"],
];
for (const [entryPoint, status] of expectedRows) {
  requireRegex(release, new RegExp(`\\|\\s*${escapeRegex(entryPoint)}\\s*\\|\\s*${status}\\s*\\|`, "i"), `${entryPoint} ${status} support row`);
}
requireRegex(capabilities, /\|\s*Admin client\s*\|\s*preview\s*\|/i, "admin client preview capability row");
for (const unavailable of ["generated actions/CLI", "realtime transport", "collaboration/CRDT", "framework bindings", "production desktop/mobile"] ) {
  requireRegex(capabilities, new RegExp(`\\|\\s*${escapeRegex(unavailable)}\\s*\\|[^\\n]*\\bunavailable\\b`, "i"), `${unavailable} unavailable capability row`);
}

for (const needle of [
  "3d229a414a0379d0a24221e975b8b4f1588f494d",
  "748cbe5",
  "packages/holm-sdk/index.js",
  "createAppClient()",
  "createClient()",
  "createAdminClient({ runtime, caller })",
  "@holmhq/sdk/admin",
  "admin.audit.js",
  "getClient()",
  "ApiError",
  "createCache()",
  "createMockAdapter()",
  "createDebugClient()",
  "createAnalyticsHook()",
  "packages/holm-state/src/index.js",
  "ref()",
  "computed()",
  "watch()",
  "effect()",
  "remote()",
  "channel()",
  "guard()",
  "route()",
  "track()",
  "debug",
  "remains live",
]) {
  requireIncludes(migration, needle, `migration ledger ${needle}`);
}

for (const needle of [
  "whole `dist/` tree",
  "immutable Git SHA or reviewed tag",
  "@holmhq/sdk@0.2.0",
  "v0.2.0",
  "Never use `@main`",
  "dist/manifest.json",
  "sha256",
  "invalidateCache()",
  "logout",
  "holm host update",
  "rollback",
]) {
  requireIncludes(vendoring, needle, `vendoring guide ${needle}`);
}

for (const needle of [
  "createAdminClient({ runtime, caller })",
  "explicit operator caller",
  "216 methods",
  "189 HTTP",
  "adminMethodDescriptors",
  "AdminUploadService",
  "preflight",
  "ReadonlyBytes",
  "Holm remains the authorization boundary",
]) {
  requireIncludes(admin, needle, `admin guide ${needle}`);
}

for (const needle of [
  "Core has no DOM or Node ambient types",
  "red → green → refactor",
  "npm run ci",
  "npm run build",
  "dist/manifest.json",
  "Holm is the protocol authority",
  "immutable snapshots",
  "caller identity",
  "@holmhq/sdk/admin",
  "v0.2.md",
]) {
  requireIncludes(agentGuide, needle, `agent guide ${needle}`);
}

for (const needle of ["`vite/`", "`react/`", "`shared/session-contract.ts`", "useSyncExternalStore", "same semantic session resource/action contract"]) {
  requireIncludes(examplesReadme, needle, `examples guide ${needle}`);
}

for (const stale of [
  "private `0.1.0-rc.1` code/artifact checkpoint",
  "Issue `#015` remains open",
  "future gates after this RC stops",
  "| Admin client | unavailable |",
]) {
  if (currentDocs.includes(stale)) {
    failures.push(`current release docs retain stale RC boundary: ${JSON.stringify(stale)}`);
  }
}

if (failures.length > 0) {
  console.error("Release docs/metadata check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Release docs/metadata check passed for public 0.2.0.");

function requireEqual(label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`);
  }
}

function requireIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    failures.push(`${label}: missing ${JSON.stringify(needle)}`);
  }
}

function requireRegex(text, regex, label) {
  if (!regex.test(text)) {
    failures.push(`${label}: missing pattern ${regex}`);
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
