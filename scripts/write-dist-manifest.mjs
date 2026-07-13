import { mkdirSync, writeFileSync } from "node:fs";

import { artifactRecord, readJson, stableJson } from "./lib/artifacts.mjs";

const packageJson = readJson("package.json");
const artifacts = [
  "dist/index.js",
  "dist/index.js.map",
  "dist/index.d.ts",
  "dist/index.d.ts.map",
  "dist/core/index.js",
  "dist/core/index.js.map",
  "dist/core/index.d.ts",
  "dist/core/index.d.ts.map",
].map(artifactRecord);

const manifest = {
  schema: "holm.sdk.dist-manifest/1",
  package: {
    name: packageJson.name,
    version: packageJson.version,
    private: packageJson.private === true,
    license: packageJson.license,
  },
  source: {
    commit: null,
    commitPolicy:
      "Tracked development artifacts are commit-independent; distribute them from an immutable Git SHA or reviewed tag.",
  },
  artifacts,
};

mkdirSync("dist", { recursive: true });
writeFileSync("dist/manifest.json", stableJson(manifest));
