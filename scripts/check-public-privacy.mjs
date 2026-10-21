import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, readlinkSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Generic syntax only: never put private examples or a private source map here.
const patterns = [
  ["server package path", /\b(?:internal\/[a-z][\w-]*\/|cmd\/server\b)[^\s`"'<>)]*/gi],
  ["Go source path", /[\w./{}*-]+\.go\b/gi],
  ["Go declaration", /\b(?:func\s+(?:\([^)]*\)\s*)?\w+|type\s+\w+\s+(?:struct|interface))\b/g],
  ["routing implementation identifier", /["']?source_group["']?\s*[:=]\s*["'][^"']+["']/g],
  ["Go implementation symbol", /(?<![\w.])(?:[A-Z]\w*(?:Handler|Resolver|Registry)|[a-z]\w*(?:HTTPRoutes|RouteTable))\s*\(\)|`[A-Z]\w*(?:Handler|Resolver)`|\b\w+\.(?:Success|MimeType|FileUpload)\b/g],
  ["private checkout location", /(?:~|\/home\/[^\s/]+)\/Projects\/holmhq\/holm\b[^\s`"']*/g],
];
const shaPattern = /\b(?:[a-f\d]{40}|[a-f\d]{7,12})\b/gi;

// Narrow exceptions, not whole-file exclusions. SDK commit ownership is checked
// against this repository's object database; Actions pins and npm checksums are
// allowed only in their documented syntax and file locations.
const publicProjectPins = new Map([
  ["koder/projects/003_sobek/INDEX.md", ["380e2888d9cf87d4467a3c41162f69f7e34a6328"]],
  ["koder/docs/EXECUTION.md", ["fe81675", "b0c8f10", "ac12e76"]],
  ["koder/projects/005_medialab/INDEX.md", ["fe81675", "b0c8f10", "b79d7044fda874a7e739e2021d8d07ecdab1e516"]],
  ["koder/projects/004_cdn/INDEX.md", ["9a7a089cadc57f338f393ec56e1460cbd725b0ce"]],
  ["koder/analysis/001_q002_orchestration_efficiency/INDEX.md", ["c4d3c877b686980aef526e37d4cf32dab61f7792"]],
]);
const actionPins = [
  "9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0",
  "820762786026740c76f36085b0efc47a31fe5020",
  "ea165f8d65b6e75b540449e92b4886f43607fa02",
  "d3f86a106a0bac45b974a628896c90dbdf5c8093",
];
const actionPinFiles = new Set([
  ".github/workflows/publish.yml", "scripts/check-publish-workflow.mjs",
  "koder/reviews/065_npm_trusted_publishing_review/INDEX.md",
  "test/tooling/check-public-privacy.test.mjs",
]);
function permittedSha(path, line, sha, sdkCommit) {
  if (sdkCommit(sha)) return true;
  if (publicProjectPins.get(path)?.includes(sha)) return true;
  if (actionPinFiles.has(path) && actionPins.includes(sha)) return true;
  // The guard must declare its exact public SHA exceptions, not a private list.
  if (path === "scripts/check-public-privacy.mjs" && (actionPins.includes(sha) || [...publicProjectPins.values()].some((pins) => pins.includes(sha)))) return true;
  if (!path.startsWith("koder/evidence/")) return false;
  const checksum = /(?:registry_shasum:\s*|(?:npm (?:shasum|SHA-1)|Registry SHA-1)\s*(?:is\s*)?`?)([a-f\d]{40})/i.exec(line);
  return checksum?.[1] === sha;
}

export function scanText(path, text, sdkCommit = () => false) {
  const errors = [];
  const lines = text.split(/\r?\n/);
  const holmJsonSource = /"repository"\s*:\s*"holmhq\/holm"/.test(text);
  for (const [index, line] of lines.entries()) {
    for (const [label, pattern] of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) errors.push(`${path}:${index + 1}: ${label}`);
    }
    for (const match of line.matchAll(shaPattern)) {
      const sha = match[0];
      // Avoid treating numeric counts, UUID fragments or larger content hashes
      // as commit identities. Context spans lines for wrapped prose/metadata.
      if (/[\w-]/.test(line[match.index - 1] ?? "") || /[\w-]/.test(line[match.index + sha.length] ?? "")) continue;
      const context = lines.slice(Math.max(0, index - 2), index + 2).join("\n");
      const attributed = sha.length === 40 || /\bholm\b|\bholm[_-](?:commit|baseline|head|authority)|source_commit/i.test(context)
        || (holmJsonSource && /"commit"\s*:/.test(line));
      const numericCount = !/[a-f]/i.test(sha) && !/(?:commit|baseline|\bHEAD|\bat\b|\bpin(?:ned)?\b)/i.test(line);
      if (attributed && !numericCount && !permittedSha(path, line, sha, sdkCommit)) {
        errors.push(`${path}:${index + 1}: private commit provenance`);
      }
    }
  }
  return errors;
}

export function checkTrackedFiles(root = process.cwd()) {
  const files = execFileSync("git", ["ls-files", "-z", "--cached"], { cwd: root }).toString().split("\0").filter(Boolean);
  const cache = new Map();
  const sdkCommit = (sha) => {
    if (!cache.has(sha)) {
      try {
        execFileSync("git", ["rev-parse", "--verify", `${sha}^{commit}`], { cwd: root, stdio: "pipe" });
        cache.set(sha, true);
      } catch { cache.set(sha, false); }
    }
    return cache.get(sha);
  };
  const errors = [];
  let count = 0;
  for (const path of new Set(files)) {
    const target = resolve(root, path);
    let stat;
    try { stat = lstatSync(target); } catch (error) {
      if (error.code === "ENOENT") continue; // Tracked deletion in the current tree.
      throw error;
    }
    if (stat.isDirectory()) throw new Error(`cannot scan tracked directory ${path}`);
    // Inspect link text, never the target (which may be outside this public repo).
    const text = stat.isSymbolicLink() ? readlinkSync(target) : readFileSync(target).toString("utf8");
    errors.push(...scanText(path, path, sdkCommit), ...scanText(path, text, sdkCommit));
    count += 1;
  }
  return { errors, count };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { errors, count } = checkTrackedFiles();
    if (errors.length) {
      console.error(`Public privacy check failed (${errors.length} findings):\n${errors.join("\n")}`);
      process.exitCode = 1;
    } else console.log(`Public privacy check passed: ${count} tracked file${count === 1 ? "" : "s"}.`);
  } catch (error) {
    console.error(`Public privacy check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
