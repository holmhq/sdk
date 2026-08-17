import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const mapPath = "koder/evidence/009_holm_non_http_parity/non-http-parity.json";
const schema = "holm.sdk.non-http-parity/1";
const lanes = ["websocket", "sobek", "node", "action-schema"];
const authorities = ["implementation", "sdk-implementation", "offline-fixture", "converged-design", "negative-evidence"];
const holmStatuses = ["current", "conditional", "fixture-only", "design-only", "absent", "superseded", "sdk-only"];
const dispositions = ["adopted", "redesigned", "deferred", "excluded"];
const sdkStatuses = ["current", "partial", "candidate", "none", "unsupported"];
const sourceRepositories = ["holm", "sdk"];
const requiredEntryStrings = ["surface", "auth", "wire", "lifecycle", "availability", "rationale"];

export function nonHttpParityIdentity(entry) {
  return `${entry?.lane ?? ""}\u0000${entry?.id ?? ""}`;
}

export function summarizeNonHttpParity(entries) {
  const summary = {
    entry_count: Array.isArray(entries) ? entries.length : 0,
    lanes: zeroCounts(lanes),
    authority: zeroCounts(authorities),
    holm_status: zeroCounts(holmStatuses),
    disposition: zeroCounts(dispositions),
    sdk_status: zeroCounts(sdkStatuses),
  };
  if (!Array.isArray(entries)) return summary;
  for (const entry of entries) {
    incrementKnown(summary.lanes, entry?.lane);
    incrementKnown(summary.authority, entry?.authority);
    incrementKnown(summary.holm_status, entry?.holm_status);
    incrementKnown(summary.disposition, entry?.disposition);
    incrementKnown(summary.sdk_status, entry?.sdk_status);
  }
  return summary;
}

export function validateNonHttpParity(document) {
  const errors = [];
  if (!isRecord(document)) return { errors: ["non-HTTP parity map must be an object"], summary: summarizeNonHttpParity([]) };

  if (document.schema !== schema) errors.push(`non-HTTP parity schema must be ${schema}`);
  if (!sameJson(document.identity_fields, ["lane", "id"])) errors.push("identity fields must be lane + id");
  validateProvenance(document, errors);
  const sourceKeys = validateSources(document.sources, errors);
  validateAbsentPaths(document.sdk_baseline?.absent_paths, errors);

  const entries = Array.isArray(document.entries) ? document.entries : [];
  if (!Array.isArray(document.entries)) errors.push("non-HTTP parity entries must be an array");
  const identities = new Set();
  const referencedSources = new Set();
  let previousOrder = undefined;

  for (const [index, entry] of entries.entries()) {
    const label = isRecord(entry) && typeof entry.id === "string" ? entry.id : `entry ${index}`;
    if (!isRecord(entry)) {
      errors.push(`entry ${index} must be an object`);
      continue;
    }

    validateVocabulary(entry, label, errors);
    if (typeof entry.id !== "string" || entry.id.trim() === "") {
      errors.push(`entry ${index} must have a non-empty id`);
    } else if (typeof entry.lane === "string" && !entry.id.startsWith(`${entry.lane}:`)) {
      errors.push(`${label} id must begin with ${entry.lane}:`);
    }

    const identity = nonHttpParityIdentity(entry);
    if (identities.has(identity)) errors.push(`duplicate entry identity ${displayIdentity(entry)}`);
    identities.add(identity);

    const order = entryOrder(entry);
    if (previousOrder !== undefined && compareOrder(previousOrder, order) >= 0) {
      errors.push(`entries must be ordered by lane then id at ${displayIdentity(entry)}`);
    }
    previousOrder = order;

    for (const field of requiredEntryStrings) {
      if (typeof entry[field] !== "string" || entry[field].trim() === "") {
        errors.push(`${label} ${field} must be a non-empty string`);
      }
    }
    validateSortedStringArray(entry.operations, `${label} operations`, errors, true);
    validateSortedStringArray(entry.evidence, `${label} evidence`, errors, true);

    for (const reference of stringArray(entry.evidence)) {
      referencedSources.add(reference);
      if (!sourceKeys.has(reference)) errors.push(`${label} has unknown source reference ${reference}`);
    }
    validateEntrySemantics(entry, label, errors);
  }

  for (const lane of lanes) {
    if (!entries.some((entry) => entry?.lane === lane)) errors.push(`required lane ${lane} has no entries`);
  }
  for (const sourceKey of sourceKeys) {
    if (!referencedSources.has(sourceKey)) errors.push(`source ${sourceKey} is not referenced by any entry`);
  }

  const summary = summarizeNonHttpParity(entries);
  if (!isRecord(document.expected)) {
    errors.push("expected non-HTTP parity summary is missing");
  } else if (!sameJson(document.expected, summary)) {
    errors.push(`non-HTTP parity summary drifted: expected ${JSON.stringify(document.expected)}, received ${JSON.stringify(summary)}`);
  }

  return { errors, summary };
}

