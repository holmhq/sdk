import { readFileSync } from "node:fs";

import { readJson } from "./lib/artifacts.mjs";

const failures = [];
const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const readText = (path) => readFileSync(path, "utf8");

const docsPath = "docs/v0.1-web-rc.md";
const readme = readText("README.md");
const examplesReadme = readText("examples/README.md");
let rcDocs = "";
try {
  rcDocs = readText(docsPath);
} catch (error) {
  failures.push(`${docsPath}: missing private RC contract document`);
}

const combined = `${readme}\n${examplesReadme}\n${rcDocs}`;

requireEqual("package.json version", packageJson.version, "0.1.0-rc.1");
requireEqual("package.json private", packageJson.private, true);
requireEqual("package-lock root version", packageLock.version, "0.1.0-rc.1");
requireEqual("package-lock packages[''].version", packageLock.packages?.[""]?.version, "0.1.0-rc.1");

requireIncludes(combined, "private `0.1.0-rc.1` code/artifact checkpoint", "private RC checkpoint wording");
requireIncludes(combined, "This checkpoint is not an npm publication, tag, GitHub release, deployment, production proof, pilot result, browser/vendor soak claim, or promotion to `0.1.0`.", "explicit no-release/non-pilot sentence");
requireIncludes(combined, "real app/browser soak and owner-present promotion to `0.1.0` are future gates", "future soak/promotion gate");
requireIncludes(combined, "Issue `#015` remains open", "Issue #015 non-completion boundary");

const expectedRows = [
  ["`@holmhq/sdk`", "stable"],
  ["`@holmhq/sdk/core`", "stable"],
  ["`@holmhq/sdk/transports`", "stable"],
  ["`@holmhq/sdk/app`", "stable"],
  ["`@holmhq/sdk/web`", "stable"],
  ["`@holmhq/sdk/state`", "stable"],
  ["`@holmhq/sdk/test`", "stable"],
  ["`@holmhq/sdk/node`", "preview"],
  ["`@holmhq/sdk/sobek`", "preview"],
  ["`@holmhq/sdk/bridge`", "reserved"],
];

for (const [entryPoint, status] of expectedRows) {
  requireRegex(rcDocs, new RegExp(`\\|\\s*${escapeRegex(entryPoint)}\\s*\\|\\s*${status}\\s*\\|`, "i"), `${entryPoint} ${status} support row`);
}

for (const unavailable of [
  "admin",
  "actions/generated CLI",
  "realtime",
  "collaboration",
  "framework bindings",
  "production desktop/mobile",
  "arbitrary SSR",
]) {
  requireRegex(rcDocs, new RegExp(`\\|\\s*${escapeRegex(unavailable)}\\s*\\|\\s*unavailable\\s*\\|`, "i"), `${unavailable} unavailable support row`);
}

requireIncludes(rcDocs, "Stable `0.1.x` compatibility: no breaking removal, rename, or behavioral contract change; additive changes only; deprecate before any future removal.", "stable 0.1.x compatibility policy");
requireIncludes(rcDocs, "Preview and reserved imports are exempt from the stable `0.1.x` freeze", "preview/reserved compatibility exemption");
requireIncludes(combined, "Use an immutable Git SHA or reviewed tag", "immutable SHA/reviewed tag vendoring");
requireIncludes(combined, "Never use `@main` for deployed apps", "mutable @main rejection");
requireIncludes(combined, "sha256sum -c", "hash verification command");
requireIncludes(combined, "Rollback means restoring the previously vendored SDK files and their recorded checksum metadata", "rollback contract");
requireIncludes(combined, "Report suspected SDK integrity or credential-redaction issues privately", "security reporting note");
requireIncludes(combined, "Holm app wire behavior remains GET/POST", "Holm GET/POST authority");
requireIncludes(combined, "BFBB authored root `index.html` takes precedence", "BFBB authored-web precedence");
requireIncludes(examplesReadme, "Stable v0.1-web imports:", "examples stable import list");
requireIncludes(examplesReadme, "Vendored BFBB usage:", "examples vendored BFBB usage");

if (failures.length > 0) {
  console.error("RC docs/metadata check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("RC docs/metadata check passed for private 0.1.0-rc.1.");

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
