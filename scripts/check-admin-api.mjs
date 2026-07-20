import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ledgerPath = "koder/evidence/004_issue008_admin_routes/route-audit.json";
const generatedPath = "src/admin/generated.ts";
const write = process.argv.includes("--write");
const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));

const errors = validateLedger(ledger);
const descriptors = buildDescriptors(ledger);
validateDescriptors(ledger, descriptors, errors);
const generated = renderGenerated(descriptors);

if (write) {
  writeFileSync(generatedPath, generated);
  console.log(`Admin API generated at ${generatedPath} from ${ledgerPath}.`);
  process.exit(0);
}

if (!existsSync(generatedPath)) {
  errors.push(`${generatedPath} is missing; run node scripts/check-admin-api.mjs --write`);
} else if (readFileSync(generatedPath, "utf8") !== generated) {
  errors.push(`${generatedPath} drifted; run node scripts/check-admin-api.mjs --write and review the generated API delta`);
}

if (errors.length > 0) {
  console.error("Admin API inventory check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const routeCount = ledger.entries.reduce((count, entry) => count + entry.methods.length, 0);
console.log(
  `Admin API inventory check passed: ${ledger.entries.length} keys, ${routeCount} route/method contracts, ${descriptors.length} methods, ${ledger.exclusions.length} exclusions.`,
);

function validateLedger(document) {
  const failures = [];
  if (document.schema !== "holm.sdk.admin-route-audit/1") failures.push("unexpected ledger schema");
  if (document.source?.repository !== "holmhq/holm" || !/^[0-9a-f]{40}$/.test(document.source?.commit ?? "")) {
    failures.push("ledger must pin a full holmhq/holm commit");
  }
  if (!Array.isArray(document.entries) || document.entries.length === 0) failures.push("ledger entries are missing");
  if (!Array.isArray(document.exclusions)) failures.push("ledger exclusions are missing");
  for (const entry of document.entries ?? []) {
    if (!entry.sourceKey || !entry.path?.startsWith("/") || !Array.isArray(entry.methods) || entry.methods.length === 0) {
      failures.push(`invalid route entry ${JSON.stringify(entry.sourceKey)}`);
    }
    if (entry.classification !== "adopted" && entry.classification !== "redesigned") {
      failures.push(`${entry.sourceKey} has unsupported classification ${JSON.stringify(entry.classification)}`);
    }
    if (!Array.isArray(entry.sdk) || entry.sdk.length === 0 || !entry.rationale) {
      failures.push(`${entry.sourceKey} must name SDK methods and rationale`);
    }
  }
  return failures;
}

function buildDescriptors(document) {
  const byName = new Map();
  for (const entry of document.entries) {
    entry.sdk.forEach((name, index) => {
      const method = entry.methods.length === entry.sdk.length ? entry.methods[index] : entry.methods[0];
      if (!method) throw new Error(`cannot map ${name} to ${entry.sourceKey}`);
      const descriptor = byName.get(name) ?? {
        name,
        kind: methodKind(name, entry),
        routes: [],
      };
      descriptor.routes.push({
        method,
        path: entry.path,
        sourceKey: entry.sourceKey,
      });
      if (entry.helper === true) descriptor.kind = "url";
      byName.set(name, descriptor);
    });
  }

  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name)).map((descriptor) => {
    descriptor.routes.sort((left, right) => {
      const leftParams = pathParameters(left.path).length;
      const rightParams = pathParameters(right.path).length;
      return leftParams - rightParams || left.sourceKey.localeCompare(right.sourceKey);
    });
    const command = commandForMethod(descriptor.name);
    return {
      ...descriptor,
      ...(command === undefined ? {} : { command }),
      ...(descriptor.name === "email.receiptAttachment" ? { responseMode: "binary" } : {}),
    };
  });
}

function methodKind(name, entry) {
  if (entry.helper === true) return "url";
  if (name === "members.createNativeWithPicture") return "composite-upload";
  if (["apps.deploy", "deploy.upload", "links.import", "members.uploadPicture"].includes(name)) return "upload";
  return "request";
}

