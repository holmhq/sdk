const commonExcludedCapabilities = Object.freeze([
  "actions/generated-cli",
  "realtime-runtime",
  "collaboration",
  "framework-bindings",
  "crdt-engines",
  "node-cli",
  "sobek-server",
  "desktop-mobile-production-bridge",
  "arbitrary-ssr",
]);

export const excludedWebBundleCapabilities = Object.freeze([
  "admin",
  ...commonExcludedCapabilities,
]);

export const webBundleDefinitions = Object.freeze([
  Object.freeze({
    path: "dist/holm.js",
    declaration: "dist/holm.d.ts",
    sourceMap: "dist/holm.js.map",
    declarationMap: "dist/holm.d.ts.map",
    kind: "browser-bfbb-composition",
    description: "Complete v0.2 browser/BFBB convenience composition with the preview admin extension.",
    includedCapabilities: Object.freeze(["core", "app", "admin", "web", "transports", "state", "test"]),
    excludedCapabilities: commonExcludedCapabilities,
    rawBudget: 5120,
    gzipBudget: 1792,
    includeAdmin: true,
    includeTest: true,
  }),
  Object.freeze({
    path: "dist/holm-web.js",
    declaration: "dist/holm-web.d.ts",
    sourceMap: "dist/holm-web.js.map",
    declarationMap: "dist/holm-web.d.ts.map",
    kind: "browser-web-composition",
    description: "Narrow app-focused browser composition excluding test helpers and non-web runtimes for isolation and size.",
    includedCapabilities: Object.freeze(["core", "app", "web", "transports", "state"]),
    excludedCapabilities: excludedWebBundleCapabilities,
    rawBudget: 4096,
    gzipBudget: 1536,
    includeAdmin: false,
    includeTest: false,
  }),
]);

export function webBundleDefinitionForPath(path) {
  return webBundleDefinitions.find((definition) => definition.path === path);
}

export function isWebBundleArtifact(path) {
  return webBundleDefinitions.some((definition) =>
    path === definition.path ||
    path === definition.declaration ||
    path === definition.sourceMap ||
    path === definition.declarationMap,
  );
}
