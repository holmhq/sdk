import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";

import { readJson, stableJson } from "./lib/artifacts.mjs";

const options = parseArgs(process.argv.slice(2));
const packageJson = readJson("package.json");
const version = packageJson.version;
const releaseTag = options.tag ?? process.env.RELEASE_TAG;

if (typeof releaseTag !== "string" || releaseTag !== `v${version}`) {
  fail(`release tag must be v${version}; found ${JSON.stringify(releaseTag)}`);
}
if (!/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(releaseTag)) {
  fail(`release tag must be an exact vMAJOR.MINOR.PATCH tag; found ${releaseTag}`);
}

const output = resolve(options.output ?? ".tmp/release");
const temporaryRoot = resolve(".tmp");
if (output === temporaryRoot || !output.startsWith(`${temporaryRoot}${sep}`)) {
  fail(`release output must be a child of ${temporaryRoot}; found ${output}`);
}
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const pack = spawnSync(
  "npm",
  ["pack", "--json", "--ignore-scripts", "--pack-destination", output],
  {
    encoding: "utf8",
    env: { ...process.env, npm_config_dry_run: "false" },
    shell: false,
  },
);
if (pack.status !== 0) {
  process.stderr.write(pack.stderr);
  fail(`npm pack failed with status ${String(pack.status)}`);
}

let report;
try {
  const reports = JSON.parse(pack.stdout);
  if (!Array.isArray(reports) || reports.length !== 1) throw new Error("expected one package");
  report = reports[0];
} catch (error) {
  fail(`npm pack did not return one JSON package report: ${errorMessage(error)}`);
}

if (report.name !== packageJson.name || report.version !== version) {
  fail(`packed identity mismatch: ${String(report.name)}@${String(report.version)}`);
}

const tarballName = basename(report.filename);
const tarballPath = join(output, tarballName);
const manifestSource = "dist/manifest.json";
const manifest = readJson(manifestSource);
if (manifest.package?.name !== packageJson.name || manifest.package?.version !== version) {
  fail(`dist manifest identity mismatch: ${String(manifest.package?.name)}@${String(manifest.package?.version)}`);
}

const manifestName = "dist-manifest.json";
const manifestPath = join(output, manifestName);
copyFileSync(manifestSource, manifestPath);

const changelog = readFileSync("CHANGELOG.md", "utf8");
const releaseNotes = extractReleaseNotes(changelog, version);
const releaseNotesName = "RELEASE_NOTES.md";
writeFileSync(join(output, releaseNotesName), `${releaseNotes}\n`);

const tarballSha256 = sha256File(tarballPath);
const manifestSha256 = sha256File(manifestPath);
const checksumsName = "SHA256SUMS";
writeFileSync(
  join(output, checksumsName),
  `${tarballSha256}  ${tarballName}\n${manifestSha256}  ${manifestName}\n`,
);

const gitTarget = run("git", ["rev-parse", "HEAD"]);
const metadata = {
  schema: "holm.sdk.release-assets/1",
  package: packageJson.name,
  version,
  tag: releaseTag,
  gitTarget,
  tarball: {
    name: tarballName,
    bytes: report.size,
    unpackedBytes: report.unpackedSize,
    files: report.entryCount ?? report.files?.length,
    shasum: report.shasum,
    integrity: report.integrity,
    sha256: tarballSha256,
  },
  manifest: {
    name: manifestName,
    sha256: manifestSha256,
  },
  checksums: checksumsName,
  releaseNotes: releaseNotesName,
};
writeFileSync(join(output, "metadata.json"), stableJson(metadata));

console.log(stableJson(metadata).trimEnd());

function extractReleaseNotes(changelog, targetVersion) {
  const escaped = targetVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const heading = new RegExp(`^## ${escaped}(?:\\s+[—-]\\s+[^\\n]+)?\\s*$`, "m");
  const match = heading.exec(changelog);
  if (match === null) {
    fail(`CHANGELOG.md is missing a release heading for ${targetVersion}`);
  }

  const bodyStart = match.index + match[0].length;
  const remainder = changelog.slice(bodyStart).replace(/^\r?\n/, "");
  const nextHeading = /^##\s+/m.exec(remainder);
  const body = (nextHeading === null ? remainder : remainder.slice(0, nextHeading.index)).trim();
  if (body.length === 0) {
    fail(`CHANGELOG.md release ${targetVersion} has no notes`);
  }
  return body;
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--output" || argument === "--tag") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) fail(`${argument} requires a value`);
      parsed[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    fail(`unknown argument: ${argument}`);
  }
  return parsed;
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    fail(`${command} ${args.join(" ")} failed with status ${String(result.status)}`);
  }
  return result.stdout.trim();
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function fail(message) {
  console.error(`Release asset preparation failed: ${message}`);
  process.exit(1);
}
