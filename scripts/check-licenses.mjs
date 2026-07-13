import { mkdirSync, writeFileSync } from "node:fs";

import { readJson, stableJson } from "./lib/artifacts.mjs";

const allowedLicenses = new Set([
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MIT",
  "Python-2.0",
  "Unlicense",
]);

const packageJson = readJson("package.json");
const lockfile = readJson("package-lock.json");
const failures = [];

if (packageJson.private !== true) {
  failures.push(`${packageJson.name}: package must remain private`);
}
if (packageJson.license !== "MIT") {
  failures.push(`${packageJson.name}: expected MIT license, found ${String(packageJson.license)}`);
}

const packages = Object.entries(lockfile.packages ?? {})
  .filter(([path]) => path.startsWith("node_modules/"))
  .map(([path, meta]) => {
    const name = path.replace(/^node_modules\//, "");
    const license = String(meta.license ?? "");
    const allowed = allowedLicenses.has(license);
    if (!allowed) {
      failures.push(`${name}: license ${license || "<missing>"} is not in the MIT-compatible allowlist`);
    }
    return {
      name,
      version: meta.version ?? null,
      license: license || null,
      allowed,
      dev: meta.dev === true,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const report = {
  schema: "holm.sdk.license-report/1",
  package: {
    name: packageJson.name,
    version: packageJson.version,
    license: packageJson.license,
    private: packageJson.private === true,
  },
  allowedLicenses: [...allowedLicenses].sort(),
  packages,
  status: failures.length === 0 ? "pass" : "fail",
};

mkdirSync("dist", { recursive: true });
writeFileSync("dist/license-report.json", stableJson(report));

if (failures.length > 0) {
  console.error("License check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`License check passed for ${packages.length} locked package(s).`);
