import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  nonHttpParityIdentity,
  summarizeNonHttpParity,
  validateNonHttpParity,
} from "../../scripts/check-holm-non-http-parity.mjs";

const sha = "a".repeat(64);
const commit = "b".repeat(40);

function entry(lane, overrides = {}) {
  return {
    id: `${lane}:fixture`,
    lane,
    surface: `${lane} fixture surface`,
    authority: "implementation",
    holm_status: "current",
    disposition: "redesigned",
    sdk_status: "candidate",
    operations: [`${lane}.fixture`],
    auth: "Explicit fixture auth boundary.",
    wire: "Explicit fixture wire boundary.",
    lifecycle: "Explicit fixture lifecycle boundary.",
    availability: "Explicit fixture availability boundary.",
    rationale: "Fixture rationale.",
    evidence: [`holm:${lane}.go`],
    ...overrides,
  };
}

function validDocument() {
  const entries = [
    entry("websocket"),
    entry("sobek"),
    entry("node"),
    entry("action-schema"),
  ];
  const document = {
    schema: "holm.sdk.non-http-parity/1",
    source: {
      repository: "holmhq/holm",
      holm_version_marker: "0.208.0",
      holm_commit: commit,
      holm_describe: `v0.208.0-1-g${commit.slice(0, 10)}`,
      tracked_tree_clean: true,
    },
    sdk_baseline: {
      repository: "holmhq/sdk",
      version: "0.2.1",
      commit,
      absent_paths: ["src/actions", "src/realtime"],
    },
    identity_fields: ["lane", "id"],
    sources: entries
      .map((item) => ({
        repository: "holm",
        path: `${item.lane}.go`,
        sha256: sha,
      }))
      .sort((left, right) => left.path.localeCompare(right.path)),
    entries,
  };
  document.expected = summarizeNonHttpParity(entries);
  return document;
}

test("a complete four-lane map validates and summarizes deterministically", () => {
  const document = validDocument();
  const result = validateNonHttpParity(document);

  assert.deepEqual(result.errors, []);
  assert.equal(result.summary.entry_count, 4);
  assert.deepEqual(result.summary.lanes, {
    websocket: 1,
    sobek: 1,
    node: 1,
    "action-schema": 1,
  });
  assert.equal(nonHttpParityIdentity(document.entries[0]), "websocket\u0000websocket:fixture");
});

test("missing lanes and duplicate lane plus id identities fail closed", () => {
  const document = validDocument();
  document.entries.splice(3, 1, { ...document.entries[0] });
  document.expected = summarizeNonHttpParity(document.entries);

  const result = validateNonHttpParity(document);
  assert.ok(result.errors.some((error) => error.includes("duplicate entry identity")));
  assert.ok(result.errors.some((error) => error.includes("required lane action-schema")));
});

test("malformed provenance, unknown vocabulary, and stale source references fail closed", () => {
  const document = validDocument();
  document.source.holm_commit = "not-a-commit";
  document.entries[0] = {
    ...document.entries[0],
    authority: "rumor",
    holm_status: "maybe",
    disposition: "invented",
    sdk_status: "probably",
    evidence: ["holm:missing.go"],
  };
  document.expected = summarizeNonHttpParity(document.entries);

  const result = validateNonHttpParity(document);
  assert.ok(result.errors.some((error) => error.includes("Holm commit")));
  assert.ok(result.errors.some((error) => error.includes("unknown authority")));
  assert.ok(result.errors.some((error) => error.includes("unknown Holm status")));
  assert.ok(result.errors.some((error) => error.includes("unknown disposition")));
  assert.ok(result.errors.some((error) => error.includes("unknown SDK status")));
  assert.ok(result.errors.some((error) => error.includes("unknown source reference")));
});

test("entry order, member order, and expected summary drift are rejected", () => {
  const document = validDocument();
  document.entries[0] = {
    ...document.entries[0],
    operations: ["z.operation", "a.operation"],
  };
  [document.entries[0], document.entries[1]] = [document.entries[1], document.entries[0]];
  document.expected.entry_count = 99;

  const result = validateNonHttpParity(document);
  assert.ok(result.errors.some((error) => error.includes("entries must be ordered")));
  assert.ok(result.errors.some((error) => error.includes("operations must be sorted")));
  assert.ok(result.errors.some((error) => error.includes("summary drifted")));
});