function commandForMethod(name) {
  if (name === "system.cmd") return { name: "", prefix: [] };
  const commandMethods = {
    "secrets.set": ["secret", "runtime", "set"],
    "secrets.list": ["secret", "runtime", "list"],
    "secrets.remove": ["secret", "runtime", "remove"],
    "provider.set": ["provider", "set"],
    "provider.list": ["provider", "list"],
    "provider.remove": ["provider", "remove"],
    "net.allow": ["net", "allow"],
    "net.allowAny": ["net", "allow-any"],
    "net.list": ["net", "list"],
    "net.remove": ["net", "remove"],
    "net.removeAny": ["net", "remove-any"],
    "presentation.inspect": ["presentation", "inspect"],
    "delivery.list": ["delivery", "list"],
    "delivery.retry": ["delivery", "retry"],
    "dataset.status": ["dataset", "geo-country", "status"],
    "dataset.source": ["dataset", "geo-country", "source"],
    "dataset.sync": ["dataset", "geo-country", "sync"],
    "peer.list": ["peer", "list"],
    "peer.add": ["peer", "add"],
    "peer.remove": ["peer", "remove"],
    "peer.updateToken": ["peer", "update-token"],
    "peer.check": ["peer", "check"],
    "peer.default": ["peer", "default"],
  };
  const parts = commandMethods[name];
  return parts === undefined ? undefined : { name: parts[0], prefix: parts.slice(1) };
}

function validateDescriptors(document, descriptors, failures) {
  const names = descriptors.map((descriptor) => descriptor.name);
  if (new Set(names).size !== names.length) failures.push("generated admin method names are not unique");
  const expectedPairs = new Set(document.entries.flatMap((entry) => entry.sdk.map((name) => `${entry.sourceKey}\0${name}`)));
  const actualPairs = new Set(descriptors.flatMap((descriptor) => descriptor.routes.map((route) => `${route.sourceKey}\0${descriptor.name}`)));
  for (const pair of expectedPairs) if (!actualPairs.has(pair)) failures.push(`missing descriptor coverage for ${pair.replace("\0", " -> ")}`);
  for (const pair of actualPairs) if (!expectedPairs.has(pair)) failures.push(`stale descriptor coverage for ${pair.replace("\0", " -> ")}`);
  for (const descriptor of descriptors) {
    if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(descriptor.name)) failures.push(`invalid SDK method path ${descriptor.name}`);
    if (descriptor.routes.length === 0) failures.push(`${descriptor.name} has no authority route`);
    if (descriptor.kind === "composite-upload") {
      const paths = new Set(descriptor.routes.map((route) => route.path));
      if (!paths.has("/auth/members/uploads") || !paths.has("/auth/members/native")) {
        failures.push(`${descriptor.name} must retain both member upload and create authority routes`);
      }
    }
  }
}

function renderGenerated(descriptors) {
  const tree = {};
  for (const descriptor of descriptors) {
    let cursor = tree;
    const parts = descriptor.name.split(".");
    for (const part of parts.slice(0, -1)) cursor = cursor[part] ??= {};
    cursor[parts.at(-1)] = descriptor;
  }

  const descriptorText = descriptors.map((descriptor) => {
    const routes = descriptor.routes.map((route) =>
      `Object.freeze({ method: ${JSON.stringify(route.method)}, path: ${JSON.stringify(route.path)}, sourceKey: ${JSON.stringify(route.sourceKey)} })`,
    ).join(", ");
    const command = descriptor.command === undefined
      ? undefined
      : `Object.freeze({ name: ${JSON.stringify(descriptor.command.name)}, prefix: Object.freeze(${JSON.stringify(descriptor.command.prefix)}) })`;
    const fields = [
      `name: ${JSON.stringify(descriptor.name)}`,
      `kind: ${JSON.stringify(descriptor.kind)}`,
      `routes: Object.freeze([${routes}])`,
      ...(command === undefined ? [] : [`command: ${command}`]),
      ...(descriptor.responseMode === undefined ? [] : [`responseMode: ${JSON.stringify(descriptor.responseMode)}`]),
    ];
    return `  Object.freeze({ ${fields.join(", ")} }),`;
  }).join("\n");

  return `// Generated by scripts/check-admin-api.mjs from the pinned Holm route ledger.\n// Do not edit by hand; update the ledger and regenerate so review can trace drift.\n\nimport type {\n  AdminMethodDescriptor,\n  AdminPathValue,\n  AdminRouteMethod,\n  AdminUrlHelper,\n} from "./types.js";\n\nexport const adminMethodDescriptors = Object.freeze([\n${descriptorText}\n] as const) satisfies readonly AdminMethodDescriptor[];\n\nexport type AdminMethodName = (typeof adminMethodDescriptors)[number]["name"];\n\n${renderInterface("AdminGeneratedApi", tree, 0)}\n`;
}

