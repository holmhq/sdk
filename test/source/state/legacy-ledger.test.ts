import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const ledgerPath = "koder/evidence/002_issue006_state_legacy/INDEX.md";

test("Issue 006 legacy holm-state disposition ledger is complete and keeps state canonical", () => {
  const ledger = readFileSync(ledgerPath, "utf8");

  assert.match(ledger, /source_commit:\s*11ceae0d88e9c800eb77916e3244fbd231ad81bb/);
  assert.match(ledger, /packages\/holm-state\/src\/remote\.js/);
  assert.match(ledger, /packages\/holm-state\/src\/channel\.js/);
  assert.match(ledger, /packages\/holm-state\/src\/guard\.js/);
  assert.match(ledger, /packages\/holm-state\/src\/route\.js/);
  assert.match(ledger, /packages\/holm-state\/src\/{track\.js,debug\.js\}/);

  for (const primitive of ["remote()", "channel()", "guard()", "route()", "track()", "debug", "ref", "computed", "watch", "effect"]) {
    assert.match(ledger, new RegExp(escapeRegExp(primitive)));
  }

  for (const disposition of ["adopted", "redesigned", "extension-owned", "deferred", "excluded"]) {
    assert.match(ledger, new RegExp(disposition));
  }

  assert.doesNotMatch(ledger, /@holmhq\/sdk\/resources/);
  assert.match(ledger, /@holmhq\/sdk\/state/);
  assert.match(ledger, /Existing Holm `packages\/holm-state` remains live and unmodified/);
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
