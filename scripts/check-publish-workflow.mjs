import { existsSync, readFileSync } from "node:fs";

import { readJson } from "./lib/artifacts.mjs";

const workflowPath = ".github/workflows/publish.yml";
const guidePath = "docs/releasing.md";
const failures = [];
const workflow = readText(workflowPath);
const guide = readText(guidePath);
const packageJson = readJson("package.json");

if (packageJson.scripts?.["test:publish-workflow"] !== "node scripts/check-publish-workflow.mjs") {
  failures.push("package.json must expose the canonical test:publish-workflow script");
}

for (const [needle, label] of [
  ["workflow_dispatch:", "manual workflow dispatch"],
  ["id-token: write", "OIDC id-token permission"],
  ["contents: read", "read-only repository permission"],
  ["environment: npm-release", "protected npm-release environment"],
  ["runs-on: ubuntu-latest", "GitHub-hosted runner"],
  ["actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0", "SHA-pinned checkout v7.0.0"],
  ["actions/setup-node@820762786026740c76f36085b0efc47a31fe5020", "SHA-pinned setup-node v7.0.0"],
  ["node-version: \"24\"", "Node 24"],
  ["package-manager-cache: false", "release cache disabled"],
  ["npm install --global npm@11.15.0", "staged-publishing npm floor"],
  ["test \"$(npm --version)\" = \"11.15.0\"", "npm version assertion"],
  ["RELEASE_TAG:", "non-interpolated release-tag environment"],
  ["refs/tags/$RELEASE_TAG", "annotated tag verification"],
  ["$RELEASE_TAG^{}", "peeled release target verification"],
  ["npm view \"$PACKAGE_NAME@$VERSION\"", "already-published version guard"],
  ["npm ci", "locked dependency install"],
  ["npm run release:check", "canonical release gate"],
  ["git diff --exit-code", "generated/source cleanliness gate"],
  ["npm stage publish . --access public --tag latest", "stage-only npm submission"],
]) {
  if (!workflow.includes(needle)) failures.push(`${workflowPath}: missing ${label}`);
}

for (const [pattern, label] of [
  [/^\s{2}(?:push|pull_request|schedule|workflow_run):/m, "automatic publish trigger"],
  [/\$\{\{\s*secrets\./, "GitHub secret reference"],
  [/\bNPM_TOKEN\b/, "NPM_TOKEN"],
  [/\bNODE_AUTH_TOKEN\b/, "NODE_AUTH_TOKEN"],
  [/(?:^|\n)\s*-\s+run:\s*npm\s+publish\b/, "direct npm publish"],
  [/npm\s+stage\s+approve\b/, "automated stage approval"],
  [/uses:\s*[^\s]+@v\d+/i, "mutable major action tag"],
]) {
  if (pattern.test(workflow)) failures.push(`${workflowPath}: forbidden ${label}`);
}

for (const needle of [
  "stage-only",
  "npm-release",
  "publish.yml",
  "11.15.0",
  "WebAuthn",
  "id-token: write",
  "no `NPM_TOKEN`",
  "Require two-factor authentication and disallow tokens",
  "npm stage publish",
  "npmjs.com",
]) {
  if (!guide.includes(needle)) failures.push(`${guidePath}: missing ${JSON.stringify(needle)}`);
}

if (failures.length > 0) {
  console.error("Trusted publishing workflow check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Trusted publishing workflow check passed: manual OIDC staging, immutable tag gates, no publish token, and browser approval documented.");

function readText(path) {
  if (!existsSync(path)) {
    failures.push(`${path}: missing`);
    return "";
  }
  return readFileSync(path, "utf8");
}
