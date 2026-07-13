import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { compareSnapshots, snapshotFiles } from "./lib/artifacts.mjs";

if (!existsSync("dist")) {
  console.error("Reproducibility check failed: dist/ is missing. Run npm run build first.");
  process.exit(1);
}

const before = snapshotFiles("dist");
if (before.size === 0) {
  console.error("Reproducibility check failed: dist/ has no generated artifacts.");
  process.exit(1);
}

for (const [command, args] of [
  ["npm", ["run", "build"]],
  ["npm", ["run", "check:licenses"]],
  ["npm", ["run", "size"]],
]) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const after = snapshotFiles("dist");
const changed = compareSnapshots(before, after);
if (changed.length > 0) {
  console.error("Reproducibility check failed: clean regeneration changed dist artifacts:");
  for (const path of changed.slice(0, 20)) {
    console.error(`- ${path}`);
  }
  if (changed.length > 20) {
    console.error(`- ... ${changed.length - 20} more`);
  }
  process.exit(1);
}

console.log(`Reproducibility check passed for ${after.size} dist artifact(s).`);
