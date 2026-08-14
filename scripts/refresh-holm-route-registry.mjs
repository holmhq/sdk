import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SNAPSHOT_PATH = "koder/evidence/007_holm_v0207_route_registry/route-registry.json";
const REGISTRY_SCHEMA = "holm.route-registry.v1";
const HOLM_ARGUMENTS = Object.freeze(["api", "routes", "--format", "json"]);
const SURFACE_CLASSES = new Set(["admin/operator", "app-facing", "system/public"]);
const STABILITIES = new Set(["stable", "preview", "internal"]);
const HTTP_METHODS = new Set(["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]);
const ENVELOPE_KEYS = Object.freeze(["ok", "data", "meta", "error"]);
const DATA_KEYS = Object.freeze(["schema", "holm_version", "holm_commit", "routes"]);
const META_KEYS = Object.freeze(["command"]);
const ROUTE_KEYS = Object.freeze([
  "method",
  "path",
  "auth_scope",
  "surface_class",
  "stability",
  "lane",
  "source_group",
]);

export function normalizeRegistryEnvelope(document, label = "route registry") {
  requireRecord(document, label);
  requireExactKeys(document, ENVELOPE_KEYS, label);
  if (document.ok !== true) {
    throw new Error(`${label}.ok must be true for a successful envelope`);
  }
  if (document.error !== null) {
    throw new Error(`${label}.error must be null for a successful envelope`);
  }

  requireRecord(document.data, `${label}.data`);
  requireExactKeys(document.data, DATA_KEYS, `${label}.data`);
  if (document.data.schema !== REGISTRY_SCHEMA) {
    throw new Error(`${label}.data.schema must be ${REGISTRY_SCHEMA}, got ${JSON.stringify(document.data.schema)}`);
  }
  requireReleaseVersion(document.data.holm_version, `${label}.data.holm_version`);
  if (typeof document.data.holm_commit !== "string" || !/^[0-9a-f]{40}$/.test(document.data.holm_commit)) {
    throw new Error(`${label}.data.holm_commit must be a 40-character lowercase hexadecimal commit`);
  }
  if (!Array.isArray(document.data.routes) || document.data.routes.length === 0) {
    throw new Error(`${label}.data.routes must be a non-empty array`);
  }

  requireRecord(document.meta, `${label}.meta`);
  requireExactKeys(document.meta, META_KEYS, `${label}.meta`);
  if (document.meta.command !== "api routes") {
    throw new Error(`${label}.meta.command must be "api routes", got ${JSON.stringify(document.meta.command)}`);
  }

  const identities = new Map();
  const routes = document.data.routes.map((route, index) => {
    const routeLabel = `${label}.data.routes[${index}]`;
    requireRecord(route, routeLabel);
    requireExactKeys(route, ROUTE_KEYS, routeLabel);
    requireMethod(route.method, `${routeLabel}.method`);
    requirePath(route.path, `${routeLabel}.path`);
    requireNonEmptyString(route.auth_scope, `${routeLabel}.auth_scope`);
    requireVocabulary(route.surface_class, SURFACE_CLASSES, `${routeLabel}.surface_class`);
    requireVocabulary(route.stability, STABILITIES, `${routeLabel}.stability`);
    requireNonEmptyString(route.lane, `${routeLabel}.lane`);
    requireNonEmptyString(route.source_group, `${routeLabel}.source_group`);

    const identity = routeIdentity(route);
    const previous = identities.get(identity);
    if (previous !== undefined) {
      throw new Error(`${label}.data.routes has duplicate composite route identity ${identity} at indexes ${previous} and ${index}`);
    }
    identities.set(identity, index);

    return {
      method: route.method,
      path: route.path,
      auth_scope: route.auth_scope,
      surface_class: route.surface_class,
      stability: route.stability,
      lane: route.lane,
      source_group: route.source_group,
    };
  });

  return {
    ok: true,
    data: {
      schema: REGISTRY_SCHEMA,
      holm_version: document.data.holm_version,
      holm_commit: document.data.holm_commit,
      routes,
    },
    meta: { command: "api routes" },
    error: null,
  };
}

export function serializeRegistryEnvelope(document) {
  return `${JSON.stringify(normalizeRegistryEnvelope(document), null, 2)}\n`;
}

export function run(argv = process.argv.slice(2), environment = process.env) {
  const options = parseArguments(argv, environment);
  if (options.help) {
    printUsage();
    return;
  }

  if (options.mode === "write") {
    const registry = executeHolm(options.holmBin);
    const bytes = serializeRegistryEnvelope(registry);
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, bytes);
    console.log(
      `Holm route registry snapshot written to ${SNAPSHOT_PATH}: ${summary(registry)}.`,
    );
    return;
  }

  const snapshot = readCanonicalSnapshot();
  if (options.mode === "check") {
    console.log(`Holm route registry offline check passed: ${summary(snapshot)}.`);
    return;
  }

  const live = executeHolm(options.holmBin);
  const drift = describeDrift(snapshot, live);
  if (drift.length > 0) {
    throw new Error(
      `live Holm route registry drifted from ${SNAPSHOT_PATH}:\n${drift.map((item) => `- ${item}`).join("\n")}\n` +
      "Review the authority change before running --write.",
    );
  }
  console.log(`Holm route registry live check passed: ${summary(live)}.`);
}

function parseArguments(argv, environment) {
  let mode;
  let explicitHolmBin;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (["--write", "--check", "--check-live"].includes(argument)) {
      if (mode !== undefined) {
        throw new Error(`choose exactly one mode; received --${mode} and ${argument}`);
      }
      mode = argument.slice(2);
      continue;
    }
    if (argument === "--holm-bin") {
      if (explicitHolmBin !== undefined) {
        throw new Error("--holm-bin may be provided only once");
      }
      const value = argv[index + 1];
      if (value === undefined || value.trim() === "") {
        throw new Error("--holm-bin requires a non-empty path or command name");
      }
      explicitHolmBin = value;
      index += 1;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }
    throw new Error(`unknown argument ${JSON.stringify(argument)}`);
  }

  if (help) return { help: true };
  if (mode === undefined) {
    throw new Error("choose one mode: --write, --check, or --check-live");
  }
  if (mode === "check" && explicitHolmBin !== undefined) {
    throw new Error("--check is offline and does not accept --holm-bin");
  }

  const environmentHolmBin = environment.HOLM_BIN?.trim();
  return {
    mode,
    holmBin: explicitHolmBin ?? environmentHolmBin ?? "holm",
  };
}

