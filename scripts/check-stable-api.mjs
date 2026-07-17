import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import { readJson, sha256, stableJson } from "./lib/artifacts.mjs";

const manifestPath = "test/fixtures/stable-api-manifest.json";
const packageName = "@holmhq/sdk";
const stableEntries = [
  { name: "@holmhq/sdk", packageExport: ".", declaration: "dist/index.d.ts", import: "dist/index.js" },
  { name: "@holmhq/sdk/core", packageExport: "./core", declaration: "dist/core/index.d.ts", import: "dist/core/index.js" },
  { name: "@holmhq/sdk/transports", packageExport: "./transports", declaration: "dist/transports/index.d.ts", import: "dist/transports/index.js" },
  { name: "@holmhq/sdk/app", packageExport: "./app", declaration: "dist/app/index.d.ts", import: "dist/app/index.js" },
  { name: "@holmhq/sdk/web", packageExport: "./web", declaration: "dist/web/index.d.ts", import: "dist/web/index.js" },
  { name: "@holmhq/sdk/state", packageExport: "./state", declaration: "dist/state/index.d.ts", import: "dist/state/index.js" },
  { name: "@holmhq/sdk/test", packageExport: "./test", declaration: "dist/test/index.d.ts", import: "dist/test/index.js" },
];
const stableEntryNames = stableEntries.map((entry) => entry.name);
const forbiddenStableExportPatterns = [
  /(^|_)(node|sobek|bridge)(_|$)/i,
  /^create(?:Node|Sobek|Bridge|MockBridge|ReservedDesktop|ReservedMobile)/,
  /^(?:node|sobek)Runtime$/,
  /^Unsupported(?:Node|Sobek|Bridge)/,
  /(?:Desktop|Mobile)Bridge/,
  /Mailbox/,
];
const forbiddenStableDeclarationPathPatterns = [
  /^dist\/(?:node|sobek|bridge)\//,
  /(?:^|\/)fixtures?(?:\/|$)/,
  /^test\//,
  /^src\//,
];
const rootCoreAmbientPattern = /\b(?:window|document|Window|Document|HTMLElement|Element|Blob|File|FormData|Request|Response|Headers|URLSearchParams|URL|fetch|process|Buffer|NodeJS|ReadableStream|WritableStream|AbortSignal|EventTarget)\b|node:/;
const identifierPattern = /^[A-Za-z_$][\w$]*$/;

const writeManifest = process.argv.includes("--write");
const actualManifest = buildManifest();
const actualStable = stableJson(actualManifest);

if (writeManifest) {
  writeFileSync(manifestPath, actualStable);
  console.log(`Stable API manifest written to ${manifestPath}.`);
  process.exit(0);
}

if (!existsSync(manifestPath)) {
  console.error(`Stable API manifest is missing: ${manifestPath}`);
  process.exit(1);
}

const expectedManifest = readJson(manifestPath);
const errors = validateManifestShape(expectedManifest);
const expectedStable = stableJson(expectedManifest);
if (actualStable !== expectedStable) {
  errors.push("stable API manifest drifted; run node scripts/check-stable-api.mjs --write only in the reviewed API-change commit");
  const expectedLines = expectedStable.split("\n");
  const actualLines = actualStable.split("\n");
  const lineCount = Math.max(expectedLines.length, actualLines.length);
  for (let index = 0; index < lineCount; index += 1) {
    if (expectedLines[index] !== actualLines[index]) {
      errors.push(`first manifest difference at line ${index + 1}`);
      errors.push(`expected: ${expectedLines[index] ?? "<missing>"}`);
      errors.push(`actual:   ${actualLines[index] ?? "<missing>"}`);
      break;
    }
  }
}

