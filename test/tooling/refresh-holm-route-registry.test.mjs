import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const toolPath = join(projectRoot, "scripts/refresh-holm-route-registry.mjs");
const snapshotRelativePath = "koder/evidence/007_holm_v0207_route_registry/route-registry.json";
const snapshotPath = join(projectRoot, snapshotRelativePath);
const releaseCommit = "d66628674232b01e8c95d5b86617bc660d61410f";

function validEnvelope() {
  return {
    error: null,
    meta: { command: "api routes" },
    data: {
      routes: [
        {
          source_group: "internal/handlers/spaces.go",
          lane: "dashboard-admin",
          stability: "stable",
          surface_class: "admin/operator",
          auth_scope: "admin/owner",
          path: "/api/spaces/{space}/keys",
          method: "POST",
        },
        {
          lane: "member-host",
          method: "POST",
          source_group: "internal/handlers/spaces.go",
          path: "/api/spaces/{space}/keys",
          stability: "stable",
          auth_scope: "authenticated API key/session/member token; handler checks space capability",
          surface_class: "app-facing",
        },
      ],
      holm_commit: releaseCommit,
      schema: "holm.route-registry.v1",
      holm_version: "0.207.0",
    },
    ok: true,
  };
}

async function loadTool() {
  return import(pathToFileURL(toolPath).href);
}

