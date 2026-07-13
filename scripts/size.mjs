import { gzipSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { readJson, sha256, stableJson } from "./lib/artifacts.mjs";

const budgets = new Map([
  ["dist/index.js", { rawBudget: 1024, gzipBudget: 512 }],
  ["dist/core/index.js", { rawBudget: 2048, gzipBudget: 768 }],
  ["dist/core/caller.js", { rawBudget: 6144, gzipBudget: 2048 }],
  ["dist/core/capabilities.js", { rawBudget: 10240, gzipBudget: 3072 }],
  ["dist/core/errors.js", { rawBudget: 6144, gzipBudget: 2048 }],
  ["dist/core/invoke.js", { rawBudget: 6144, gzipBudget: 2048 }],
  ["dist/core/runtime.js", { rawBudget: 1024, gzipBudget: 512 }],
  ["dist/core/wire-value.js", { rawBudget: 8192, gzipBudget: 2560 }],
]);
const targets = [...budgets].map(([path, budget]) => ({ path, ...budget }));

const packageJson = readJson("package.json");
const failures = [];
const artifacts = [];

for (const target of targets) {
  let source;
  try {
    source = readFileSync(target.path, "utf8");
  } catch {
    console.error(`Size check failed: ${target.path} is missing. Run npm run build first.`);
    process.exit(1);
  }

  const minified = minifyJavaScript(source);
  const gzip = gzipSync(minified, { level: 9, mtime: 0 });
  const record = {
    path: target.path,
    rawBytes: Buffer.byteLength(source),
    minifiedBytes: Buffer.byteLength(minified),
    gzipBytes: gzip.byteLength,
    sha256: sha256(Buffer.from(source)),
    budgets: {
      rawBytes: target.rawBudget,
      gzipBytes: target.gzipBudget,
    },
  };

  if (record.rawBytes > target.rawBudget) {
    failures.push(`${target.path}: raw ${record.rawBytes} bytes exceeds budget ${target.rawBudget}`);
  }
  if (record.gzipBytes > target.gzipBudget) {
    failures.push(`${target.path}: gzip ${record.gzipBytes} bytes exceeds budget ${target.gzipBudget}`);
  }
  artifacts.push(record);
}

const totals = artifacts.reduce(
  (acc, artifact) => ({
    rawBytes: acc.rawBytes + artifact.rawBytes,
    minifiedBytes: acc.minifiedBytes + artifact.minifiedBytes,
    gzipBytes: acc.gzipBytes + artifact.gzipBytes,
  }),
  { rawBytes: 0, minifiedBytes: 0, gzipBytes: 0 },
);

const report = {
  schema: "holm.sdk.size-report/1",
  package: {
    name: packageJson.name,
    version: packageJson.version,
  },
  artifacts,
  totals,
  status: failures.length === 0 ? "pass" : "fail",
};

mkdirSync("dist", { recursive: true });
writeFileSync("dist/size-report.json", stableJson(report));

if (failures.length > 0) {
  console.error("Size check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Size check passed: ${totals.rawBytes} raw / ${totals.minifiedBytes} minified / ${totals.gzipBytes} gzip bytes.`,
);

function minifyJavaScript(source) {
  let output = "";
  let quote = null;
  let escaped = false;
  let inBlockComment = false;
  let inLineComment = false;
  let pendingSpace = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1] ?? "";

    if (inLineComment) {
      if (char === "\n" || char === "\r") {
        inLineComment = false;
        pendingSpace = true;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
        pendingSpace = true;
      }
      continue;
    }

    if (quote) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      if (pendingSpace && needsSpace(output.at(-1), char)) {
        output += " ";
      }
      pendingSpace = false;
      quote = char;
      output += char;
      continue;
    }
    if (/\s/.test(char)) {
      pendingSpace = true;
      continue;
    }
    if (pendingSpace && needsSpace(output.at(-1), char)) {
      output += " ";
    }
    pendingSpace = false;
    output += char;
  }

  return output.trim();
}

function needsSpace(left, right) {
  return /[A-Za-z0-9_$]/.test(left ?? "") && /[A-Za-z0-9_$]/.test(right);
}
