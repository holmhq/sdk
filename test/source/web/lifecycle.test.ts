import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createWebLifecycle } from "../../../src/web/index.js";

test("web lifecycle exposes visibility and page hooks with deterministic cleanup", () => {
  const document = createEventTarget({ visibilityState: "visible" });
  const page = createEventTarget({});
  const lifecycle = createWebLifecycle({ document, page });
  const events: string[] = [];
  const removeFailing = lifecycle.subscribe(() => {
    throw new Error("observer failure");
  });
  const unsubscribe = lifecycle.subscribe((event) => {
    events.push(`${event.kind}:${event.visibility}:${event.persisted ?? ""}`);
  });

  assert.equal(lifecycle.visibility(), "visible");
  document.visibilityState = "hidden";
  document.emit("visibilitychange", {});
  page.emit("pagehide", { persisted: true });
  page.emit("pageshow", { persisted: false });
  page.emit("pageshow", {});
  page.emit("pagehide", null);

  assert.deepEqual(events, [
    "visibility:hidden:",
    "page-hide:hidden:true",
    "page-show:hidden:false",
    "page-show:hidden:",
    "page-hide:hidden:",
  ]);
  assert.equal(document.listenerCount("visibilitychange"), 1);
  assert.equal(page.listenerCount("pagehide"), 1);
  unsubscribe();
  unsubscribe();
  assert.equal(document.listenerCount("visibilitychange"), 1);
  removeFailing();
  assert.equal(document.listenerCount("visibilitychange"), 0);
  assert.equal(page.listenerCount("pagehide"), 0);

  lifecycle.subscribe(() => undefined);
  lifecycle.dispose();
  lifecycle.dispose();
  assert.equal(document.listenerCount("visibilitychange"), 0);
  assert.equal(page.listenerCount("pageshow"), 0);
  assert.throws(() => lifecycle.subscribe(() => undefined), /disposed/);
});

test("web lifecycle remains usable without ambient browser event targets", () => {
  const ambient = createWebLifecycle();
  assert.equal(ambient.visibility(), "unknown");
  ambient.dispose();

  const lifecycle = createWebLifecycle({ document: null, page: null });
  assert.equal(lifecycle.visibility(), "unknown");
  const unsubscribe = lifecycle.subscribe(() => {
    throw new Error("no events expected");
  });
  unsubscribe();
  lifecycle.dispose();
});

interface FakeTarget {
  visibilityState?: string;
  addEventListener(name: string, listener: (event: unknown) => void): void;
  removeEventListener(name: string, listener: (event: unknown) => void): void;
  emit(name: string, event: unknown): void;
  listenerCount(name: string): number;
}

function createEventTarget(initial: { readonly visibilityState?: string }): FakeTarget {
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  return {
    ...(initial.visibilityState === undefined ? {} : { visibilityState: initial.visibilityState }),
    addEventListener(name, listener) {
      const current = listeners.get(name) ?? new Set();
      current.add(listener);
      listeners.set(name, current);
    },
    removeEventListener(name, listener) {
      listeners.get(name)?.delete(listener);
    },
    emit(name, event) {
      for (const listener of [...(listeners.get(name) ?? [])]) {
        listener(event);
      }
    },
    listenerCount(name) {
      return listeners.get(name)?.size ?? 0;
    },
  };
}
