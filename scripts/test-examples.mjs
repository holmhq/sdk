import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import { listFiles } from "./lib/artifacts.mjs";

const { createBfbbApp } = await import("../examples/bfbb/app.js");
const rawCalls = [];
const raw = createBfbbApp({
  baseUrl: "https://app.example.test/",
  cache: false,
  fetch: async (input) => {
    rawCalls.push(String(input));
    return new Response('{"data":{"ok":true,"mode":"bfbb"}}', {
      headers: { "content-type": "application/json" },
    });
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

const output = resolve(".tmp/examples/vite");
rmSync(output, { recursive: true, force: true });
const vite = spawnSync(
  resolve("node_modules/.bin/vite"),
  ["build", "examples/vite", "--outDir", output, "--emptyOutDir"],
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
  throw new Error(`Vite example output is incomplete: ${files.join(", ")}`);
}
const bundle = readFileSync(bundlePath, "utf8");
if (!bundle.includes("/api/me") || !bundle.includes("holm.http.app")) {
  throw new Error("Vite example bundle does not contain the app HTTP composition.");
}

console.log("Example checks passed: raw BFBB import and Vite production build.");
