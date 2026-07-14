import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  CancelledError,
  type CallerContext,
  type CallerProvider,
} from "../../../src/core/index.js";
import {
  createQueryResource,
  type QueryLoadContext,
} from "../../../src/state/index.js";

interface SecretData {
  readonly owner: string;
  readonly secret: string;
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

function mutableCaller(initial: CallerContext): CallerProvider & { set(next: CallerContext): void } {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    current: () => current,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(next: CallerContext): void {
      current = next;
      for (const listener of [...listeners]) {
        listener();
      }
    },
  };
}

function member(id: string): CallerContext {
  return { surface: "test", principal: { kind: "member", id } };
}

async function flushQueryWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test("state query resources cancel in-flight work and do not leak data across caller resets", async () => {
  const caller = mutableCaller(member("alpha"));
  const loads: QueryLoadContext[] = [];
  const alpha = deferred<SecretData>();
  const beta = deferred<SecretData>();
  const query = createQueryResource<SecretData>({
    key: ["profile"],
    source: { id: "runtime-a", surface: "test" },
    caller,
    load(context) {
      loads.push(context);
      return context.caller.principal.kind === "member" && context.caller.principal.id === "alpha"
        ? alpha.promise
        : beta.promise;
    },
  });

  const alphaRefresh = query.refresh();
  await flushQueryWork();
  assert.equal(loads.length, 1);
  assert.equal(loads[0]?.caller.principal.kind, "member");
  assert.equal(loads[0]?.cancellation.cancelled, false);

  caller.set(member("beta"));
  assert.equal(loads[0]?.cancellation.cancelled, true);
  assert.equal(query.getSnapshot().phase, "loading");
  assert.equal("data" in query.getSnapshot(), false);
  await assert.rejects(alphaRefresh, CancelledError);

  alpha.resolve({ owner: "alpha", secret: "alpha-token" });
  await flushQueryWork();
  assert.equal(loads.length, 2);
  assert.equal(loads[1]?.caller.principal.kind, "member");
  assert.equal(JSON.stringify(query.getSnapshot()).includes("alpha-token"), false);

  beta.resolve({ owner: "beta", secret: "beta-token" });
  const ready = await query.currentLoad();
  assert.equal(ready.phase, "ready");
  assert.deepEqual(ready.data, { owner: "beta", secret: "beta-token" });
  assert.equal(JSON.stringify(ready).includes("alpha-token"), false);
  assert.notEqual(loads[0]?.callerFingerprint, loads[1]?.callerFingerprint);
});

test("state query resources reset runtime source partitions without carrying prior data", async () => {
  const caller = mutableCaller(member("alpha"));
  const loads: QueryLoadContext[] = [];
  const query = createQueryResource<SecretData>({
    key: ["settings"],
    source: { id: "runtime-a", surface: "test" },
    caller,
    load(context) {
      loads.push(context);
      return Promise.resolve({ owner: context.source.id, secret: `${context.source.id}-secret` });
    },
  });

  const first = await query.refresh();
  assert.deepEqual(first.data, { owner: "runtime-a", secret: "runtime-a-secret" });

  const reset = query.reset({ source: { id: "runtime-b", surface: "test" }, reason: "runtime swapped" });
  assert.equal(reset.phase, "loading");
  assert.equal("data" in reset, false);
  const second = await query.currentLoad();
  assert.deepEqual(second.data, { owner: "runtime-b", secret: "runtime-b-secret" });
  assert.equal(JSON.stringify(second).includes("runtime-a-secret"), false);
  assert.notEqual(loads[0]?.cacheKey, loads[1]?.cacheKey);
});
