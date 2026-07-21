import { readFileSync } from "node:fs";

const workflowPath = ".github/workflows/ci.yml";
const packagePath = "package.json";
const workflow = readFileSync(workflowPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const failures = [];
const compatibilityJob = workflowSection("node-20-runtime");

if (packageJson.engines?.node !== ">=20") {
  failures.push(`${packagePath}: expected the supported Node range to remain >=20`);
}
if (packageJson.scripts?.["test:ci-workflow"] !== "node scripts/check-ci-workflow.mjs") {
  failures.push(`${packagePath}: must expose the canonical test:ci-workflow script`);
}
if (!(packageJson.scripts?.ci ?? "").includes("npm run test:ci-workflow")) {
  failures.push(`${packagePath}: canonical CI must run test:ci-workflow`);
}

for (const [needle, label] of [
  ["node-version: \"24\"", "canonical Node 24 source gate"],
  ["name: Shipped package compatibility on Node 20", "Node 20 compatibility job name"],
]) {
  if (!workflow.includes(needle)) failures.push(`${workflowPath}: missing ${label}`);
}

if (compatibilityJob === "") {
  failures.push(`${workflowPath}: missing node-20-runtime job`);
} else {
  for (const [needle, label] of [
    ["runs-on: ubuntu-latest", "GitHub-hosted runner"],
    ["actions/checkout@v4", "repository checkout"],
    ["actions/setup-node@v4", "Node setup"],
    ["node-version: \"20\"", "declared minimum Node major"],
    ["npm run test:dist", "tracked distribution test"],
    ["npm run test:package", "packed consumer smoke"],
  ]) {
    if (!compatibilityJob.includes(needle)) {
      failures.push(`${workflowPath}: Node 20 compatibility job is missing ${label}`);
    }
  }

  for (const [pattern, label] of [
    [/continue-on-error:\s*true/, "allowed failure"],
    [/npm ci\b/, "development dependency installation"],
    [/npm run (?:build|release:check)\b/, "source build/release gate"],
    [/id-token:\s*write|contents:\s*write|secrets\./, "write or secret authority"],
  ]) {
    if (pattern.test(compatibilityJob)) {
      failures.push(`${workflowPath}: Node 20 compatibility job contains forbidden ${label}`);
    }
  }
}

if (failures.length > 0) {
  console.error("CI workflow check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CI workflow check passed: canonical source validation uses Node 24 and shipped artifacts are exercised on the declared Node 20 minimum without development dependencies.");

function workflowSection(jobName) {
  const marker = `  ${jobName}:\n`;
  const start = workflow.indexOf(marker);
  if (start === -1) return "";
  const remainder = workflow.slice(start + marker.length);
  const nextJob = /^  [a-zA-Z0-9_-]+:\n/m.exec(remainder);
  return nextJob === null ? remainder : remainder.slice(0, nextJob.index);
}