export function verifySdkSources(document, sdkRoot = process.cwd()) {
  const errors = [];
  const root = resolve(sdkRoot);
  const baseline = document?.sdk_baseline?.commit;
  const sdkSources = (document?.sources ?? []).filter(
    (source) => source?.repository === "sdk" && typeof source.path === "string",
  );
  for (const source of sdkSources) verifyFileHash(root, source.path, source.sha256, "SDK", errors);
  for (const path of document?.sdk_baseline?.absent_paths ?? []) {
    if (typeof path === "string" && existsSync(resolveInside(root, path))) {
      errors.push(`SDK path expected absent now exists: ${path}`);
    }
  }

  const packagePath = resolve(root, "package.json");
  if (existsSync(packagePath)) {
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    if (packageJson.version !== document?.sdk_baseline?.version) {
      errors.push(`SDK version ${packageJson.version} does not match mapped baseline ${document?.sdk_baseline?.version}`);
    }
  } else {
    errors.push("SDK package.json is missing");
  }

  if (/^[0-9a-f]{40}$/.test(baseline ?? "")) {
    try {
      runGit(root, ["cat-file", "-e", `${baseline}^{commit}`]);
      for (const source of sdkSources) {
        const actual = createHash("sha256").update(readGitFile(root, baseline, source.path)).digest("hex");
        if (actual !== source.sha256) {
          errors.push(`SDK baseline source hash drifted for ${source.path}: expected ${source.sha256}, received ${actual}`);
        }
      }
    } catch (error) {
      errors.push(`cannot verify SDK baseline ${baseline}: ${errorMessage(error)}`);
    }
  }
  return errors;
}

export function verifyPinnedHolmSources(document, holmRoot) {
  const errors = [];
  const root = resolve(holmRoot);
  if (!existsSync(root) || !statSync(root).isDirectory()) return [`Holm root is not a directory: ${root}`];

  const commit = document?.source?.holm_commit;
  try {
    runGit(root, ["cat-file", "-e", `${commit}^{commit}`]);
    const describe = runGit(root, ["describe", "--tags", "--always", commit]);
    if (describe !== document?.source?.holm_describe) {
      errors.push(`pinned Holm describe ${describe} does not match mapped ${document?.source?.holm_describe}`);
    }
    const version = JSON.parse(readGitFile(root, commit, "version.json").toString("utf8")).version;
    if (version !== document?.source?.holm_version_marker) {
      errors.push(`pinned Holm version marker ${version} does not match mapped ${document?.source?.holm_version_marker}`);
    }
  } catch (error) {
    errors.push(`cannot inspect pinned Holm provenance: ${errorMessage(error)}`);
    return errors;
  }

  for (const source of document?.sources ?? []) {
    if (source?.repository !== "holm" || typeof source.path !== "string") continue;
    try {
      const actual = createHash("sha256").update(readGitFile(root, commit, source.path)).digest("hex");
      if (actual !== source.sha256) {
        errors.push(`pinned Holm source hash drifted for ${source.path}: expected ${source.sha256}, received ${actual}`);
      }
    } catch (error) {
      errors.push(`cannot read pinned Holm source ${source.path}: ${errorMessage(error)}`);
    }
  }
  return errors;
}