function executeHolm(holmBin) {
  const result = spawnSync(holmBin, HOLM_ARGUMENTS, {
    encoding: "utf8",
    shell: false,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error !== undefined) {
    throw new Error(`could not execute Holm binary ${JSON.stringify(holmBin)}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(
      `Holm binary ${JSON.stringify(holmBin)} exited with status ${result.status}` +
      (detail === "" ? "" : `: ${detail}`),
    );
  }
  return parseRegistryJson(result.stdout, `output from ${JSON.stringify(holmBin)}`);
}

function readCanonicalSnapshot() {
  let bytes;
  try {
    bytes = readFileSync(SNAPSHOT_PATH, "utf8");
  } catch (error) {
    throw new Error(`could not read ${SNAPSHOT_PATH}: ${error.message}`);
  }
  const registry = parseRegistryJson(bytes, SNAPSHOT_PATH);
  if (bytes !== serializeRegistryEnvelope(registry)) {
    throw new Error(`${SNAPSHOT_PATH} is not canonical; run --write with the reviewed Holm binary`);
  }
  return registry;
}

function parseRegistryJson(bytes, label) {
  let document;
  try {
    document = JSON.parse(bytes);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
  return normalizeRegistryEnvelope(document, label);
}

function describeDrift(snapshot, live) {
  if (serializeRegistryEnvelope(snapshot) === serializeRegistryEnvelope(live)) return [];

  const drift = [];
  for (const field of ["holm_version", "holm_commit"]) {
    if (snapshot.data[field] !== live.data[field]) {
      drift.push(`${field} changed: snapshot ${snapshot.data[field]}, live ${live.data[field]}`);
    }
  }

  const snapshotRoutes = new Map(snapshot.data.routes.map((route) => [routeIdentity(route), route]));
  const liveRoutes = new Map(live.data.routes.map((route) => [routeIdentity(route), route]));
  for (const identity of snapshotRoutes.keys()) {
    if (!liveRoutes.has(identity)) drift.push(`route removed: ${identity}`);
  }
  for (const identity of liveRoutes.keys()) {
    if (!snapshotRoutes.has(identity)) drift.push(`route added: ${identity}`);
  }
  for (const [identity, snapshotRoute] of snapshotRoutes) {
    const liveRoute = liveRoutes.get(identity);
    if (liveRoute === undefined) continue;
    const changedFields = ROUTE_KEYS.filter((field) => snapshotRoute[field] !== liveRoute[field]);
    if (changedFields.length > 0) {
      drift.push(`route ${identity} changed fields: ${changedFields.join(", ")}`);
    }
  }

  const snapshotOrder = snapshot.data.routes.map(routeIdentity);
  const liveOrder = live.data.routes.map(routeIdentity);
  if (
    snapshotOrder.length === liveOrder.length &&
    snapshotOrder.every((identity) => liveRoutes.has(identity)) &&
    liveOrder.every((identity) => snapshotRoutes.has(identity))
  ) {
    const changedIndex = snapshotOrder.findIndex((identity, index) => identity !== liveOrder[index]);
    if (changedIndex !== -1) {
      drift.push(
        `route order changed at index ${changedIndex}: snapshot ${snapshotOrder[changedIndex]}, live ${liveOrder[changedIndex]}`,
      );
    }
  }

  return drift.length === 0 ? ["canonical registry content changed"] : drift.slice(0, 40);
}

function routeIdentity(route) {
  return `${route.method} ${route.path} | ${route.source_group} | ${route.lane}`;
}

function summary(registry) {
  return `${registry.data.routes.length} routes from Holm ${registry.data.holm_version} (${registry.data.holm_commit})`;
}

function requireRecord(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function requireExactKeys(value, expected, label) {
  for (const key of expected) {
    if (!Object.hasOwn(value, key)) throw new Error(`${label}.${key} is required`);
  }
  for (const key of Object.keys(value)) {
    if (!expected.includes(key)) throw new Error(`${label}.${key} is not allowed by ${REGISTRY_SCHEMA}`);
  }
}

function requireReleaseVersion(value, label) {
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value)) {
    throw new Error(`${label} must be a non-empty semantic version`);
  }
}

function requireMethod(value, label) {
  if (value === "ANY") return;
  if (typeof value !== "string" || value === "") {
    throw new Error(`${label} is required`);
  }
  const methods = value.split(",");
  if (methods.some((method) => !HTTP_METHODS.has(method)) || new Set(methods).size !== methods.length) {
    throw new Error(`${label} has unsupported route method ${JSON.stringify(value)}`);
  }
}

function requirePath(value, label) {
  requireNonEmptyString(value, label);
  if (!value.startsWith("/")) throw new Error(`${label} must begin with /`);
}

function requireVocabulary(value, vocabulary, label) {
  if (!vocabulary.has(value)) {
    throw new Error(`${label} has unsupported value ${JSON.stringify(value)}`);
  }
}

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "" || value !== value.trim()) {
    throw new Error(`${label} is required and must be a trimmed non-empty string`);
  }
}

function printUsage() {
  console.log("Usage:");
  console.log("  node scripts/refresh-holm-route-registry.mjs --write [--holm-bin <path>]");
  console.log("  node scripts/refresh-holm-route-registry.mjs --check");
  console.log("  node scripts/refresh-holm-route-registry.mjs --check-live [--holm-bin <path>]");
  console.log("\nHOLM_BIN is used when --holm-bin is omitted; explicit argv wins.");
}

function isMainModule() {
  return process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
}

if (isMainModule()) {
  try {
    run();
  } catch (error) {
    console.error(`Holm route registry refresh failed: ${error.message}`);
    process.exitCode = 1;
  }
}
