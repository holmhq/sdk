import { existsSync, mkdirSync, writeFileSync } from "node:fs";

import { artifactRecord, listFiles, readJson, stableJson } from "./lib/artifacts.mjs";
import { webBundleDefinitionForPath } from "./lib/web-bundles.mjs";

const packageJson = readJson("package.json");
const sizeReport = existsSync("dist/size-report.json") ? readJson("dist/size-report.json") : { artifacts: [] };
const licenseReport = existsSync("dist/license-report.json") ? readJson("dist/license-report.json") : { artifacts: [] };
const sizeByPath = new Map((sizeReport.artifacts ?? []).map((artifact) => [artifact.path, artifact]));
const licenseByPath = new Map((licenseReport.artifacts ?? []).map((artifact) => [artifact.path, artifact]));
const generatedReports = new Set(["dist/license-report.json", "dist/manifest.json", "dist/size-report.json"]);
const artifacts = listFiles("dist")
  .filter((path) => !generatedReports.has(path))
  .map((path) => enrichArtifact(artifactRecord(path)));

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
      "Tracked development artifacts are commit-independent; distribute them from an immutable Git SHA or reviewed tag; never deploy from @main.",
  },
  artifacts,
};

mkdirSync("dist", { recursive: true });
writeFileSync("dist/manifest.json", stableJson(manifest));

function enrichArtifact(record) {
  const size = sizeByPath.get(record.path);
  const license = licenseByPath.get(record.path);
  const bundle = webBundleDefinitionForPath(record.path);
  return {
    ...record,
    ...(size === undefined
      ? {}
      : {
          rawBytes: size.rawBytes,
          minifiedBytes: size.minifiedBytes,
          gzipBytes: size.gzipBytes,
          budgets: size.budgets,
        }),
    ...(license === undefined
      ? {}
      : {
          license: license.license,
          licenseNotice: license.notice,
        }),
    ...(bundle === undefined
      ? {}
      : {
          kind: bundle.kind,
          description: bundle.description,
          declaration: bundle.declaration,
          sourceMap: bundle.sourceMap,
          declarationMap: bundle.declarationMap,
          includedCapabilities: [...bundle.includedCapabilities],
          excludedCapabilities: [...bundle.excludedCapabilities],
          distribution: {
            packagePrivate: packageJson.private === true,
            addressPolicy: "Use an immutable Git SHA or reviewed tag; never deploy from @main.",
            runtimeCdnRequired: false,
          },
        }),
  };
}
