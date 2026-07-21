import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { readJson } from "./lib/artifacts.mjs";

const workflowPath = ".github/workflows/publish.yml";
const guidePath = "docs/releasing.md";
const preparePath = "scripts/prepare-release-assets.mjs";
const failures = [];
const workflow = readText(workflowPath);
const guide = readText(guidePath);
const prepare = readText(preparePath);
const packageJson = readJson("package.json");
const validateJob = workflowSection("validate");
const publishJob = workflowSection("publish");
const verifyJob = workflowSection("verify");

if (packageJson.scripts?.["test:publish-workflow"] !== "node scripts/check-publish-workflow.mjs") {
  failures.push("package.json must expose the canonical test:publish-workflow script");
}

for (const [needle, label] of [
  ["name: Publish SDK release", "direct release workflow name"],
  ["run-name: Publish SDK release", "direct release run name"],
  ["workflow_dispatch:", "manual workflow dispatch"],
  ["permissions: {}", "deny-by-default workflow permissions"],
  ["actions: read", "environment approval audit permission"],
  ["id-token: write", "OIDC id-token permission"],
  ["contents: write", "GitHub Release write permission"],
  ["environment: npm-release", "protected npm-release environment"],
  ["group: npm-release", "serial cross-version release concurrency"],
  ["cancel-in-progress: false", "non-cancelling release concurrency"],
  ["name: Validate exact release target", "unprivileged validation job"],
  ["name: Publish npm and create GitHub release", "protected mutation job"],
  ["name: Verify public release without publish authority", "unprivileged verification job"],
  ["runs-on: ubuntu-latest", "GitHub-hosted runner"],
  ["actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0", "SHA-pinned checkout v7.0.0"],
  ["actions/setup-node@820762786026740c76f36085b0efc47a31fe5020", "SHA-pinned setup-node v7.0.0"],
  ["actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02", "SHA-pinned upload-artifact v4.6.2"],
  ["actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093", "SHA-pinned download-artifact v4.3.0"],
  ["node-version: \"24.8.0\"", "exact Node 24.8.0"],
  ["test \"$(node --version)\" = \"v24.8.0\"", "Node version assertion"],
  ["test \"$(npm --version)\" = \"11.6.0\"", "bundled npm version assertion"],
  ["package-manager-cache: false", "release cache disabled"],
  ["RELEASE_TAG:", "non-interpolated release-tag environment"],
  ["ref: ${{ github.sha }}", "dispatch-pinned checkout"],
  ["fetch-tags: true", "explicit tag fetch"],
  ["persist-credentials: false", "checkout credential removal"],
  ["$GITHUB_SHA^{commit}", "dispatch SHA versus checked-out commit binding"],
  ["refs/tags/$RELEASE_TAG", "annotated tag verification"],
  ["$RELEASE_TAG^{}", "peeled release target verification"],
  ["npm ci --ignore-scripts", "locked dependency install without lifecycle scripts"],
  ["npm run release:check", "canonical release gate"],
  ["git diff --exit-code", "generated/source cleanliness gate"],
  ["node scripts/prepare-release-assets.mjs", "deterministic release asset preparation"],
  [".tmp/rederived-release-notes.md", "protected-job changelog note derivation"],
  ["Immutable SDK release tags", "live immutable-tag ruleset verification"],
  ["gh api --paginate repos/holmhq/sdk/rulesets", "paginated tag-ruleset discovery"],
  ["!Array.isArray(ruleset.bypass_actors)", "strict tag-ruleset bypass rejection"],
  ["excludes.length !== 0", "tag-ruleset exclusion rejection"],
  ["actions/runs/$GITHUB_RUN_ID/approvals", "live accountable approval verification"],
  ["EXPECTED_REVIEWER: jikkuatwork", "expected accountable reviewer"],
  ["git ls-remote --tags origin", "live remote tag peel verification"],
  ["npm view \"$PACKAGE_NAME@$VERSION\"", "resumable registry-state inspection"],
  ["npm publish . --access public --tag latest --ignore-scripts", "direct directory-spec OIDC npm publication"],
  ["dist.attestations.provenance.predicateType", "published provenance verification"],
  ["npm audit signatures", "registry signature and attestation verification"],
  ["gh release create \"$RELEASE_TAG\"", "GitHub Release creation"],
  ["--verify-tag", "existing remote tag requirement"],
  ["GH_REPO: holmhq/sdk", "explicit repository context for checkout-free verification"],
  ["gh release download \"$RELEASE_TAG\"", "GitHub asset download verification"],
  ["repos/holmhq/sdk/releases/latest", "latest GitHub Release verification"],
  ["cmp --silent", "byte-for-byte artifact verification"],
  ["wc -l < .tmp/release/SHA256SUMS", "exact checksum entry count"],
  ["name,body,isDraft,isPrerelease,assets", "GitHub Release metadata and exact asset-set verification"],
]) {
  if (!workflow.includes(needle)) failures.push(`${workflowPath}: missing ${label}`);
}