export function verifyLiveHolmSources(document, holmRoot) {
  const errors = [];
  const root = resolve(holmRoot);
  if (!existsSync(root) || !statSync(root).isDirectory()) return [`Holm root is not a directory: ${root}`];

  try {
    const head = runGit(root, ["rev-parse", "HEAD"]);
    if (head !== document?.source?.holm_commit) errors.push(`live Holm HEAD ${head} does not match mapped commit ${document?.source?.holm_commit}`);
    const status = runGit(root, ["status", "--porcelain=v1", "--untracked-files=no"]);
    if (status !== "") errors.push("live Holm tracked tree is dirty");
    const describe = runGit(root, ["describe", "--tags", "--always"]);
    if (describe !== document?.source?.holm_describe) {
      errors.push(`live Holm describe ${describe} does not match mapped ${document?.source?.holm_describe}`);
    }
  } catch (error) {
    errors.push(`cannot inspect live Holm Git provenance: ${errorMessage(error)}`);
  }

  const versionPath = resolve(root, "version.json");
  if (!existsSync(versionPath)) {
    errors.push("live Holm version.json is missing");
  } else {
    try {
      const version = JSON.parse(readFileSync(versionPath, "utf8")).version;
      if (version !== document?.source?.holm_version_marker) {
        errors.push(`live Holm version marker ${version} does not match mapped ${document?.source?.holm_version_marker}`);
      }
    } catch (error) {
      errors.push(`cannot read live Holm version marker: ${errorMessage(error)}`);
    }
  }

  for (const source of document?.sources ?? []) {
    if (source?.repository !== "holm" || typeof source.path !== "string") continue;
    verifyFileHash(root, source.path, source.sha256, "Holm", errors);
  }
  return errors;
}

function validateProvenance(document, errors) {
  const source = document.source;
  if (!isRecord(source)) {
    errors.push("Holm source provenance is missing");
  } else {
    if (source.repository !== "holmhq/holm") errors.push("Holm source repository must be holmhq/holm");
    if (typeof source.holm_version_marker !== "string" || source.holm_version_marker.trim() === "") {
      errors.push("Holm version marker is missing");
    }
    if (!/^[0-9a-f]{40}$/.test(source.holm_commit ?? "")) errors.push("Holm commit must be a full lowercase SHA-1");
    if (typeof source.holm_describe !== "string" || source.holm_describe.trim() === "") errors.push("Holm describe provenance is missing");
    if (source.tracked_tree_clean !== true) errors.push("Holm source must record a clean tracked tree");
  }

  const sdk = document.sdk_baseline;
  if (!isRecord(sdk)) {
    errors.push("SDK baseline provenance is missing");
  } else {
    if (sdk.repository !== "holmhq/sdk") errors.push("SDK baseline repository must be holmhq/sdk");
    if (typeof sdk.version !== "string" || sdk.version.trim() === "") errors.push("SDK baseline version is missing");
    if (!/^[0-9a-f]{40}$/.test(sdk.commit ?? "")) errors.push("SDK baseline commit must be a full lowercase SHA-1");
  }
}

function validateSources(value, errors) {
  const keys = new Set();
  if (!Array.isArray(value) || value.length === 0) {
    errors.push("source manifest must be a non-empty array");
    return keys;
  }
  let previous = "";
  for (const [index, source] of value.entries()) {
    if (!isRecord(source)) {
      errors.push(`source ${index} must be an object`);
      continue;
    }
    if (!sourceRepositories.includes(source.repository)) errors.push(`source ${index} has unknown repository ${JSON.stringify(source.repository)}`);
    if (!isSafeRelativePath(source.path)) errors.push(`source ${index} has invalid relative path ${JSON.stringify(source.path)}`);
    if (!/^[0-9a-f]{64}$/.test(source.sha256 ?? "")) errors.push(`source ${index} has malformed SHA-256`);
    const key = sourceKey(source);
    if (keys.has(key)) errors.push(`duplicate source identity ${key}`);
    keys.add(key);
    if (previous !== "" && previous.localeCompare(key) >= 0) errors.push(`sources must be ordered by repository then path at ${key}`);
    previous = key;
  }
  return keys;
}

