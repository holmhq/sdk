import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const registryPath = "koder/evidence/007_holm_v0207_route_registry/route-registry.json";
const dispositionsPath = "koder/evidence/008_holm_v0207_route_dispositions/route-dispositions.json";
const adminLedgerPath = "koder/evidence/004_issue008_admin_routes/route-audit.json";
const appLedgerPath = "koder/evidence/003_issue007_app_routes/route-audit.json";
const classifications = ["adopted", "redesigned", "deferred", "excluded"];
const implementations = ["current", "s3-candidate", "none"];
const identityFields = ["method", "path", "source_group", "lane"];
const httpMethods = new Set(["ANY", "DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]);

export function routeDispositionIdentity(route) {
  return identityFields.map((field) => route?.[field] ?? "").join("\u0000");
}

export function validateRouteDispositions({ registry, document, adminLedger, appLedger }) {
  const errors = [];
  const routes = registry?.data?.routes;
  if (registry?.ok !== true || registry?.data?.schema !== "holm.route-registry.v1" || !Array.isArray(routes)) {
    return { errors: ["route registry must be a holm.route-registry.v1 success envelope"], resolved: [], summary: emptySummary() };
  }

  validateDocumentHeader(registry, document, adminLedger, appLedger, errors);
  const overrides = validateOverrides(document?.overrides, routes, errors);
  const resolved = [];

  for (const route of routes) {
    const identity = routeDispositionIdentity(route);
    const override = overrides.get(identity);
    if (override !== undefined) {
      resolved.push(resolveOverride(route, override, errors));
      continue;
    }

    const inherited = inheritedDispositions(route, adminLedger, appLedger);
    const inheritedClassifications = new Set(inherited.map((entry) => entry.classification));
    if (inherited.length === 0) {
      errors.push(`missing disposition for ${displayIdentity(route)}`);
      continue;
    }
    if (inheritedClassifications.size !== 1) {
      errors.push(
        `conflicting inherited classifications for ${displayIdentity(route)}: ${[...inheritedClassifications].sort().join(", ")}`,
      );
      continue;
    }
    resolved.push(resolveInherited(route, inherited));
  }

  const summary = summarizeRouteDispositions(resolved);
  if (resolved.length !== routes.length) {
    errors.push(`resolved route count ${resolved.length} does not match registry route count ${routes.length}`);
  }
  if (document?.expected !== undefined && !sameJson(summary, document.expected)) {
    errors.push(`disposition summary drifted: expected ${JSON.stringify(document.expected)}, received ${JSON.stringify(summary)}`);
  }

  return { errors, resolved, summary };
}

export function summarizeRouteDispositions(resolved) {
  const classification = Object.fromEntries(classifications.map((value) => [value, 0]));
  const implementation = Object.fromEntries(implementations.map((value) => [value, 0]));
  const groups = {};
  for (const entry of resolved) {
    if (Object.hasOwn(classification, entry.classification)) classification[entry.classification] += 1;
    if (Object.hasOwn(implementation, entry.implementation)) implementation[entry.implementation] += 1;
    if (entry.group !== undefined) groups[entry.group] = (groups[entry.group] ?? 0) + 1;
  }
  return {
    route_count: resolved.length,
    classification,
    implementation,
    groups: Object.fromEntries(Object.entries(groups).sort(([left], [right]) => left.localeCompare(right))),
  };
}

function validateDocumentHeader(registry, document, adminLedger, appLedger, errors) {
  if (document?.schema !== "holm.sdk.route-dispositions/1") errors.push("unexpected route disposition schema");
  if (document?.source?.registry_path !== registryPath) errors.push(`registry path must be ${registryPath}`);
  if (document?.source?.registry_schema !== registry.data.schema) errors.push("registry schema provenance does not match snapshot");
  if (document?.source?.holm_version !== registry.data.holm_version) errors.push("Holm version provenance does not match snapshot");
  if (document?.source?.holm_commit !== registry.data.holm_commit) errors.push("Holm commit provenance does not match snapshot");
  if (document?.source?.route_count !== registry.data.routes.length) errors.push("route count provenance does not match snapshot");
  if (!/^[0-9a-f]{64}$/.test(document?.source?.registry_sha256 ?? "")) errors.push("registry SHA-256 provenance is missing or malformed");
  if (!sameJson(document?.source?.identity_fields, identityFields)) {
    errors.push(`identity fields must be ${identityFields.join(" + ")}`);
  }
  if (!isRecord(document?.expected)) errors.push("expected disposition summary is missing");

  const inherited = document?.inherited_ledgers;
  validateInheritedLedger(
    inherited?.admin,
    adminLedger,
    {
      path: adminLedgerPath,
      schema: "holm.sdk.admin-route-audit/1",
      repository: "holmhq/holm",
    },
    "admin",
    errors,
  );
  validateInheritedLedger(
    inherited?.app,
    appLedger,
    {
      path: appLedgerPath,
      schema: "holm.sdk.app-route-audit/1",
      repository: "holmhq/holm",
    },
    "app",
    errors,
  );
}

function validateInheritedLedger(reference, ledger, expected, label, errors) {
  if (reference?.path !== expected.path) errors.push(`${label} inherited ledger path must be ${expected.path}`);
  if (reference?.schema !== expected.schema || ledger?.schema !== expected.schema) {
    errors.push(`${label} inherited ledger schema is invalid`);
  }
  if (ledger?.source?.repository !== expected.repository) errors.push(`${label} inherited ledger repository is invalid`);
  if (reference?.holm_commit !== ledger?.source?.commit) errors.push(`${label} inherited ledger commit does not match its source`);
}

function validateOverrides(value, routes, errors) {
  const overrides = new Map();
  if (!Array.isArray(value)) {
    errors.push("route disposition overrides are missing");
    return overrides;
  }
  const routeIndexes = new Map(routes.map((route, index) => [routeDispositionIdentity(route), index]));
  let previousRouteIndex = -1;
  for (const [index, entry] of value.entries()) {
    const identity = routeDispositionIdentity(entry);
    if (identityFields.some((field) => typeof entry?.[field] !== "string" || entry[field].trim() === "")) {
      errors.push(`override ${index} has an invalid composite identity`);
      continue;
    }
    if (overrides.has(identity)) errors.push(`duplicate override identity ${displayIdentity(entry)}`);
    const routeIndex = routeIndexes.get(identity);
    if (routeIndex === undefined) {
      errors.push(`stale override identity ${displayIdentity(entry)}`);
    } else {
      if (routeIndex <= previousRouteIndex) errors.push(`overrides must follow signed registry order at ${displayIdentity(entry)}`);
      previousRouteIndex = routeIndex;
    }
    overrides.set(identity, entry);
  }
  return overrides;
}

function resolveOverride(route, override, errors) {
  const classification = override.classification;
  const implementation = override.implementation;
  const sdk = stringArray(override.sdk);
  const coveredMethods = stringArray(override.covered_methods);
  const basis = stringArray(override.basis);
  const implementedIn = override.implemented_in;
  const hasImplementationMarker = implementedIn !== undefined;
  const label = displayIdentity(route);

  if (!classifications.includes(classification)) errors.push(`${label} has invalid classification ${JSON.stringify(classification)}`);
  if (!implementations.includes(implementation)) errors.push(`${label} has invalid implementation ${JSON.stringify(implementation)}`);
  if (typeof override.rationale !== "string" || override.rationale.trim() === "") errors.push(`${label} must provide a rationale`);
  validateStringArrayShape(override.basis, `${label} basis`, errors, true);
  validateStringArrayShape(override.sdk, `${label} sdk`, errors, false);
  validateStringArrayShape(override.covered_methods, `${label} covered_methods`, errors, false);
  if (basis.length === 0) errors.push(`${label} must provide disposition basis`);
  if (override.group !== undefined && (typeof override.group !== "string" || override.group.trim() === "")) {
    errors.push(`${label} group must be a non-empty string when present`);
  }
  if (hasImplementationMarker && (typeof implementedIn !== "string" || implementedIn.trim() === "")) {
    errors.push(`${label} implemented_in must be a non-empty string when present`);
  }

  const supported = classification === "adopted" || classification === "redesigned";
  if (supported && implementation === "none") errors.push(`${label} supported classification cannot have implementation none`);
  if (!supported && implementation !== "none") errors.push(`${label} ${classification} classification must have implementation none`);
  if (supported && sdk.length === 0) errors.push(`${label} supported classification must name SDK API`);
  if (!supported && sdk.length > 0) errors.push(`${label} ${classification} classification cannot name SDK API`);
  if (supported && coveredMethods.length === 0) errors.push(`${label} supported classification must name covered_methods`);
  if (!supported && coveredMethods.length > 0) errors.push(`${label} ${classification} classification cannot name covered_methods`);
  validateCoveredMethods(route, coveredMethods, label, errors);

  if (implementation === "s3-candidate") {
    if (hasImplementationMarker) errors.push(`${label} s3-candidate cannot set implemented_in`);
    if (route.stability !== "stable") errors.push(`${label} s3-candidate route must be stable`);
    validateContractAuthority(override.contract_authority, label, errors);
  } else if (hasImplementationMarker) {
    if (implementation !== "current") errors.push(`${label} implemented_in requires implementation current`);
    if (route.stability !== "stable") errors.push(`${label} implemented_in promotion must be stable`);
    validateContractAuthority(override.contract_authority, label, errors);
  } else if (override.contract_authority !== undefined) {
    errors.push(`${label} contract_authority requires s3-candidate or implemented_in provenance`);
  }

  return {
    ...route,
    identity: routeDispositionIdentity(route),
    classification,
    implementation,
    sdk,
    covered_methods: coveredMethods,
    rationale: typeof override.rationale === "string" ? override.rationale : "",
    basis,
    ...(typeof override.group === "string" && override.group !== "" ? { group: override.group } : {}),
    ...(typeof implementedIn === "string" && implementedIn !== "" ? { implemented_in: implementedIn } : {}),
    ...(override.contract_authority === undefined ? {} : { contract_authority: override.contract_authority }),
  };
}

function validateCoveredMethods(route, coveredMethods, label, errors) {
  for (const method of coveredMethods) {
    if (!httpMethods.has(method) || method === "ANY") errors.push(`${label} has invalid covered method ${JSON.stringify(method)}`);
  }
  if (route.method === "ANY") return;
  const registered = new Set(route.method.split(","));
  for (const method of coveredMethods) {
    if (!registered.has(method)) errors.push(`${label} covered method ${method} is outside registered method ${route.method}`);
  }
}

function validateContractAuthority(value, label, errors) {
  if (!isRecord(value)) {
    errors.push(`${label} s3-candidate must provide contract_authority`);
    return;
  }
  validateStringArrayShape(value.request, `${label} contract_authority.request`, errors, true);
  validateStringArrayShape(value.result, `${label} contract_authority.result`, errors, true);
  if (stringArray(value.request).length === 0 || stringArray(value.result).length === 0) {
    errors.push(`${label} contract_authority must name non-empty request and result sources`);
  }
}

function inheritedDispositions(route, adminLedger, appLedger) {
  const inherited = [];
  for (const entry of adminLedger?.entries ?? []) {
    if (!ledgerEntryMatches(route, entry)) continue;
    inherited.push({
      classification: entry.classification,
      sdk: entry.sdk.map((name) => `admin:${name}`),
      covered_methods: coveredMethods(route, entry.methods),
      rationale: entry.rationale,
      basis: `admin:${entry.sourceKey}`,
    });
  }
  for (const entry of adminLedger?.exclusions ?? []) {
    const parsed = parseSourceEntry(entry);
    if (!ledgerEntryMatches(route, parsed)) continue;
    inherited.push({
      classification: "excluded",
      sdk: [],
      covered_methods: [],
      rationale: entry.rationale,
      basis: `admin-exclusion:${entry.sourceKey}`,
    });
  }
  for (const entry of appLedger?.entries ?? []) {
    if (!ledgerEntryMatches(route, entry)) continue;
    const excluded = entry.classification === "intentionally-unsupported";
    inherited.push({
      classification: excluded ? "excluded" : entry.classification,
      sdk: excluded ? [] : entry.sdk.map((name) => `app:${name}`),
      covered_methods: excluded ? [] : coveredMethods(route, entry.methods),
      rationale: entry.rationale,
      basis: `app:${entry.sourceKey}`,
    });
  }
  return inherited;
}

function resolveInherited(route, inherited) {
  const classification = inherited[0].classification;
  const supported = classification === "adopted" || classification === "redesigned";
  return {
    ...route,
    identity: routeDispositionIdentity(route),
    classification,
    implementation: supported ? "current" : "none",
    sdk: supported ? unique(inherited.flatMap((entry) => entry.sdk)) : [],
    covered_methods: supported ? unique(inherited.flatMap((entry) => entry.covered_methods)) : [],
    rationale: unique(inherited.map((entry) => entry.rationale)).join(" "),
    basis: unique(inherited.map((entry) => entry.basis)),
  };
}

function parseSourceEntry(entry) {
  const match = /^(ANY|DELETE|GET|HEAD|OPTIONS|PATCH|POST|PUT) (\/.*)$/.exec(entry.sourceKey ?? "");
  if (match !== null) return { path: match[2], methods: match[1] === "ANY" ? ["ANY"] : [match[1]] };
  return { path: entry.path ?? entry.sourceKey, methods: entry.methods ?? ["ANY"] };
}

function ledgerEntryMatches(route, entry) {
  const parsed = entry.path === undefined || entry.methods === undefined ? parseSourceEntry(entry) : entry;
  if (route.path !== parsed.path) return false;
  if (route.method === "ANY" || parsed.methods.includes("ANY")) return true;
  const registered = new Set(route.method.split(","));
  return parsed.methods.some((method) => registered.has(method));
}

function coveredMethods(route, methods) {
  const concrete = methods.includes("ANY") ? route.method.split(",") : methods;
  return unique(concrete.filter((method) => method !== "ANY"));
}

function displayIdentity(route) {
  return `${route.method} ${route.path} [${route.source_group} | ${route.lane}]`;
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string" && entry.trim() !== "") : [];
}

function validateStringArrayShape(value, label, errors, required) {
  if (value === undefined && !required) return;
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array${required ? "" : " when present"}`);
    return;
  }
  if (required && value.length === 0) errors.push(`${label} must not be empty`);
  if (value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    errors.push(`${label} must contain only non-empty strings`);
  }
  if (new Set(value).size !== value.length) errors.push(`${label} must not contain duplicates`);
}

function unique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function emptySummary() {
  return {
    route_count: 0,
    classification: Object.fromEntries(classifications.map((value) => [value, 0])),
    implementation: Object.fromEntries(implementations.map((value) => [value, 0])),
    groups: {},
  };
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function runCli() {
  const registryBytes = readFileSync(registryPath, "utf8");
  const dispositionBytes = readFileSync(dispositionsPath, "utf8");
  const registry = JSON.parse(registryBytes);
  const document = JSON.parse(dispositionBytes);
  const result = validateRouteDispositions({
    registry,
    document,
    adminLedger: readJson(adminLedgerPath),
    appLedger: readJson(appLedgerPath),
  });

  const registryHash = createHash("sha256").update(registryBytes).digest("hex");
  if (document?.source?.registry_sha256 !== registryHash) {
    result.errors.push(`registry SHA-256 provenance does not match ${registryPath}`);
  }
  const canonical = `${JSON.stringify(document, null, 2)}\n`;
  if (canonical !== dispositionBytes) result.errors.push(`${dispositionsPath} is not canonical two-space JSON with one trailing newline`);

  if (result.errors.length > 0) {
    console.error("Holm route disposition check failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  const counts = result.summary.classification;
  console.log(
    `Holm route disposition check passed: ${result.summary.route_count} identities `
    + `(${counts.adopted} adopted, ${counts.redesigned} redesigned, ${counts.deferred} deferred, ${counts.excluded} excluded); `
    + `${result.summary.implementation.current} current and ${result.summary.implementation["s3-candidate"]} S3 candidates.`,
  );
}

const invokedPath = process.argv[1] === undefined ? "" : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) runCli();
