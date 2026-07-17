import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { listFiles } from "./lib/artifacts.mjs";
import { verifyDistIntegrityAndOfflineFixture } from "./verify-dist-integrity.mjs";

const { createBfbbApp } = await import("../examples/bfbb/app.js");
const rawCalls = [];

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

function jsonFetchResponse(body) {
  return {
    status: 200,
    url: "",
    headers: new Map([["content-type", "application/json"]]),
    text: async () => body,
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}
const raw = createBfbbApp({
  baseUrl: "https://app.example.test/",
  cache: false,
  fetch: async (input) => {
    rawCalls.push(String(input));
    return jsonFetchResponse('{"data":{"ok":true,"mode":"bfbb"}}');
  },
});
const rawResult = await raw.app.http.get("/api/example");
if (JSON.stringify(rawResult) !== '{"mode":"bfbb","ok":true}' && JSON.stringify(rawResult) !== '{"ok":true,"mode":"bfbb"}') {
  throw new Error(`BFBB example returned an unexpected payload: ${JSON.stringify(rawResult)}`);
}
if (rawCalls[0] !== "https://app.example.test/api/example") {
  throw new Error(`BFBB example used an unexpected URL: ${String(rawCalls[0])}`);
}
await raw.dispose();

await verifyDistIntegrityAndOfflineFixture();

const bfbbGraph = collectEsmGraph("examples/bfbb/app.js");
const bfbbNodeSpecifiers = bfbbGraph.externalSpecifiers.filter((specifier) => specifier === "node" || specifier.startsWith("node:"));
if (bfbbNodeSpecifiers.length > 0) {
  throw new Error(`Raw BFBB example must not depend on Node runtime modules: ${bfbbNodeSpecifiers.join(", ")}`);
}
const bfbbPreviewFiles = bfbbGraph.visited.filter((path) => /\/dist\/node\//.test(path));
if (bfbbPreviewFiles.length > 0) {
  throw new Error(`Raw BFBB example must not evaluate the preview Node runtime: ${bfbbPreviewFiles.map((path) => relative(process.cwd(), path)).join(", ")}`);
}

const typecheck = spawnSync(
  resolve("node_modules/.bin/tsc"),
  ["-p", "tsconfig.examples.json", "--noEmit"],
  { encoding: "utf8", shell: false },
);
process.stdout.write(typecheck.stdout);
process.stderr.write(typecheck.stderr);
if (typecheck.status !== 0) {
  process.exit(typecheck.status ?? 1);
}

for (const example of ["vite", "react"]) {
  const output = resolve(`.tmp/examples/${example}`);
  rmSync(output, { recursive: true, force: true });
  const vite = spawnSync(
    resolve("node_modules/.bin/vite"),
    ["build", `examples/${example}`, "--outDir", output, "--emptyOutDir"],
    { encoding: "utf8", shell: false },
  );
  process.stdout.write(vite.stdout);
  process.stderr.write(vite.stderr);
  if (vite.status !== 0) {
    process.exit(vite.status ?? 1);
  }

  const files = listFiles(output);
  const indexPath = files.find((path) => path.endsWith("/index.html"));
  const bundlePath = files.find((path) => /\/assets\/index-[^/]+\.js$/.test(path));
  if (!indexPath || !bundlePath) {
    throw new Error(`${example} example output is incomplete: ${files.join(", ")}`);
  }
  const bundle = readFileSync(bundlePath, "utf8");
  if (!bundle.includes("/api/me") || !bundle.includes("holm.example.session")) {
    throw new Error(`${example} example bundle does not contain the shared Holm session contract.`);
  }
}

const examplesReadme = readFileSync("examples/README.md", "utf8").toLowerCase();
for (const requiredLabel of [
  "@holmhq/sdk/node",
  "@holmhq/sdk/sobek",
  "preview",
  "not frozen",
  "desktop",
  "mobile",
  "reserved",
  "unsupported",
  "not production",
]) {
  if (!examplesReadme.includes(requiredLabel)) {
    throw new Error(`Examples README must label preview/reserved imports honestly; missing ${requiredLabel}.`);
  }
}

console.log("Example checks passed: raw BFBB import, offline vendored integrity fixture, typed vanilla + React production builds sharing one session contract, preview runtime labels, and reserved bridge labels.");