for (const [pattern, label] of [
  [/\$\{\{\s*secrets\./, "GitHub secret reference"],
  [/\bNPM_TOKEN\b/, "NPM_TOKEN"],
  [/\bNODE_AUTH_TOKEN\b/, "NODE_AUTH_TOKEN"],
  [/npm\s+stage\s+(?:publish|approve)\b/, "npm staged-publishing command"],
  [/gh\s+release\s+(?:delete|edit)\b|--clobber\b/, "mutable GitHub Release repair"],
  [/npm\s+install\s+--global\b/, "runtime npm CLI replacement under publish authority"],
  [/uses:\s*[^\s]+@v\d+/i, "mutable major action tag"],
]) {
  if (pattern.test(workflow)) failures.push(`${workflowPath}: forbidden ${label}`);
}

const triggerBlock = topLevelSection("on", "permissions");
const triggers = [...triggerBlock.matchAll(/^  ([a-zA-Z_]+):/gm)].map((match) => match[1]);
if (JSON.stringify(triggers) !== JSON.stringify(["workflow_dispatch"])) {
  failures.push(`${workflowPath}: triggers must be exactly workflow_dispatch; found ${JSON.stringify(triggers)}`);
}

const publishLines = workflow.split("\n").filter((line) => /\bnpm\s+publish\b/.test(line));
if (publishLines.length !== 1 || !/^\s+npm publish \. --access public --tag latest --ignore-scripts\s*$/.test(publishLines[0])) {
  failures.push(`${workflowPath}: expected exactly one standalone direct npm publish command; found ${JSON.stringify(publishLines)}`);
}

for (const [count, expected, label] of [
  [(workflow.match(/actions: read/g) ?? []).length, 1, "actions read grant"],
  [(workflow.match(/id-token: write/g) ?? []).length, 1, "id-token write grant"],
  [(workflow.match(/contents: write/g) ?? []).length, 1, "contents write grant"],
  [(workflow.match(/environment: npm-release/g) ?? []).length, 1, "protected environment binding"],
  [(workflow.match(/fetch-tags: true/g) ?? []).length, 2, "explicit tag fetch"],
  [(workflow.match(/persist-credentials: false/g) ?? []).length, 2, "checkout credential removal"],
]) {
  if (count !== expected) failures.push(`${workflowPath}: expected ${expected} ${label}; found ${count}`);
}

if (/actions: read|id-token: write|contents: write|environment: npm-release/.test(validateJob)) {
  failures.push(`${workflowPath}: validation job must not have publish authority or environment access`);
}
if (!/actions: read/.test(publishJob) || !/id-token: write/.test(publishJob) || !/contents: write/.test(publishJob) || !/environment: npm-release/.test(publishJob)) {
  failures.push(`${workflowPath}: publish job must exclusively hold OIDC, release write, and environment authority`);
}
if (!/needs: validate/.test(publishJob)) {
  failures.push(`${workflowPath}: publish job must require successful validation`);
}
if (/actions: read|id-token: write|contents: write|environment: npm-release/.test(verifyJob)) {
  failures.push(`${workflowPath}: verification job must not have publish authority or environment access`);
}
if (!/needs: publish/.test(verifyJob)) {
  failures.push(`${workflowPath}: verification job must require successful publication/release creation`);
}
for (const pattern of [/npm ci\b/, /npm run\b/, /node_modules\//, /npm audit signatures/]) {
  if (pattern.test(publishJob)) failures.push(`${workflowPath}: protected publish job executes forbidden dependency/package code ${pattern}`);
}

for (const needle of [
  "single protected GitHub approval",
  "npm-release",
  "publish.yml",
  "24.8.0",
  "11.6.0",
  "id-token: write",
  "contents: write",
  "no `NPM_TOKEN`",
  "Require two-factor authentication and disallow tokens",
  "npm publish",
  "GitHub Release",
  "state=approved",
  "blocks deletion and all updates",
  "GITHUB_SHA",
  "npm ci --ignore-scripts",
  "resum",
]) {
  if (!guide.includes(needle)) failures.push(`${guidePath}: missing ${JSON.stringify(needle)}`);
}

for (const [needle, label] of [
  ["npm pack", "npm tarball preparation"],
  ["CHANGELOG.md", "release notes source"],
  ["dist/manifest.json", "dist manifest asset"],
  ["SHA256SUMS", "checksum asset"],
  ["RELEASE_NOTES.md", "GitHub release notes asset"],
  ["metadata.json", "machine-readable release metadata"],
]) {
  if (!prepare.includes(needle)) failures.push(`${preparePath}: missing ${label}`);
}

if (existsSync(preparePath)) verifyPreparedAssets();

if (failures.length > 0) {
  console.error("Trusted publishing workflow check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Trusted publishing workflow check passed: one protected approval, direct OIDC npm publication, resumable GitHub Release creation, and no publish token.");

function verifyPreparedAssets() {
  const output = ".tmp/publish-workflow-check";
  rmSync(output, { recursive: true, force: true });
  const tag = `v${packageJson.version}`;
  const result = spawnSync(
    process.execPath,
    [preparePath, "--tag", tag, "--output", output],
    { encoding: "utf8", shell: false },
  );
  if (result.status !== 0) {
    const detail = result.error?.message ?? result.stderr ?? result.stdout ?? `status ${String(result.status)}`;
    failures.push(`${preparePath}: execution failed: ${detail.trim()}`);
    rmSync(output, { recursive: true, force: true });
    return;
  }

  try {
    const metadata = readJson(join(output, "metadata.json"));
    const tarballPath = join(output, metadata.tarball.name);
    const manifestPath = join(output, metadata.manifest.name);
    const checksums = readFileSync(join(output, metadata.checksums), "utf8");
    const notes = readFileSync(join(output, metadata.releaseNotes), "utf8");
    requirePrepared(metadata.package === packageJson.name, "package identity mismatch");
    requirePrepared(metadata.version === packageJson.version, "version mismatch");
    requirePrepared(metadata.tag === tag, "tag mismatch");
    requirePrepared(metadata.gitTarget === gitHead(), "git target mismatch");
    requirePrepared(sha256(readFileSync(tarballPath)) === metadata.tarball.sha256, "tarball SHA-256 mismatch");
    requirePrepared(sha256(readFileSync(manifestPath)) === metadata.manifest.sha256, "manifest SHA-256 mismatch");
    const checksumLines = checksums.trimEnd().split("\n");
    const checksumNames = checksumLines.map((line) => line.split(/\s+/).at(-1)).sort();
    requirePrepared(checksumLines.length === 2, "checksum file must contain exactly two entries");
    requirePrepared(JSON.stringify(checksumNames) === JSON.stringify([metadata.manifest.name, metadata.tarball.name].sort()), "checksum filename set mismatch");
    requirePrepared(checksums.includes(`${metadata.tarball.sha256}  ${metadata.tarball.name}`), "tarball checksum missing");
    requirePrepared(checksums.includes(`${metadata.manifest.sha256}  ${metadata.manifest.name}`), "manifest checksum missing");
    requirePrepared(notes.trim().length > 0, "release notes are empty");
  } catch (error) {
    failures.push(`${preparePath}: prepared asset verification failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}

function requirePrepared(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function gitHead() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error("could not resolve git HEAD");
  return result.stdout.trim();
}

function topLevelSection(startName, endName) {
  const startMatch = new RegExp(`^${startName}:\\s*$`, "m").exec(workflow);
  const endMatch = new RegExp(`^${endName}:\\s*`, "m").exec(workflow);
  if (startMatch === null || endMatch === null || endMatch.index <= startMatch.index) return "";
  return workflow.slice(startMatch.index + startMatch[0].length, endMatch.index);
}

function workflowSection(jobName) {
  const marker = `  ${jobName}:\n`;
  const start = workflow.indexOf(marker);
  if (start === -1) return "";
  const remainder = workflow.slice(start + marker.length);
  const nextJob = /^  [a-zA-Z0-9_-]+:\n/m.exec(remainder);
  return nextJob === null ? remainder : remainder.slice(0, nextJob.index);
}

function readText(path) {
  if (!existsSync(path)) {
    failures.push(`${path}: missing`);
    return "";
  }
  return readFileSync(path, "utf8");
}
