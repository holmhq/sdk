import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  nonHttpParityIdentity,
  summarizeNonHttpParity,
  validateNonHttpParity,
  verifyPinnedHolmSources,
} from "../../scripts/check-holm-non-http-parity.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const mapPath = join(projectRoot, "koder/evidence/009_holm_non_http_parity/non-http-parity.json");
const sha = "a".repeat(64);
const commit = "b".repeat(40);
const releaseCommit = "c".repeat(40);

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
      captured_at: "2026-08-17",
      nearest_release: {
        tag: "v0.208.0",
        commit: releaseCommit,
      },
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

test("complete Holm capture and nearest-release provenance fail closed", () => {
  const document = validDocument();
  document.source.captured_at = 17;
  document.source.nearest_release = {
    tag: "",
    commit: "not-a-commit",
  };

  const result = validateNonHttpParity(document);
  assert.ok(result.errors.some((error) => error.includes("captured_at")));
  assert.ok(result.errors.some((error) => error.includes("nearest release tag")));
  assert.ok(result.errors.some((error) => error.includes("nearest release commit")));
});

test("Holm status and authority combinations reject absence and supersession contradictions", () => {
  const absent = validDocument();
  absent.entries[0] = {
    ...absent.entries[0],
    holm_status: "absent",
    authority: "implementation",
  };
  absent.expected = summarizeNonHttpParity(absent.entries);
  assert.ok(
    validateNonHttpParity(absent).errors.some((error) => error.includes("absent Holm behavior must use negative-evidence authority")),
  );

  const superseded = validDocument();
  superseded.entries[0] = {
    ...superseded.entries[0],
    holm_status: "superseded",
    authority: "negative-evidence",
  };
  superseded.expected = summarizeNonHttpParity(superseded.entries);
  assert.ok(
    validateNonHttpParity(superseded).errors.some((error) => error.includes("superseded Holm behavior must use converged-design authority")),
  );
});

test("pinned verification resolves the declared nearest release tag", (t) => {
  const root = mkdtempSync(join(tmpdir(), "holm-sdk-non-http-parity-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, ["init", "--quiet"]);

  const document = validDocument();
  for (const source of document.sources) {
    const path = join(root, source.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${source.path}\n`);
    source.sha256 = createHash("sha256").update(readFileSync(path)).digest("hex");
  }
  writeFileSync(join(root, "version.json"), `${JSON.stringify({ version: "0.208.0" })}\n`);
  git(root, ["add", "."]);
  gitCommit(root, "release");
  const pinnedRelease = git(root, ["rev-parse", "HEAD"]);
  git(root, ["tag", "v0.208.0"]);

  writeFileSync(join(root, "post-release.txt"), "post-release\n");
  git(root, ["add", "."]);
  gitCommit(root, "post release");
  const pinnedSource = git(root, ["rev-parse", "HEAD"]);

  document.source.holm_commit = pinnedSource;
  document.source.holm_describe = git(root, ["describe", "--tags", "--always", pinnedSource]);
  document.source.nearest_release.commit = pinnedRelease;
  assert.deepEqual(verifyPinnedHolmSources(document, root), []);

  document.source.nearest_release.commit = pinnedSource;
  assert.ok(
    verifyPinnedHolmSources(document, root).some((error) => error.includes("nearest Holm release tag")),
  );
});

test("operator-admin truth distinguishes role operations from compound guarded calls", () => {
  const map = checkedMap();
  const operatorAdmin = entryById(map, "sobek:operator-admin");
  const adminCapability = entryById(map, "node:app-admin-capabilities");

  assert.match(operatorAdmin.auth, /roles\.remove, roles\.list, and roles\.find.*no general authenticated-caller or manifest-capability guard/i);
  assert.match(operatorAdmin.auth, /roles\.add.*reserved or elevated.*arbitrary app roles.*no blanket guard/i);
  assert.match(adminCapability.auth, /not blanket guards for roles\.remove, roles\.list, roles\.find, or arbitrary-role add/i);
});

test("typed-channel truth pins the per-socket limit and legacy bypass", () => {
  const map = checkedMap();
  for (const id of ["websocket:presence-channels", "websocket:private-channels"]) {
    const claim = Object.values(entryById(map, id)).filter((value) => typeof value === "string").join(" ");
    assert.match(claim, /realtime\.max_channels_per_socket/);
    assert.match(claim, /default 0.*unlimited/i);
    assert.match(claim, /realtime_policy_channel_limit_exceeded/);
  }

  const legacy = Object.values(entryById(map, "websocket:legacy-bare-channels"))
    .filter((value) => typeof value === "string")
    .join(" ");
  assert.match(legacy, /realtime\.max_channels_per_socket/);
  assert.match(legacy, /bypass/i);
});

test("member-storage truth preserves logged-out media method availability", () => {
  const availability = entryById(checkedMap(), "sobek:member-storage").availability;
  assert.match(availability, /no-owner.*only holm\.app\.member\.media\.serve/i);
  assert.match(availability, /media\.probe and media\.transcode.*absent/i);
});

test("Default Projection payloads are direct pinned sources", () => {
  const map = checkedMap();
  const fixture = entryById(map, "action-schema:default-projection-fixture-v1");
  const sourceKeys = new Set(map.sources.map((source) => `${source.repository}:${source.path}`));
  const requiredPayloads = [
    "docs/reference/app-contracts/default-projection/v1/result.schema.json",
    "docs/reference/app-contracts/default-projection/v1/theme-input-v1.schema.json",
    "docs/reference/app-contracts/default-projection/v1/fixtures/discovery-caller-views.json",
    "docs/reference/app-contracts/default-projection/v1/fixtures/invocations.json",
    "docs/reference/app-contracts/default-projection/v1/fixtures/results.json",
    "docs/reference/app-contracts/default-projection/v1/fixtures/presentation/runo-theme-input-v1.json",
  ];

  for (const path of requiredPayloads) {
    assert.ok(sourceKeys.has(`holm:${path}`), `missing direct source ${path}`);
    assert.ok(fixture.evidence.includes(`holm:${path}`), `fixture does not reference ${path}`);
  }
});

function checkedMap() {
  return JSON.parse(readFileSync(mapPath, "utf8"));
}

function entryById(document, id) {
  const found = document.entries.find((item) => item.id === id);
  assert.ok(found, `missing map entry ${id}`);
  return found;
}

function git(root, args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitCommit(root, message) {
  git(root, [
    "-c", "user.name=SDK Test",
    "-c", "user.email=sdk-test@example.invalid",
    "commit", "--quiet", "--message", message,
  ]);
}
