import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { listFiles, stableJson } from "./lib/artifacts.mjs";

const thresholds = {
  statements: 98,
  lines: 98,
  functions: 98,
  branches: 95,
  changed_reachable: 98,
};

const coverageDir = "coverage";
const v8CoverageDir = ".tmp/coverage-v8";
const include = ".tmp/test-source/src/**/*.js";

rmSync(coverageDir, { recursive: true, force: true });
rmSync(v8CoverageDir, { recursive: true, force: true });
mkdirSync(coverageDir, { recursive: true });
mkdirSync(v8CoverageDir, { recursive: true });

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
  `--test-coverage-include=${include}`,
  `--test-coverage-lines=${thresholds.lines}`,
  `--test-coverage-functions=${thresholds.functions}`,
  `--test-coverage-branches=${thresholds.branches}`,
  ".tmp/test-source/test/source/core/index.test.js",
];
const coverage = spawnSync(process.execPath, args, {
  encoding: "utf8",
  env: {
    ...process.env,
    NODE_V8_COVERAGE: v8CoverageDir,
  },
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

const nativeMetrics = parseNativeCoverageMetrics(reportLines);
const coverageRecords = readV8Coverage(v8CoverageDir);
const generatedSourceFiles = listFiles(".tmp/test-source/src").filter((path) => path.endsWith(".js"));
const statementCoverage = measureStatementCoverage(generatedSourceFiles, coverageRecords);
const changedReachable = measureChangedReachable(generatedSourceFiles, coverageRecords);
const measuredCoverage = {
  statements: statementCoverage.percent,
  lines: nativeMetrics.lines,
  functions: nativeMetrics.functions,
  branches: nativeMetrics.branches,
  changed_reachable: changedReachable.percent,
};
const thresholdFailures = Object.entries(thresholds)
  .filter(([metric, threshold]) => measuredCoverage[metric] < threshold)
  .map(([metric, threshold]) => `${metric} ${formatPercent(measuredCoverage[metric])}% is below ${threshold}%`);
const status = coverage.status === 0 && thresholdFailures.length === 0 ? "pass" : "fail";
const metricLine = `metrics         | statements ${formatPercent(measuredCoverage.statements)} | lines ${formatPercent(measuredCoverage.lines)} | functions ${formatPercent(measuredCoverage.functions)} | branches ${formatPercent(measuredCoverage.branches)} | changed_reachable ${formatPercent(measuredCoverage.changed_reachable)}`;

writeFileSync("coverage/coverage-summary.txt", `${[...reportLines, metricLine].join("\n")}\n`);
writeFileSync(
  "coverage/coverage-summary.json",
  stableJson({
    schema: "holm.sdk.coverage-summary/2",
    command: `NODE_V8_COVERAGE=${v8CoverageDir} node ${args.join(" ")}`,
    include,
    thresholds,
    status,
    coverage: measuredCoverage,
    evidence: {
      changed_reachable_basis: changedReachable.basis,
      generated_files: generatedSourceFiles.length,
      reachable_source_files: changedReachable.reachable,
      statement_spans: statementCoverage.total,
      covered_statement_spans: statementCoverage.covered,
    },
  }),
);

if (coverage.status !== 0) {
  console.error("Coverage check failed. See coverage/coverage-summary.txt for the deterministic summary.");
  process.exit(coverage.status ?? 1);
}

if (thresholdFailures.length > 0) {
  console.error(`Coverage metrics failed: ${thresholdFailures.join("; ")}`);
  process.exit(1);
}

console.log(`Coverage metrics: statements=${formatPercent(measuredCoverage.statements)} lines=${formatPercent(measuredCoverage.lines)} functions=${formatPercent(measuredCoverage.functions)} branches=${formatPercent(measuredCoverage.branches)} changed_reachable=${formatPercent(measuredCoverage.changed_reachable)}`);
console.log("Coverage check passed at measured coverage thresholds.");

function parseNativeCoverageMetrics(lines) {
  const allFiles = lines.find((line) => line.trimStart().startsWith("all files"));
  if (!allFiles) {
    throw new Error("Node test coverage report did not include an all files row.");
  }
  const [, linePercent, branchPercent, functionPercent] = allFiles.split("|").map((part) => part.trim());
  return {
    lines: parseCoveragePercent(linePercent, "lines"),
    branches: parseCoveragePercent(branchPercent, "branches"),
    functions: parseCoveragePercent(functionPercent, "functions"),
  };
}

function parseCoveragePercent(value, metric) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Node test coverage report did not include ${metric} coverage.`);
  }
  return roundPercent(parsed);
}

function readV8Coverage(root) {
  const byPath = new Map();
  for (const path of listFiles(root).filter((file) => file.endsWith(".json"))) {
    const report = JSON.parse(readFileSync(path, "utf8"));
    for (const script of report.result ?? []) {
      if (typeof script.url !== "string" || !script.url.startsWith("file://")) {
        continue;
      }
      const filePath = relative(process.cwd(), fileURLToPath(script.url)).split("\\").join("/");
      if (!filePath.startsWith(".tmp/test-source/src/") || !filePath.endsWith(".js")) {
        continue;
      }
      const ranges = byPath.get(filePath) ?? [];
      for (const fn of script.functions ?? []) {
        for (const range of fn.ranges ?? []) {
          ranges.push(range);
        }
      }
      byPath.set(filePath, ranges);
    }
  }
  return byPath;
}

function measureStatementCoverage(files, coverageRecords) {
  let covered = 0;
  let total = 0;
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const spans = executableStatementSpans(sourceFile);
    const ranges = coverageRecords.get(file) ?? [];
    total += spans.length;
    covered += spans.filter((span) => isCoveredOffset(ranges, span.start)).length;
  }
  return {
    covered,
    total,
    percent: percent(covered, total),
  };
}

function executableStatementSpans(sourceFile) {
  const spans = [];
  visit(sourceFile);
  return spans;

  function visit(node) {
    if (isExecutableStatement(node)) {
      spans.push({ start: node.getStart(sourceFile), end: node.getEnd() });
    }
    ts.forEachChild(node, visit);
  }
}

function isExecutableStatement(node) {
  if (!ts.isStatement(node)) {
    return false;
  }
  switch (node.kind) {
    case ts.SyntaxKind.Block:
    case ts.SyntaxKind.EmptyStatement:
    case ts.SyntaxKind.FunctionDeclaration:
    case ts.SyntaxKind.ClassDeclaration:
    case ts.SyntaxKind.ImportDeclaration:
    case ts.SyntaxKind.ExportDeclaration:
    case ts.SyntaxKind.ExportAssignment:
      return false;
    default:
      return true;
  }
}

function isCoveredOffset(ranges, offset) {
  const containing = ranges
    .filter((range) => range.startOffset <= offset && offset < range.endOffset)
    .sort((a, b) => rangeSize(a) - rangeSize(b));
  return containing.length > 0 && containing[0].count > 0;
}

function rangeSize(range) {
  return range.endOffset - range.startOffset;
}

function measureChangedReachable(files, coverageRecords) {
  const authoredSources = listFiles("src").filter((path) => path.endsWith(".ts") && !path.endsWith(".d.ts"));
  const changedSources = changedSourceFiles(authoredSources);
  const basis = changedSources.length > 0 ? changedSources : authoredSources;
  const reachableSources = sourceFilesWithCoverage(files, coverageRecords);
  const reachable = basis.filter((source) => reachableSources.has(source)).length;
  return {
    basis: changedSources.length > 0 ? "changed" : "all",
    reachable,
    total: basis.length,
    percent: percent(reachable, basis.length),
  };
}

function changedSourceFiles(authoredSources) {
  const status = spawnSync("git", ["status", "--short", "--untracked-files=all", "--", "src"], {
    encoding: "utf8",
    shell: false,
  });
  if (status.status !== 0) {
    return [];
  }
  const authored = new Set(authoredSources);
  return status.stdout
    .split("\n")
    .map((line) => line.slice(3).trim())
    .map((path) => path.replace(/^"|"$/g, "").split("\\").join("/"))
    .filter((path) => authored.has(path));
}

function sourceFilesWithCoverage(files, coverageRecords) {
  const sources = new Set();
  for (const file of files) {
    if (!coverageRecords.has(file)) {
      continue;
    }
    const mapPath = `${file}.map`;
    const map = JSON.parse(readFileSync(mapPath, "utf8"));
    for (const source of map.sources ?? []) {
      sources.add(relative(process.cwd(), resolve(dirname(file), source)).split("\\").join("/"));
    }
  }
  return sources;
}

function percent(covered, total) {
  return total === 0 ? 100 : roundPercent((covered / total) * 100);
}

function roundPercent(value) {
  return Number(value.toFixed(2));
}

function formatPercent(value) {
  return value.toFixed(2);
}