function renderInterface(name, node, depth) {
  const indent = "  ".repeat(depth);
  const childIndent = "  ".repeat(depth + 1);
  const lines = [`${indent}export interface ${name} {`];
  for (const key of Object.keys(node).sort()) {
    const value = node[key];
    if (value.name !== undefined) {
      const parameters = [...new Set(value.routes.flatMap((route) => pathParameters(route.path)))].sort();
      const everyRouteNeedsPath = value.routes.every((route) => pathParameters(route.path).length > 0);
      const forceInput = value.kind === "upload" || value.kind === "composite-upload";
      const pathType = parameters.length === 0
        ? "Record<never, AdminPathValue>"
        : `{ readonly ${parameters.map((parameter) => `${safeProperty(parameter)}${everyRouteNeedsPath ? "" : "?"}: AdminPathValue`).join("; readonly ")} }`;
      const methodType = value.kind === "url" ? "AdminUrlHelper" : "AdminRouteMethod";
      lines.push(`${childIndent}readonly ${safeProperty(key)}: ${methodType}<${JSON.stringify(value.name)}, ${pathType}, ${everyRouteNeedsPath}, ${everyRouteNeedsPath || forceInput}>;`);
    } else {
      lines.push(`${childIndent}readonly ${safeProperty(key)}: {`);
      lines.push(...renderObjectMembers(value, depth + 2));
      lines.push(`${childIndent}};`);
    }
  }
  lines.push(`${indent}}`);
  return lines.join("\n");
}

function renderObjectMembers(node, depth) {
  const indent = "  ".repeat(depth);
  const lines = [];
  for (const key of Object.keys(node).sort()) {
    const value = node[key];
    if (value.name !== undefined) {
      const parameters = [...new Set(value.routes.flatMap((route) => pathParameters(route.path)))].sort();
      const everyRouteNeedsPath = value.routes.every((route) => pathParameters(route.path).length > 0);
      const forceInput = value.kind === "upload" || value.kind === "composite-upload";
      const pathType = parameters.length === 0
        ? "Record<never, AdminPathValue>"
        : `{ readonly ${parameters.map((parameter) => `${safeProperty(parameter)}${everyRouteNeedsPath ? "" : "?"}: AdminPathValue`).join("; readonly ")} }`;
      const methodType = value.kind === "url" ? "AdminUrlHelper" : "AdminRouteMethod";
      lines.push(`${indent}readonly ${safeProperty(key)}: ${methodType}<${JSON.stringify(value.name)}, ${pathType}, ${everyRouteNeedsPath}, ${everyRouteNeedsPath || forceInput}>;`);
    } else {
      lines.push(`${indent}readonly ${safeProperty(key)}: {`);
      lines.push(...renderObjectMembers(value, depth + 1));
      lines.push(`${indent}};`);
    }
  }
  return lines;
}

function pathParameters(path) {
  return [...path.matchAll(/\{([A-Za-z0-9_]+)(?:\.\.\.)?\}/g)].map((match) => match[1]);
}

function safeProperty(value) {
  return /^[A-Za-z_$][\w$]*$/.test(value) ? value : JSON.stringify(value);
}