function makeWorkspace(t) {
  const root = mkdtempSync(join(tmpdir(), "holm-sdk-route-registry-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeSnapshot(root, bytes) {
  const path = join(root, snapshotRelativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return path;
}

function writeFakeHolm(root) {
  const path = join(root, "fake holm; argv safe.mjs");
  writeFileSync(
    path,
    `#!/usr/bin/env node\nimport { writeFileSync } from "node:fs";\nwriteFileSync(process.env.FAKE_HOLM_ARGS_PATH, JSON.stringify(process.argv.slice(2)));\nif (process.env.FAKE_HOLM_EXIT_CODE) process.exit(Number(process.env.FAKE_HOLM_EXIT_CODE));\nprocess.stdout.write(process.env.FAKE_HOLM_ENVELOPE);\n`,
  );
  chmodSync(path, 0o755);
  return path;
}

function runTool(root, args, environment = {}) {
  return spawnSync(process.execPath, [toolPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...environment },
  });
}

test("valid envelopes preserve multiple Holm lanes sharing method and path", async () => {
  const { normalizeRegistryEnvelope, serializeRegistryEnvelope } = await loadTool();
  const normalized = normalizeRegistryEnvelope(validEnvelope(), "fixture");
  const expected = {
    ok: true,
    data: {
      schema: "holm.route-registry.v1",
      holm_version: "0.207.0",
      holm_commit: releaseCommit,
      routes: [
        {
          method: "POST",
          path: "/api/spaces/{space}/keys",
          auth_scope: "admin/owner",
          surface_class: "admin/operator",
          stability: "stable",
          lane: "dashboard-admin",
          source_group: "internal/handlers/spaces.go",
        },
        {
          method: "POST",
          path: "/api/spaces/{space}/keys",
          auth_scope: "authenticated API key/session/member token; handler checks space capability",
          surface_class: "app-facing",
          stability: "stable",
          lane: "member-host",
          source_group: "internal/handlers/spaces.go",
        },
      ],
    },
    meta: { command: "api routes" },
    error: null,
  };

  assert.deepEqual(normalized, expected);
  assert.deepEqual(Object.keys(normalized), ["ok", "data", "meta", "error"]);
  assert.deepEqual(Object.keys(normalized.data), ["schema", "holm_version", "holm_commit", "routes"]);
  assert.deepEqual(Object.keys(normalized.data.routes[0]), [
    "method",
    "path",
    "auth_scope",
    "surface_class",
    "stability",
    "lane",
    "source_group",
  ]);
  assert.deepEqual(
    normalized.data.routes.map((route) => [route.method, route.path, route.source_group, route.lane]),
    [
      ["POST", "/api/spaces/{space}/keys", "internal/handlers/spaces.go", "dashboard-admin"],
      ["POST", "/api/spaces/{space}/keys", "internal/handlers/spaces.go", "member-host"],
    ],
  );
  assert.equal(serializeRegistryEnvelope(validEnvelope()), `${JSON.stringify(expected, null, 2)}\n`);
});

test("route registry validation fails closed on malformed envelopes and rows", async (t) => {
  const { normalizeRegistryEnvelope } = await loadTool();
  const cases = [
    ["wrong schema", (value) => { value.data.schema = "holm.route-registry.v2"; }, /schema.*holm\.route-registry\.v1/i],
    ["failed envelope", (value) => { value.ok = false; value.error = { code: "failed", message: "nope" }; }, /ok.*true|successful envelope/i],
    ["missing version", (value) => { delete value.data.holm_version; }, /holm_version.*required/i],
    ["missing commit", (value) => { delete value.data.holm_commit; }, /holm_commit.*required/i],
    ["malformed commit", (value) => { value.data.holm_commit = "d6662867"; }, /holm_commit.*40.*hex/i],
    ["empty routes", (value) => { value.data.routes = []; }, /routes.*non-empty/i],
    ["unknown method", (value) => { value.data.routes[0].method = "BREW"; }, /method.*BREW/i],
    ["unknown surface", (value) => { value.data.routes[0].surface_class = "desktop"; }, /surface_class.*desktop/i],
    ["unknown stability", (value) => { value.data.routes[0].stability = "experimental"; }, /stability.*experimental/i],
    ["missing required row field", (value) => { delete value.data.routes[0].lane; }, /routes\[0\]\.lane.*required/i],
    ["duplicate composite identity", (value) => {
      const duplicate = structuredClone(value.data.routes[0]);
      duplicate.auth_scope = "different attributes do not change identity";
      duplicate.surface_class = "app-facing";
      duplicate.stability = "preview";
      value.data.routes.push(duplicate);
    }, /duplicate composite route identity.*POST \/api\/spaces\/\{space\}\/keys.*internal\/handlers\/spaces\.go.*dashboard-admin/i],
  ];

  for (const [name, mutate, pattern] of cases) {
    await t.test(name, () => {
      const value = validEnvelope();
      mutate(value);
      assert.throws(() => normalizeRegistryEnvelope(value, name), pattern);
    });
  }
});

test("--write invokes an argv-safe explicit Holm binary and writes canonical bytes", async (t) => {
  const { serializeRegistryEnvelope } = await loadTool();
  const root = makeWorkspace(t);
  const fakeHolm = writeFakeHolm(root);
  const argsPath = join(root, "holm-args.json");
  const envelope = validEnvelope();
  const result = runTool(root, ["--write", "--holm-bin", fakeHolm], {
    HOLM_BIN: join(root, "must-not-win"),
    FAKE_HOLM_ARGS_PATH: argsPath,
    FAKE_HOLM_ENVELOPE: JSON.stringify(envelope),
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(readFileSync(argsPath, "utf8")), ["api", "routes", "--format", "json"]);
  assert.equal(readFileSync(join(root, snapshotRelativePath), "utf8"), serializeRegistryEnvelope(envelope));
});

test("--check is offline and rejects noncanonical snapshot bytes", async (t) => {
  const { serializeRegistryEnvelope } = await loadTool();
  const root = makeWorkspace(t);
  const markerPath = join(root, "holm-was-run");
  const canonical = serializeRegistryEnvelope(validEnvelope());
  const localSnapshot = writeSnapshot(root, canonical);
  const environment = {
    HOLM_BIN: join(root, "binary-does-not-exist"),
    FAKE_HOLM_ARGS_PATH: markerPath,
  };

  const passing = runTool(root, ["--check"], environment);
  assert.equal(passing.status, 0, passing.stderr || passing.stdout);
  assert.match(passing.stdout, /offline check passed.*2 routes/i);
  assert.equal(existsSync(markerPath), false, "offline check must not execute Holm");

  writeFileSync(localSnapshot, JSON.stringify(validEnvelope()));
  const stale = runTool(root, ["--check"], environment);
  assert.equal(stale.status, 1, stale.stdout);
  assert.match(stale.stderr, /not canonical.*--write/is);
  assert.equal(existsSync(markerPath), false, "noncanonical offline check must not execute Holm");
});

test("--check-live accepts exact data and diagnoses route and provenance drift", async (t) => {
  const { serializeRegistryEnvelope } = await loadTool();
  const root = makeWorkspace(t);
  const fakeHolm = writeFakeHolm(root);
  const argsPath = join(root, "holm-args.json");
  const snapshot = validEnvelope();
  writeSnapshot(root, serializeRegistryEnvelope(snapshot));
  const baseEnvironment = {
    FAKE_HOLM_ARGS_PATH: argsPath,
  };

  const exact = runTool(root, ["--check-live", "--holm-bin", fakeHolm], {
    ...baseEnvironment,
    FAKE_HOLM_ENVELOPE: JSON.stringify(snapshot),
  });
  assert.equal(exact.status, 0, exact.stderr || exact.stdout);
  assert.match(exact.stdout, /live check passed.*2 routes/i);

  const changedRoute = structuredClone(snapshot);
  changedRoute.data.routes[0].auth_scope = "owner plus policy";
  const routeDrift = runTool(root, ["--check-live", "--holm-bin", fakeHolm], {
    ...baseEnvironment,
    FAKE_HOLM_ENVELOPE: JSON.stringify(changedRoute),
  });
  assert.equal(routeDrift.status, 1, routeDrift.stdout);
  assert.match(
    routeDrift.stderr,
    /route POST \/api\/spaces\/\{space\}\/keys \| internal\/handlers\/spaces\.go \| dashboard-admin changed fields: auth_scope/i,
  );

  const changedLane = structuredClone(snapshot);
  changedLane.data.routes[1].lane = "member-host-v2";
  const laneDrift = runTool(root, ["--check-live", "--holm-bin", fakeHolm], {
    ...baseEnvironment,
    FAKE_HOLM_ENVELOPE: JSON.stringify(changedLane),
  });
  assert.equal(laneDrift.status, 1, laneDrift.stdout);
  assert.match(laneDrift.stderr, /route removed: POST \/api\/spaces\/\{space\}\/keys \| internal\/handlers\/spaces\.go \| member-host/i);
  assert.match(laneDrift.stderr, /route added: POST \/api\/spaces\/\{space\}\/keys \| internal\/handlers\/spaces\.go \| member-host-v2/i);
  assert.doesNotMatch(laneDrift.stderr, /changed fields: lane/i);

  const changedSource = structuredClone(snapshot);
  changedSource.data.routes[1].source_group = "internal/handlers/spaces_v2.go";
  const sourceDrift = runTool(root, ["--check-live", "--holm-bin", fakeHolm], {
    ...baseEnvironment,
    FAKE_HOLM_ENVELOPE: JSON.stringify(changedSource),
  });
  assert.equal(sourceDrift.status, 1, sourceDrift.stdout);
  assert.match(sourceDrift.stderr, /route removed: POST \/api\/spaces\/\{space\}\/keys \| internal\/handlers\/spaces\.go \| member-host/i);
  assert.match(sourceDrift.stderr, /route added: POST \/api\/spaces\/\{space\}\/keys \| internal\/handlers\/spaces_v2\.go \| member-host/i);
  assert.doesNotMatch(sourceDrift.stderr, /changed fields: source_group/i);

  const reordered = structuredClone(snapshot);
  reordered.data.routes.reverse();
  const orderDrift = runTool(root, ["--check-live", "--holm-bin", fakeHolm], {
    ...baseEnvironment,
    FAKE_HOLM_ENVELOPE: JSON.stringify(reordered),
  });
  assert.equal(orderDrift.status, 1, orderDrift.stdout);
  assert.match(
    orderDrift.stderr,
    /route order changed at index 0: snapshot POST \/api\/spaces\/\{space\}\/keys \| internal\/handlers\/spaces\.go \| dashboard-admin, live POST \/api\/spaces\/\{space\}\/keys \| internal\/handlers\/spaces\.go \| member-host/i,
  );

  const changedProvenance = structuredClone(snapshot);
  changedProvenance.data.holm_commit = "b".repeat(40);
  const provenanceDrift = runTool(root, ["--check-live", "--holm-bin", fakeHolm], {
    ...baseEnvironment,
    FAKE_HOLM_ENVELOPE: JSON.stringify(changedProvenance),
  });
  assert.equal(provenanceDrift.status, 1, provenanceDrift.stdout);
  assert.match(provenanceDrift.stderr, /holm_commit.*d66628674232b01e8c95d5b86617bc660d61410f.*bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/is);
});

test("checked-in evidence pins the signed Holm v0.207.0 registry", async () => {
  const { normalizeRegistryEnvelope, serializeRegistryEnvelope } = await loadTool();
  const bytes = readFileSync(snapshotPath, "utf8");
  const registry = normalizeRegistryEnvelope(JSON.parse(bytes), snapshotRelativePath);

  assert.equal(registry.data.holm_version, "0.207.0");
  assert.equal(registry.data.holm_commit, releaseCommit);
  assert.equal(registry.data.routes.length, 261);
  assert.equal(bytes, serializeRegistryEnvelope(registry));
});

test("canonical SDK CI runs the offline registry gate and never the live gate", () => {
  const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
  const focusedScript = packageJson.scripts?.["test:holm-route-registry"] ?? "";
  const ciScript = packageJson.scripts?.ci ?? "";
  const workflow = readFileSync(join(projectRoot, ".github/workflows/ci.yml"), "utf8");

  assert.match(focusedScript, /node --test test\/tooling\/refresh-holm-route-registry\.test\.mjs/);
  assert.match(focusedScript, /node scripts\/refresh-holm-route-registry\.mjs --check/);
  assert.doesNotMatch(focusedScript, /--check-live/);
  assert.match(ciScript, /npm run test:holm-route-registry/);
  assert.doesNotMatch(ciScript, /--check-live/);
  assert.match(workflow, /run: npm run ci/);
  assert.doesNotMatch(workflow, /HOLM_BIN|refresh-holm-route-registry\.mjs --check-live/);
});
