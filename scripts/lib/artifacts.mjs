import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const textDecoder = new TextDecoder("utf-8");

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function stableJson(value) {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

export function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortJson(value[key]);
    }
    return sorted;
  }
  return value;
}

export function listFiles(root) {
  const files = [];
  walk(root, files);
  return files.sort();
}

export function listDistFiles() {
  return listFiles("dist");
}

function walk(path, files) {
  const stat = statSync(path, { throwIfNoEntry: false });
  if (!stat) {
    return;
  }
  if (stat.isFile()) {
    files.push(path.split("\\").join("/"));
    return;
  }
  if (!stat.isDirectory()) {
    return;
  }
  for (const entry of readdirSync(path).sort()) {
    walk(join(path, entry), files);
  }
}

export function snapshotFiles(root) {
  const snapshot = new Map();
  for (const path of listFiles(root)) {
    snapshot.set(path, sha256(readFileSync(path)));
  }
  return snapshot;
}

export function compareSnapshots(before, after) {
  const all = new Set([...before.keys(), ...after.keys()]);
  const changed = [];
  for (const path of [...all].sort()) {
    if (before.get(path) !== after.get(path)) {
      changed.push(path);
    }
  }
  return changed;
}

export function artifactRecord(path) {
  const data = readFileSync(path);
  return {
    path: relative(process.cwd(), path).split("\\").join("/"),
    bytes: data.byteLength,
    sha256: sha256(data),
  };
}
