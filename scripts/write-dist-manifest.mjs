import { mkdirSync, writeFileSync } from "node:fs";

import { artifactRecord, listFiles, readJson, stableJson } from "./lib/artifacts.mjs";

const packageJson = readJson("package.json");
const generatedReports = new Set(["dist/license-report.json", "dist/manifest.json", "dist/size-report.json"]);
const artifacts = listFiles("dist")
  .filter((path) => !generatedReports.has(path))
  .map(artifactRecord);

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
