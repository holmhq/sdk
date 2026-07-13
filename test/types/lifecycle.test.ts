import {
  createHolm,
  type Holm,
  type RuntimeAdapter,
} from "../../src/core/index.js";
import { createFakeClock, createInMemoryRuntimeAdapter } from "../../src/test/index.js";

const fake = createFakeClock();
const runtime: RuntimeAdapter = createInMemoryRuntimeAdapter({
  clock: fake.clock,
  scheduler: fake.scheduler,
  offers: [{ id: "com.example.reports", origin: "runtime", version: { major: 1, minor: 0 } }],
});
const holm = createHolm({
  runtime,
  caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
  extensions: [
    {
      id: "com.example.reports",
      namespace: "reports",
      version: { major: 1, minor: 0 },
      setup() {
        return { api: { list: () => ["ready"] as const } };
      },
    },
  ] as const,
});

const typedHolm: Holm = holm;
const listed: readonly string[] = holm.reports.list();

// @ts-expect-error createHolm extension namespaces are readonly.
holm.reports = { list: () => [] };

// @ts-expect-error lifecycle snapshots are immutable.
holm.lifecycle.state = "disposed";

void typedHolm;
void listed;
