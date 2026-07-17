import { mkdirSync, readFileSync, rmSync, cpSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { listFiles, readJson, sha256 } from "./lib/artifacts.mjs";

const distRoot = "dist";
const fixtureSourceRoot = "examples/bfbb-vendored";
const fixtureWorkRoot = ".tmp/integrity/bfbb-vendored";
const vendoredRoot = `${fixtureWorkRoot}/vendor/holm-sdk`;
const bundlePaths = new Set(["dist/holm.js", "dist/holm-web.js"]);

export async function verifyDistIntegrityAndOfflineFixture() {
  const manifest = readJson("dist/manifest.json");
  const records = verifyGeneratedManifest(manifest);
  verifyDocumentationGuidance();
  prepareVendoredFixture(records);
  verifyVendoredArtifacts(records);
  await runVendoredBfbbFixture();
  verifyTamperedVendoredArtifactFails(records);
  verifyPackageExportCompatibility();

  console.log(
    `Integrity checks passed: ${records.length} manifest artifact(s), altered-byte rejection, offline vendored BFBB fixture, immutable vendoring docs, and package-export compatibility.`,
  );
}

function verifyGeneratedManifest(manifest) {
  if (manifest.schema !== "holm.sdk.dist-manifest/1") {
    throw new Error(`Unexpected dist manifest schema: ${String(manifest.schema)}`);
  }
  if (manifest.package?.private !== false) {
    throw new Error("Dist manifest must record the public release package state.");
  }
  if (!/immutable Git SHA/.test(manifest.source?.commitPolicy ?? "") || !/reviewed\s+tag/.test(manifest.source?.commitPolicy ?? "")) {
    throw new Error("Dist manifest must require immutable Git SHA or reviewed tag distribution.");
  }

  const records = manifest.artifacts ?? [];
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Dist manifest has no artifact records.");
  }

  const seen = new Set();
  for (const record of records) {
    if (typeof record.path !== "string" || !record.path.startsWith(`${distRoot}/`)) {
      throw new Error(`Invalid artifact path in manifest: ${String(record.path)}`);
    }
    if (seen.has(record.path)) {
      throw new Error(`Duplicate artifact path in manifest: ${record.path}`);
    }
    seen.add(record.path);

    const data = readFileSync(record.path);
    if (data.byteLength !== record.bytes) {
      throw new Error(`${record.path}: manifest bytes ${record.bytes} did not match ${data.byteLength}`);
    }
    const digest = sha256(data);
    if (digest !== record.sha256) {
      throw new Error(`${record.path}: manifest sha256 ${record.sha256} did not match ${digest}`);
    }

    if (bundlePaths.has(record.path)) {
      if (record.distribution?.packagePrivate !== false) {
        throw new Error(`${record.path}: bundle distribution metadata must record the public release package state.`);
      }
      if (record.distribution?.runtimeCdnRequired !== false) {
        throw new Error(`${record.path}: bundle distribution metadata must not require a runtime CDN.`);
      }
      if (!/immutable Git SHA/.test(record.distribution?.addressPolicy ?? "") || !/reviewed\s+tag/.test(record.distribution?.addressPolicy ?? "")) {
        throw new Error(`${record.path}: bundle distribution metadata must require an immutable Git SHA or reviewed tag.`);
      }
      if (!/never deploy from @main/.test(record.distribution?.addressPolicy ?? "")) {
        throw new Error(`${record.path}: bundle distribution metadata must reject mutable @main deployments.`);
      }
    }
  }

  for (const required of [
    "dist/holm.js",
    "dist/holm.js.map",
    "dist/holm.d.ts",
    "dist/holm.d.ts.map",
    "dist/holm-web.js",
    "dist/holm-web.js.map",
    "dist/holm-web.d.ts",
    "dist/holm-web.d.ts.map",
  ]) {
    if (!seen.has(required)) {
      throw new Error(`Dist manifest is missing ${required}.`);
    }
  }

  return records;
}

function verifyDocumentationGuidance() {
  const docs = ["README.md", "docs/vendoring.md", "examples/README.md", `${fixtureSourceRoot}/README.md`];
  for (const path of docs) {
    const source = readFileSync(path, "utf8");
    if (!/immutable Git SHA/.test(source) || !/reviewed\s+tag/.test(source)) {
      throw new Error(`${path} must describe vendoring from an immutable Git SHA or reviewed tag.`);
    }
    if (!/never[\s\S]{0,120}`?@main`?/i.test(source)) {
      throw new Error(`${path} must explicitly reject mutable @main deployments.`);
    }
    if (/(?:cdn\.jsdelivr\.net|raw\.githubusercontent\.com|github\.com)\/[^\s)"']+@main\b/.test(source)) {
      throw new Error(`${path} contains a mutable @main download URL.`);
    }
  }

  const examplesReadme = readFileSync("examples/README.md", "utf8");
  for (const phrase of [
    "whole `dist/` module graph",
    "`shared/session-contract.ts`",
    "`vite/`",
    "`react/`",
    "not frozen",
    "reserved",
    "unsupported",
  ]) {
    if (!examplesReadme.includes(phrase)) {
      throw new Error(`examples/README.md must document the tested consumption boundaries; missing ${phrase}.`);
    }
  }
}

