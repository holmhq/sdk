import {
  createMutationResource,
  type MutationExecuteContext,
  type MutationResource,
  type ResourceSnapshot,
} from "../../src/state/index.js";
import { HolmError } from "../../src/core/index.js";

interface SavePayload {
  readonly id: string;
  readonly labels: readonly string[];
}

interface SaveResult {
  readonly ok: true;
  readonly version: number;
}

class SaveError extends HolmError {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super({ kind: "remote", code: "save_failed", message: "Save failed." });
    this.retryAfterMs = retryAfterMs;
  }
}

const inferred = createMutationResource({
  source: { id: "runtime-test", surface: "test" },
  caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
  execute(payload: SavePayload, context) {
    const typedPayload: Readonly<SavePayload> = context.payload;
    const fingerprint: string = context.callerFingerprint;
    const reason: string | undefined = context.reason;
    // @ts-expect-error Copied mutation payload arrays are deeply readonly.
    context.payload.labels.push("mutated");
    void typedPayload;
    void fingerprint;
    void reason;
    return { ok: true, version: payload.labels.length } satisfies SaveResult;
  },
  optimistic(payload) {
    const id: string = payload.id;
    void id;
    return { ok: true, version: 0 } satisfies SaveResult;
  },
  invalidates(result, payload) {
    const version: number = result.version;
    const id: string = payload.id;
    return [{ tags: [`report:${id}`, `version:${version}`] }];
  },
});

const inferredResource: MutationResource<SavePayload, SaveResult> = inferred;
const inferredSnapshot: ResourceSnapshot<SaveResult> = inferred.getSnapshot();

async function executeInferred(): Promise<void> {
  const snapshot = await inferred.execute({ id: "report-1", labels: ["draft"] });
  if (snapshot.data !== undefined) {
    const ok: true = snapshot.data.ok;
    const version: number = snapshot.data.version;
    // @ts-expect-error Mutation result arrays/objects are immutable snapshots.
    snapshot.data.version = 2;
    void ok;
    void version;
  }
}

const typedError = createMutationResource<SavePayload, SaveResult, SaveError>({
  source: { id: "runtime-test", surface: "test" },
  caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
  execute() {
    return { ok: true, version: 1 };
  },
  normalizeError(error: unknown, context: MutationExecuteContext<SavePayload>) {
    const id: string = context.payload.id;
    void error;
    void id;
    return new SaveError(1000);
  },
});

async function executeTypedError(): Promise<void> {
  const snapshot = await typedError.execute({ id: "report-1", labels: [] });
  if (snapshot.error !== undefined) {
    const retryAfter: number = snapshot.error.retryAfterMs;
    void retryAfter;
  }
}

createMutationResource<SavePayload, SaveResult>({
  source: { id: "runtime-test", surface: "test" },
  caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
  // @ts-expect-error Mutation payload inference rejects the wrong payload shape.
  execute(payload: { readonly wrong: string }) {
    return { ok: true, version: payload.wrong.length };
  },
});

void inferredResource;
void inferredSnapshot;
void executeInferred;
void executeTypedError;
