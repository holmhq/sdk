import { strict as assert } from "node:assert";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

const script = resolve("scripts/check-public-privacy.mjs");
const authorityScript = resolve("scripts/check-admin-holm-authority.mjs");
const goPath = ["internal", "sample", "routes"].join("/") + "." + "go";
const sha = "a1b2" + "c3d4";

test("optional admin authority skips without a file, accepts matching public data and rejects drift", () => {
  const environment = { ...process.env, HOLM_ADMIN_AUTHORITY_FILE: "" };
  const skipped = spawnSync(process.execPath, [authorityScript], { encoding: "utf8", env: environment });
  assert.equal(skipped.status, 0, skipped.stderr);
  assert.match(skipped.stdout, /skipped/);
  fixture((root) => {
    const ledger = JSON.parse(readFileSync("koder/evidence/004_issue008_admin_routes/route-audit.json", "utf8"));
    const file = join(root, "authority.json");
    const authority = { version: ledger.source.version, entries: ledger.entries, exclusions: ledger.exclusions };
    writeFileSync(file, JSON.stringify(authority));
    const accepted = spawnSync(process.execPath, [authorityScript, file], { encoding: "utf8", env: environment });
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.match(accepted.stdout, /176 keys, 191 route\/method contracts, 218 methods, 18 exclusions/);
    authority.entries[0].path = "/changed";
    writeFileSync(file, JSON.stringify(authority));
    assert.equal(spawnSync(process.execPath, [authorityScript, file], { env: environment }).status, 1);
  });
});

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), "sdk-public-privacy-"));
  try {
    execFileSync("git", ["init", "-q", root]);
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
function check(root, name, content) {
  mkdirSync(join(root, name, ".."), { recursive: true });
  writeFileSync(join(root, name), content);
  execFileSync("git", ["-C", root, "add", name]);
  return spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
}

test("privacy guard rejects paths, contextual commits, and Go provenance in tracked files", () => {
  for (const content of [
    goPath,
    ["cmd", "server", "routes"].join("/"),
    "other." + "go",
    "holm_commit: " + sha,
    "Holm at `" + sha + "`",
    '"source": {"repository":"holmhq/holm", "commit":"' + "a".repeat(40) + '"}',
    '"source_' + 'group": "example' + 'Registry()"',
    "`Example" + "Handler()`",
    "`Example" + "Resolver`",
    "func " + "exampleRegistry() {}",
    "holm_" + "commit: " + "1234" + "5678",
    '"source": {"repository":"holmhq/holm", "commit":"' + "0".repeat(40) + '"}',
    'const sourceCommit = "' + "b".repeat(40) + '";',
  ]) fixture((root) => {
    const result = check(root, "koder/note.md", content);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /koder\/note\.md:1/);
  });
});

test("privacy guard permits public HTTP contracts, versions, SDK paths and action pins", () => {
  fixture((root) => {
    const result = check(root, "note.md", "public; createCapabilityRegistry(); holm.capabilities.replaceOffers(); Holm 0.207.0: GET /api/me needs a member session; src/app/index.ts; https://holmhq.com/llms-full.txt");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /1 tracked file/);
    execFileSync("git", ["-C", root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture"]);
    const own = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    assert.equal(check(root, "note.md", `SDK reviewed at ${own}; Holm 0.207.0`).status, 0);
  });
  fixture((root) => {
    const result = check(root, ".github/workflows/publish.yml", "uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0");
    assert.equal(result.status, 0, result.stderr);
  });
});

test("privacy guard reads working bytes, ignores untracked files, and does not follow symlinks", () => {
  fixture((root) => {
    assert.equal(check(root, "note.md", "public").status, 0);
    writeFileSync(join(root, "untracked.md"), goPath);
    writeFileSync(join(root, "note.md"), goPath);
    const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stderr, /untracked/);
  });
  fixture((root) => {
    execFileSync("ln", ["-s", "/not-a-real-checkout", join(root, "link")]);
    execFileSync("git", ["-C", root, "add", "link"]);
    assert.equal(spawnSync(process.execPath, [script], { cwd: root }).status, 0);
  });
});
