import { readJson } from "./lib/artifacts.mjs";

const summary = readJson("coverage/coverage-summary.json");

const thresholds = {
  statements: 98,
  lines: 98,
  functions: 98,
  branches: 95,
  changed_reachable: 98,
};

const metrics = summary.coverage;
const failures = [];

for (const [metric, threshold] of Object.entries(thresholds)) {
  const value = metrics?.[metric];
  if (!Number.isFinite(value)) {
    failures.push(`${metric} is missing`);
    continue;
  }
  if (value < threshold) {
    failures.push(`${metric} ${value.toFixed(2)}% is below ${threshold}%`);
  }
}

if (failures.length > 0) {
  console.error(`Coverage summary check failed: ${failures.join("; ")}`);
  process.exit(1);
}

console.log(
  `Coverage metrics: statements=${metrics.statements.toFixed(2)} lines=${metrics.lines.toFixed(2)} functions=${metrics.functions.toFixed(2)} branches=${metrics.branches.toFixed(2)} changed_reachable=${metrics.changed_reachable.toFixed(2)}`,
);
