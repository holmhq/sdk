import { readFileSync } from "node:fs";

// Maintainers may supply a JSON export of the public admin route inventory.
// Never import or execute another repository's implementation from this tree.
const args = process.argv.slice(2);
if (args.length > 1) throw new Error("Usage: check-admin-holm-authority.mjs [authority.json]");
const authorityFile = args[0] ?? process.env.HOLM_ADMIN_AUTHORITY_FILE?.trim();
if (!authorityFile) {
  console.log("Holm admin authority check skipped: supply an authority JSON file or HOLM_ADMIN_AUTHORITY_FILE.");
} else {
  const ledger = JSON.parse(readFileSync("koder/evidence/004_issue008_admin_routes/route-audit.json", "utf8"));
  const authority = JSON.parse(readFileSync(authorityFile, "utf8"));
  if (typeof authority.version !== "string" || !/^\d+\.\d+\.\d+$/.test(authority.version)) {
    throw new Error("authority export must identify a public Holm version");
  }
  const entries = (rows) => rows.map(({ sourceKey, methods, path, sdk, helper, notes }) => ({
    sourceKey, methods, path, sdk,
    ...(helper === true ? { helper: true } : {}),
    ...(notes === undefined ? {} : { notes }),
  }));
  const exclusions = (rows) => rows.map(({ sourceKey, rationale }) => ({ sourceKey, rationale }));
  for (const [label, normalize] of [["entries", entries], ["exclusions", exclusions]]) {
    if (!Array.isArray(authority[label]) || JSON.stringify(normalize(ledger[label])) !== JSON.stringify(normalize(authority[label]))) {
      throw new Error(`public admin ${label} drifted; review the versioned HTTP contract before updating the ledger`);
    }
  }
  const methodCount = new Set(authority.entries.flatMap((entry) => entry.sdk)).size;
  const routeCount = authority.entries.reduce((count, entry) => count + entry.methods.length, 0);
  console.log(`Holm admin authority check passed for Holm ${authority.version}: ${authority.entries.length} keys, ${routeCount} route/method contracts, ${methodCount} methods, ${authority.exclusions.length} exclusions.`);
}