function validateAbsentPaths(value, errors) {
  validateSortedStringArray(value, "SDK absent_paths", errors, false);
  for (const path of stringArray(value)) {
    if (!isSafeRelativePath(path)) errors.push(`SDK absent path is invalid: ${JSON.stringify(path)}`);
  }
}

function validateVocabulary(entry, label, errors) {
  if (!lanes.includes(entry.lane)) errors.push(`${label} has unknown lane ${JSON.stringify(entry.lane)}`);
  if (!authorities.includes(entry.authority)) errors.push(`${label} has unknown authority ${JSON.stringify(entry.authority)}`);
  if (!holmStatuses.includes(entry.holm_status)) errors.push(`${label} has unknown Holm status ${JSON.stringify(entry.holm_status)}`);
  if (!dispositions.includes(entry.disposition)) errors.push(`${label} has unknown disposition ${JSON.stringify(entry.disposition)}`);
  if (!sdkStatuses.includes(entry.sdk_status)) errors.push(`${label} has unknown SDK status ${JSON.stringify(entry.sdk_status)}`);
}

function validateEntrySemantics(entry, label, errors) {
  const evidence = stringArray(entry.evidence);
  const hasHolmEvidence = evidence.some((value) => value.startsWith("holm:"));
  const hasSdkEvidence = evidence.some((value) => value.startsWith("sdk:"));

  if (["current", "conditional"].includes(entry.holm_status) && entry.authority !== "implementation") {
    errors.push(`${label} current Holm behavior must use implementation authority`);
  }
  if (entry.holm_status === "fixture-only" && entry.authority !== "offline-fixture") {
    errors.push(`${label} fixture-only behavior must use offline-fixture authority`);
  }
  if (entry.holm_status === "design-only" && entry.authority !== "converged-design") {
    errors.push(`${label} design-only behavior must use converged-design authority`);
  }
  if (entry.holm_status === "sdk-only" && entry.authority !== "sdk-implementation") {
    errors.push(`${label} sdk-only behavior must use sdk-implementation authority`);
  }
  if (["current", "conditional", "fixture-only", "design-only", "absent", "superseded"].includes(entry.holm_status) && !hasHolmEvidence) {
    errors.push(`${label} Holm status requires Holm evidence`);
  }
  if (["current", "partial"].includes(entry.sdk_status) && !hasSdkEvidence) {
    errors.push(`${label} implemented SDK status requires SDK evidence`);
  }
  if (entry.sdk_status === "candidate" && entry.disposition === "excluded") {
    errors.push(`${label} excluded disposition cannot be an SDK candidate`);
  }
  if (entry.disposition === "excluded" && !["none", "unsupported"].includes(entry.sdk_status)) {
    errors.push(`${label} excluded disposition requires none or unsupported SDK status`);
  }
  if (entry.disposition === "deferred" && !["none", "unsupported"].includes(entry.sdk_status)) {
    errors.push(`${label} deferred disposition requires none or unsupported SDK status`);
  }
}

function validateSortedStringArray(value, label, errors, nonEmpty) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return;
  }
  if (nonEmpty && value.length === 0) errors.push(`${label} must not be empty`);
  if (value.some((entry) => typeof entry !== "string" || entry.trim() === "")) errors.push(`${label} must contain only non-empty strings`);
  if (new Set(value).size !== value.length) errors.push(`${label} must not contain duplicates`);
  const sorted = [...value].sort((left, right) => String(left).localeCompare(String(right)));
  if (!sameJson(value, sorted)) errors.push(`${label} must be sorted`);
}

function entryOrder(entry) {
  return [lanes.indexOf(entry?.lane), typeof entry?.id === "string" ? entry.id : ""];
}

