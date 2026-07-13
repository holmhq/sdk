import { spawnSync } from "node:child_process";

import { listFiles } from "./lib/artifacts.mjs";

const patterns = process.argv.slice(2);

const compile = spawnSync("tsc", ["-p", "tsconfig.test-source.json"], {
  stdio: "inherit",
  shell: false,
});
if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const testFiles = listFiles(".tmp/test-source/test/source").filter((path) =>
  path.endsWith(".test.js"),
);
const args = ["--test"];
for (const pattern of patterns) {
  args.push(`--test-name-pattern=${pattern}`);
}
args.push(...testFiles);

const test = spawnSync(process.execPath, args, {
  stdio: "inherit",
  shell: false,
});
process.exit(test.status ?? 1);