function prepareVendoredFixture(records) {
  rmSync(fixtureWorkRoot, { recursive: true, force: true });
  cpSync(fixtureSourceRoot, fixtureWorkRoot, { recursive: true });
  mkdirSync(vendoredRoot, { recursive: true });

  for (const record of records) {
    const destination = vendoredPath(record.path);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(record.path, destination);
  }
  cpSync("dist/manifest.json", `${vendoredRoot}/manifest.json`);

  const forbiddenRuntimeFiles = listFiles(fixtureWorkRoot).filter((path) =>
    /(^|\/)(package(?:-lock)?\.json|node_modules|vite\.config\.[cm]?[jt]s)$/.test(path),
  );
  if (forbiddenRuntimeFiles.length > 0) {
    throw new Error(`Vendored BFBB fixture must not include package-manager/build files: ${forbiddenRuntimeFiles.join(", ")}`);
  }
}

function verifyVendoredArtifacts(records) {
  for (const record of records) {
    const data = readFileSync(vendoredPath(record.path));
    if (data.byteLength !== record.bytes || sha256(data) !== record.sha256) {
      throw new Error(`${vendoredPath(record.path)} does not match generated manifest integrity metadata.`);
    }
  }
}

async function runVendoredBfbbFixture() {
  const graph = collectEsmGraph(`${fixtureWorkRoot}/app.js`);
  if (graph.externalSpecifiers.length > 0) {
    throw new Error(`Vendored BFBB fixture must use local relative ESM only: ${graph.externalSpecifiers.join(", ")}`);
  }
  const nodeFiles = graph.visited.filter((path) => /\/node\//.test(path) || /\/dist\/node\//.test(path));
  if (nodeFiles.length > 0) {
    throw new Error(`Vendored BFBB fixture must not evaluate Node runtime modules: ${nodeFiles.join(", ")}`);
  }

  for (const file of [`${fixtureWorkRoot}/index.html`, `${fixtureWorkRoot}/app.js`]) {
    const source = readFileSync(file, "utf8");
    if (/(?:https?:)?\/\//.test(source) || /@holmhq\/sdk/.test(source) || /\bnode:/.test(source)) {
      throw new Error(`${relative(process.cwd(), file)} must not import a runtime CDN, package export, or Node builtin.`);
    }
  }

  const calls = [];
  const moduleUrl = pathToFileURL(resolve(`${fixtureWorkRoot}/app.js`)).href;
  const fixture = await import(`${moduleUrl}?integrity=${Date.now()}`);
  const app = fixture.createVendoredBfbbApp({
    baseUrl: "https://app.example.test/",
    cache: false,
    fetch: async (input) => {
      calls.push(String(input));
      return {
        status: 200,
        url: "",
        headers: new Map([["content-type", "application/json"]]),
        text: async () => '{"data":{"ok":true,"mode":"vendored-bfbb"}}',
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    },
  });
  const result = await app.app.http.get("/api/example");
  if (JSON.stringify(result) !== '{"mode":"vendored-bfbb","ok":true}' && JSON.stringify(result) !== '{"ok":true,"mode":"vendored-bfbb"}') {
    throw new Error(`Vendored BFBB fixture returned an unexpected payload: ${JSON.stringify(result)}`);
  }
  if (calls[0] !== "https://app.example.test/api/example") {
    throw new Error(`Vendored BFBB fixture used an unexpected URL: ${String(calls[0])}`);
  }
  await app.dispose();
}

function verifyTamperedVendoredArtifactFails(records) {
  const tamperedPath = vendoredPath("dist/holm.js");
  const original = readFileSync(tamperedPath);
  const tampered = Buffer.from(original);
  tampered[0] = tampered[0] ^ 0xff;
  writeFileSync(tamperedPath, tampered);

  let rejected = false;
  try {
    verifyVendoredArtifacts(records);
  } catch (error) {
    rejected = /integrity metadata/.test(error.message);
  } finally {
    writeFileSync(tamperedPath, original);
  }
  if (!rejected) {
    throw new Error("Vendored artifact integrity verification did not reject an altered byte.");
  }
}

function verifyPackageExportCompatibility() {
  const packageJson = readJson("package.json");
  const webExport = packageJson.exports?.["./web"];
  if (webExport?.import !== "./dist/web/index.js" || webExport?.types !== "./dist/web/index.d.ts") {
    throw new Error("Package export compatibility for @holmhq/sdk/web changed unexpectedly.");
  }
  const viteSource = readFileSync("examples/vite/src/main.ts", "utf8");
  if (!viteSource.includes('from "@holmhq/sdk/web"')) {
    throw new Error("Vite example must keep using the stable @holmhq/sdk/web package export.");
  }
}

function collectEsmGraph(entry) {
  const visited = new Set();
  const externalSpecifiers = new Set();
  const stack = [resolve(entry)];
  const importPattern = /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;

  while (stack.length > 0) {
    const file = stack.pop();
    if (visited.has(file)) {
      continue;
    }
    visited.add(file);
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (specifier.startsWith(".")) {
        stack.push(resolve(dirname(file), specifier));
      } else {
        externalSpecifiers.add(specifier);
      }
    }
  }

  return { visited: [...visited].sort(), externalSpecifiers: [...externalSpecifiers].sort() };
}

function vendoredPath(path) {
  return `${vendoredRoot}/${path.replace(/^dist\//, "")}`;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve("scripts/verify-dist-integrity.mjs")) {
  try {
    await verifyDistIntegrityAndOfflineFixture();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