function compareOrder(left, right) {
  if (left[0] !== right[0]) return left[0] - right[0];
  return left[1].localeCompare(right[1]);
}

function displayIdentity(entry) {
  return `${entry?.lane ?? "?"}:${entry?.id ?? "?"}`;
}

function sourceKey(source) {
  return `${source?.repository ?? ""}:${source?.path ?? ""}`;
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.trim() === "" || isAbsolute(value)) return false;
  const normalized = normalize(value);
  return normalized === value && normalized !== ".." && !normalized.startsWith(`..${sep}`);
}

function verifyFileHash(root, path, expected, label, errors) {
  let target;
  try {
    target = resolveInside(root, path);
  } catch (error) {
    errors.push(`${label} source path is invalid: ${path} (${errorMessage(error)})`);
    return;
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    errors.push(`${label} source is missing: ${path}`);
    return;
  }
  const actual = createHash("sha256").update(readFileSync(target)).digest("hex");
  if (actual !== expected) errors.push(`${label} source hash drifted for ${path}: expected ${expected}, received ${actual}`);
}

function resolveInside(root, path) {
  if (!isSafeRelativePath(path)) throw new Error("path must be normalized and relative");
  const target = resolve(root, path);
  if (target !== root && !target.startsWith(`${root}${sep}`)) throw new Error("path escapes root");
  return target;
}

function runGit(root, args) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function readGitFile(root, commit, path) {
  return execFileSync("git", ["-C", root, "show", `${commit}:${path}`], { stdio: ["ignore", "pipe", "pipe"] });
}

function zeroCounts(values) {
  return Object.fromEntries(values.map((value) => [value, 0]));
}

function incrementKnown(record, key) {
  if (Object.hasOwn(record, key)) record[key] += 1;
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string" && entry.trim() !== "") : [];
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function parseCli(argv) {
  let mode = "check";
  let holmRoot = process.env.HOLM_ROOT ?? resolve(homedir(), "Projects/holmhq/holm/master");
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") {
      mode = "check";
    } else if (arg === "--check-pinned") {
      mode = "check-pinned";
    } else if (arg === "--check-live") {
      mode = "check-live";
    } else if (arg === "--holm-root") {
      const value = argv[index + 1];
      if (value === undefined) throw new Error("--holm-root requires a path");
      holmRoot = value;
      index += 1;
    } else {
      throw new Error(`unknown argument ${arg}`);
    }
  }
  return { mode, holmRoot };
}

function runCli() {
  let options;
  try {
    options = parseCli(process.argv.slice(2));
  } catch (error) {
    console.error(`Holm non-HTTP parity check failed: ${errorMessage(error)}`);
    process.exitCode = 1;
    return;
  }

  const bytes = readFileSync(mapPath, "utf8");
  const document = JSON.parse(bytes);
  const result = validateNonHttpParity(document);
  const canonical = `${JSON.stringify(document, null, 2)}\n`;
  if (canonical !== bytes) result.errors.push(`${mapPath} is not canonical two-space JSON with one trailing newline`);
  result.errors.push(...verifySdkSources(document));
  if (options.mode === "check-pinned" || options.mode === "check-live") {
    result.errors.push(...verifyPinnedHolmSources(document, options.holmRoot));
  }
  if (options.mode === "check-live") result.errors.push(...verifyLiveHolmSources(document, options.holmRoot));

  if (result.errors.length > 0) {
    console.error("Holm non-HTTP parity check failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  const laneSummary = lanes.map((lane) => `${lane}=${result.summary.lanes[lane]}`).join(", ");
  const provenance = options.mode === "check-live"
    ? "; pinned and live Holm provenance matched"
    : options.mode === "check-pinned"
      ? "; pinned Holm provenance matched"
      : "";
  console.log(`Holm non-HTTP parity check passed: ${result.summary.entry_count} entries (${laneSummary})${provenance}.`);
}

const invokedPath = process.argv[1] === undefined ? "" : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) runCli();
