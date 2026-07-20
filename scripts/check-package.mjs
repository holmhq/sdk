import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { readJson } from "./lib/artifacts.mjs";

const packageJson = readJson("package.json");
const failures = [];
const expectedFiles = ["dist", "docs", "examples", "CHANGELOG.md", "LICENSE", "README.md"];

if (JSON.stringify(packageJson.files) !== JSON.stringify(expectedFiles)) {
  failures.push(`package.json files must be exactly ${JSON.stringify(expectedFiles)}`);
}
if (packageJson.name !== "@holmhq/sdk" || packageJson.version !== "0.2.0") {
  failures.push(`package identity must be @holmhq/sdk@0.2.0; found ${packageJson.name}@${packageJson.version}`);
}
if (packageJson.private === true) {
  failures.push("public release package must not be private");
}
if (packageJson.publishConfig?.access !== "public") {
  failures.push("scoped release package must set publishConfig.access to public");
}
if (packageJson.license !== "MIT") {
  failures.push(`release package license must be MIT; found ${String(packageJson.license)}`);
}
if (packageJson.dependencies !== undefined && Object.keys(packageJson.dependencies).length > 0) {
  failures.push("universal package must not add runtime dependencies for 0.2.0");
}
if (packageJson.scripts?.prepublishOnly !== "npm run release:check") {
  failures.push("prepublishOnly must run the canonical release gate");
}

const packed = spawnSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
  encoding: "utf8",
  shell: false,
});
if (packed.status !== 0) {
  process.stderr.write(packed.stderr);
  failures.push(`npm pack --dry-run failed with status ${String(packed.status)}`);
}

let report;
try {
  report = JSON.parse(packed.stdout)[0];
} catch {
  failures.push("npm pack --dry-run did not return parseable JSON");
}

if (report !== undefined) {
  const paths = report.files.map((file) => file.path).sort();
  const allowed = /^(?:package\.json|README\.md|LICENSE|CHANGELOG\.md|dist\/|docs\/|examples\/)/;
  const forbidden = paths.filter((path) => !allowed.test(path));
  if (forbidden.length > 0) {
    failures.push(`package contains internal files: ${forbidden.slice(0, 20).join(", ")}`);
  }

  for (const path of [
    "package.json",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "dist/index.js",
    "dist/index.d.ts",
    "dist/admin/index.js",
    "dist/admin/index.d.ts",
    "dist/holm.js",
    "dist/holm-web.js",
    "dist/manifest.json",
    "docs/admin.md",
    "docs/agent-guide.md",
    "docs/releasing.md",
    "docs/v0.2.md",
    "docs/vendoring.md",
    "examples/shared/session-contract.ts",
    "examples/react/src/main.tsx",
    "examples/vite/src/main.ts",
  ]) {
    if (!paths.includes(path)) {
      failures.push(`package is missing ${path}`);
    }
  }

  for (const [specifier, target] of Object.entries(packageJson.exports ?? {})) {
    if (specifier === "./package.json") {
      continue;
    }
    for (const kind of ["types", "import"]) {
      const path = target?.[kind]?.replace(/^\.\//, "");
      if (path === undefined || !paths.includes(path)) {
        failures.push(`${specifier} ${kind} target is absent from package: ${String(path)}`);
      }
    }
  }

  if (report.size > 1_000_000) {
    failures.push(`packed tarball ${report.size} bytes exceeds 1,000,000-byte release budget`);
  }
  if (report.unpackedSize > 5_000_000) {
    failures.push(`unpacked package ${report.unpackedSize} bytes exceeds 5,000,000-byte release budget`);
  }
}

if (failures.length === 0) {
  runInstalledPackageSmoke();
}

if (failures.length > 0) {
  console.error("Package release check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Package release check passed: ${report.entryCount ?? report.files.length} files, ${report.size} packed bytes, ${report.unpackedSize} unpacked bytes, installed export smoke green.`,
);

function runInstalledPackageSmoke() {
  const root = resolve(".tmp/package-smoke");
  const realNpmEnv = { ...process.env, npm_config_dry_run: "false" };
  const consumer = join(root, "consumer");
  rmSync(root, { recursive: true, force: true });
  mkdirSync(consumer, { recursive: true });

  const pack = spawnSync("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", root], {
    encoding: "utf8",
    env: realNpmEnv,
    shell: false,
  });
  if (pack.status !== 0) {
    failures.push(`npm pack smoke failed: ${pack.stderr.trim()}`);
    return;
  }

  let filename;
  try {
    filename = JSON.parse(pack.stdout)[0].filename;
  } catch {
    failures.push("npm pack smoke did not return parseable JSON");
    return;
  }

  writeFileSync(join(consumer, "package.json"), `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`);
  const install = spawnSync(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", join(root, filename)],
    { cwd: consumer, encoding: "utf8", env: realNpmEnv, shell: false },
  );
  if (install.status !== 0) {
    failures.push(`packed package install failed: ${install.stderr.trim()}`);
    return;
  }

  const smokeSource = `
    import { readFile } from "node:fs/promises";
    const specifiers = [
      "@holmhq/sdk",
      "@holmhq/sdk/core",
      "@holmhq/sdk/transports",
      "@holmhq/sdk/app",
      "@holmhq/sdk/admin",
      "@holmhq/sdk/web",
      "@holmhq/sdk/state",
      "@holmhq/sdk/node",
      "@holmhq/sdk/sobek",
      "@holmhq/sdk/bridge",
      "@holmhq/sdk/test",
    ];
    for (const specifier of specifiers) {
      const loaded = await import(specifier);
      if (Object.keys(loaded).length === 0) throw new Error(specifier + " has no exports");
    }
    const admin = await import("@holmhq/sdk/admin");
    if (typeof admin.createAdminClient !== "function" || admin.adminMethodDescriptors.length !== 216) {
      throw new Error("installed admin entry point is incomplete");
    }
    const packageJson = JSON.parse(await readFile(new URL("./node_modules/@holmhq/sdk/package.json", import.meta.url), "utf8"));
    if (packageJson.name !== "@holmhq/sdk" || packageJson.version !== "0.2.0") {
      throw new Error("installed package identity mismatch");
    }
  `;
  const smoke = spawnSync(process.execPath, ["--input-type=module", "--eval", smokeSource], {
    cwd: consumer,
    encoding: "utf8",
    shell: false,
  });
  if (smoke.status !== 0) {
    failures.push(`installed package export smoke failed: ${(smoke.stderr || smoke.stdout).trim()}`);
  }
}