if (errors.length > 0) {
  console.error("Stable API drift check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Stable API drift check passed for ${stableEntryNames.length} entry point(s).`);

function buildManifest() {
  const packageJson = readJson("package.json");
  assertPackageMetadata(packageJson);
  const entries = stableEntries.map((entry) => buildEntry(packageJson, entry));
  return {
    schema: "holm.sdk.stable-api-manifest.v1",
    packageName,
    stableEntryNames,
    entries,
  };
}

function assertPackageMetadata(packageJson) {
  if (packageJson.name !== packageName) {
    throw new Error(`package name must remain ${packageName}; found ${String(packageJson.name)}`);
  }
  const exportsMap = packageJson.exports;
  if (!exportsMap || typeof exportsMap !== "object" || Array.isArray(exportsMap)) {
    throw new Error("package exports map is missing");
  }
}

function buildEntry(packageJson, entry) {
  const packageExport = packageJson.exports?.[entry.packageExport];
  const expectedTypes = `./${entry.declaration}`;
  const expectedImport = `./${entry.import}`;
  if (!packageExport || packageExport.types !== expectedTypes || packageExport.import !== expectedImport) {
    throw new Error(
      `${entry.name} package export must be { types: ${JSON.stringify(expectedTypes)}, import: ${JSON.stringify(expectedImport)} }`,
    );
  }
  const declarationFiles = declarationGraph(entry.declaration).map((path) => ({
    path,
    sha256: sha256(Buffer.from(normalizeDeclaration(readFileSync(path, "utf8")), "utf8")),
  }));
  const declarationPaths = declarationFiles.map((file) => file.path);
  const entryText = normalizeDeclaration(readFileSync(entry.declaration, "utf8"));
  const exports = extractExports(entryText, entry.declaration);
  validateEntry(entry, exports, declarationPaths);
  return {
    name: entry.name,
    packageExport: entry.packageExport,
    declaration: entry.declaration,
    import: entry.import,
    exports,
    declarationFiles,
  };
}

function declarationGraph(entryPath) {
  const visited = new Set();
  const queue = [entryPath];
  while (queue.length > 0) {
    const path = normalizePath(queue.shift());
    if (visited.has(path)) {
      continue;
    }
    if (!existsSync(path)) {
      throw new Error(`declaration file is missing: ${path}`);
    }
    visited.add(path);
    const text = normalizeDeclaration(readFileSync(path, "utf8"));
    for (const specifier of declarationSpecifiers(text)) {
      if (!specifier.startsWith(".")) {
        continue;
      }
      const next = resolveDeclarationSpecifier(path, specifier);
      if (existsSync(next)) {
        queue.push(next);
      }
    }
  }
  return [...visited].sort();
}

function declarationSpecifiers(text) {
  const specifiers = [];
  const fromPattern = /\b(?:import|export)\b[\s\S]*?\bfrom\s+["']([^"']+)["']/g;
  for (const match of text.matchAll(fromPattern)) {
    specifiers.push(match[1]);
  }
  const sideEffectPattern = /\bimport\s+["']([^"']+)["']/g;
  for (const match of text.matchAll(sideEffectPattern)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function resolveDeclarationSpecifier(fromPath, specifier) {
  const resolved = join(dirname(fromPath), specifier.endsWith(".js") ? specifier.replace(/\.js$/, ".d.ts") : `${specifier}.d.ts`);
  return normalizePath(relative(process.cwd(), resolved));
}

function extractExports(text, file) {
  if (/export\s+\*\s+from\s+["']/.test(text)) {
    throw new Error(`${file} uses export *; stable entry declarations must enumerate public names explicitly`);
  }

  const values = new Set();
  const types = new Set();

  const listPattern = /export\s+(type\s+)?\{([\s\S]*?)\}/g;
  for (const match of text.matchAll(listPattern)) {
    const listIsTypeOnly = Boolean(match[1]);
    for (const rawItem of match[2].split(",")) {
      const parsed = parseExportListItem(rawItem);
      if (!parsed) {
        continue;
      }
      if (listIsTypeOnly || parsed.typeOnly) {
        types.add(parsed.name);
      } else {
        values.add(parsed.name);
      }
    }
  }

  const valuePattern = /export\s+declare\s+(?:abstract\s+)?(?:function|const|let|var|class|enum)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of text.matchAll(valuePattern)) {
    values.add(match[1]);
  }

  const typePattern = /export\s+(?:declare\s+)?(?:interface|type)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of text.matchAll(typePattern)) {
    types.add(match[1]);
  }

  return {
    values: [...values].sort(),
    types: [...types].sort(),
  };
}

function parseExportListItem(rawItem) {
  let item = rawItem.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  if (item === "") {
    return undefined;
  }
  let typeOnly = false;
  if (item.startsWith("type ")) {
    typeOnly = true;
    item = item.slice("type ".length).trim();
  }
  const parts = item.split(/\s+as\s+/);
  const name = (parts.length > 1 ? parts[parts.length - 1] : parts[0]).trim();
  if (!identifierPattern.test(name)) {
    throw new Error(`unsupported export list item: ${rawItem}`);
  }
  return { name, typeOnly };
}

function validateEntry(entry, exports, declarationPaths) {
  for (const name of [...exports.values, ...exports.types]) {
    for (const pattern of forbiddenStableExportPatterns) {
      if (pattern.test(name)) {
        throw new Error(`${entry.name} exposes forbidden stable export ${name}`);
      }
    }
  }

  for (const path of declarationPaths) {
    for (const pattern of forbiddenStableDeclarationPathPatterns) {
      if (pattern.test(path)) {
        throw new Error(`${entry.name} declaration graph includes forbidden path ${path}`);
      }
    }
  }

  if (entry.name === "@holmhq/sdk" || entry.name === "@holmhq/sdk/core") {
    for (const path of declarationPaths) {
      const text = normalizeDeclaration(readFileSync(path, "utf8"));
      const ambient = rootCoreAmbientPattern.exec(text);
      if (ambient) {
        throw new Error(`${entry.name} declaration graph leaks DOM/Node ambient token ${ambient[0]} via ${path}`);
      }
    }
  }
}

function validateManifestShape(manifest) {
  const errors = [];
  if (manifest.schema !== "holm.sdk.stable-api-manifest.v1") {
    errors.push("manifest schema must be holm.sdk.stable-api-manifest.v1");
  }
  if (manifest.packageName !== packageName) {
    errors.push(`manifest packageName must be ${packageName}`);
  }
  if (JSON.stringify(manifest.stableEntryNames) !== JSON.stringify(stableEntryNames)) {
    errors.push(`manifest stableEntryNames must be exactly ${stableEntryNames.join(", ")}`);
  }
  const entryNames = Array.isArray(manifest.entries) ? manifest.entries.map((entry) => entry?.name) : [];
  if (JSON.stringify(entryNames) !== JSON.stringify(stableEntryNames)) {
    errors.push(`manifest entries must be exactly ${stableEntryNames.join(", ")}`);
  }
  return errors;
}

function normalizeDeclaration(text) {
  return text.replace(/\r\n/g, "\n").replace(/^\/\/# sourceMappingURL=.*$/gm, "").trimEnd() + "\n";
}

function normalizePath(path) {
  return path.split("\\").join("/");
}
