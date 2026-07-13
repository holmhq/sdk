import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { stableJson } from "./lib/artifacts.mjs";

const thresholds = {
  lines: 100,
  functions: 100,
  branches: 100,
};

rmSync("coverage", { recursive: true, force: true });
mkdirSync("coverage", { recursive: true });

const compile = spawnSync("npm", ["run", "test:source"], {
  stdio: "inherit",
  shell: false,
});
if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const args = [
  "--test",
  "--experimental-test-coverage",
  "--test-coverage-include=.tmp/test-source/src/**/*.js",
  `--test-coverage-lines=${thresholds.lines}`,
  `--test-coverage-functions=${thresholds.functions}`,
  `--test-coverage-branches=${thresholds.branches}`,
  ".tmp/test-source/test/source/core/index.test.js",
];
const coverage = spawnSync(process.execPath, args, {
  encoding: "utf8",
  shell: false,
});

process.stdout.write(coverage.stdout);
process.stderr.write(coverage.stderr);

const reportLines = coverage.stdout
  .split("\n")
  .filter((line) => line.startsWith("ℹ "))
  .filter((line) =>
    line.includes("coverage report") ||
    line.includes("---") ||
    line.includes("file") ||
    line.includes("index.js") ||
    line.includes("all files"),
  )
  .map((line) => line.replace(/^ℹ /, ""));

writeFileSync("coverage/coverage-summary.txt", `${reportLines.join("\n")}\n`);
writeFileSync(
  "coverage/coverage-summary.json",
  stableJson({
    schema: "holm.sdk.coverage-summary/1",
    command: `node ${args.join(" ")}`,
    include: ".tmp/test-source/src/**/*.js",
    thresholds,
    status: coverage.status === 0 ? "pass" : "fail",
  }),
);

if (coverage.status !== 0) {
  console.error("Coverage check failed. See coverage/coverage-summary.txt for the deterministic summary.");
  process.exit(coverage.status ?? 1);
}

console.log("Coverage check passed at 100% line/function/branch thresholds.");
