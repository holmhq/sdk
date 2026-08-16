import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { adminMethodDescriptors } from "../../../src/admin/index.js";

interface AdminRouteLedger {
  readonly schema: "holm.sdk.admin-route-audit/1";
  readonly source: {
    readonly repository: "holmhq/holm";
    readonly commit: string;
    readonly paths: readonly string[];
  };
  readonly entries: readonly {
    readonly sourceKey: string;
    readonly methods: readonly string[];
    readonly path: string;
    readonly classification: "adopted" | "redesigned";
    readonly sdk: readonly string[];
    readonly rationale: string;
  }[];
  readonly exclusions: readonly {
    readonly sourceKey: string;
    readonly classification: "excluded";
    readonly rationale: string;
  }[];
}

const ledgerPath = "koder/evidence/004_issue008_admin_routes/route-audit.json";

test("Issue 008 classifies every audited admin route and generates every public method", async () => {
  const ledger = JSON.parse(await readFile(ledgerPath, "utf8")) as AdminRouteLedger;
  assert.equal(ledger.schema, "holm.sdk.admin-route-audit/1");
  assert.equal(ledger.source.repository, "holmhq/holm");
  assert.equal(ledger.source.commit, "d66628674232b01e8c95d5b86617bc660d61410f");
  assert.deepEqual(ledger.source.paths, [
    "packages/holm-sdk/admin.audit.js",
    "packages/holm-sdk/admin.js",
    "packages/holm-sdk/surface.audit.js",
  ]);
  assert.equal(ledger.entries.length, 176);
  assert.equal(ledger.entries.reduce((count, entry) => count + entry.methods.length, 0), 191);
  assert.equal(ledger.exclusions.length, 18);
  assert.equal(adminMethodDescriptors.length, 218);

  assert.deepEqual(
    ledger.entries
      .filter((entry) => entry.path.startsWith("/api/system/db/retention/"))
      .map((entry) => ({ methods: entry.methods, path: entry.path, sdk: entry.sdk })),
    [
      {
        methods: ["GET"],
        path: "/api/system/db/retention/status",
        sdk: ["system.dbRetentionStatus"],
      },
      {
        methods: ["POST"],
        path: "/api/system/db/retention/run",
        sdk: ["system.dbRetentionRun"],
      },
    ],
  );

  const expectedPairs = new Set<string>();
  for (const entry of ledger.entries) {
    assert.equal(entry.path.startsWith("/"), true);
    assert.equal(entry.methods.length > 0, true);
    assert.equal(entry.sdk.length > 0, true);
    assert.match(entry.rationale, /\S/);
    for (const method of entry.sdk) expectedPairs.add(`${entry.sourceKey}\0${method}`);
  }
  for (const exclusion of ledger.exclusions) {
    assert.equal(exclusion.classification, "excluded");
    assert.match(exclusion.rationale, /\S/);
  }

  const generatedPairs = new Set(
    adminMethodDescriptors.flatMap((descriptor) =>
      descriptor.routes.map((route) => `${route.sourceKey}\0${descriptor.name}`)),
  );
  assert.deepEqual([...generatedPairs].sort(), [...expectedPairs].sort());
  assert.equal(new Set(adminMethodDescriptors.map((descriptor) => descriptor.name)).size, 218);
  assert.deepEqual(
    adminMethodDescriptors
      .filter((descriptor) => descriptor.name.startsWith("system.dbRetention"))
      .map((descriptor) => ({
        name: descriptor.name,
        requestBody: "requestBody" in descriptor ? descriptor.requestBody : undefined,
      })),
    [
      { name: "system.dbRetentionRun", requestBody: "forbidden" },
      { name: "system.dbRetentionStatus", requestBody: "forbidden" },
    ],
  );
  assert.equal(Object.isFrozen(adminMethodDescriptors), true);
  assert.equal(Object.isFrozen(adminMethodDescriptors[0]), true);
  assert.equal(Object.isFrozen(adminMethodDescriptors[0]?.routes), true);
  assert.equal(Object.isFrozen(adminMethodDescriptors[0]?.routes[0]), true);
  const command = adminMethodDescriptors.find((descriptor) => "command" in descriptor)?.command;
  assert.equal(Object.isFrozen(command), true);
  assert.equal(Object.isFrozen(command?.prefix), true);
});
