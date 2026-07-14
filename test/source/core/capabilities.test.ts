import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  CapabilityVersionError,
  createCapabilityRegistry,
  DuplicateCapabilityOfferError,
  InvalidCapabilityRequirementError,
  negotiateCapability,
  UnsupportedCapabilityError,
  type CapabilityOffer,
} from "../../../src/core/index.js";
import { createCapabilityRuntimeUpdater, createCapabilityView } from "../../../src/core/capabilities.js";

const runtimeOffer = (id: string, major: number, minor: number): CapabilityOffer => ({
  id,
  origin: "runtime",
  version: { major, minor },
});

test("capabilities match same major and minimum minor using the highest compatible offer", () => {
  const registry = createCapabilityRegistry([
    runtimeOffer("com.example.reports", 1, 0),
    runtimeOffer("com.example.reports", 1, 3),
    runtimeOffer("com.example.reports", 2, 0),
  ]);

  const match = registry.require({ id: "com.example.reports", major: 1, minMinor: 1 });

  assert.deepEqual(match, runtimeOffer("com.example.reports", 1, 3));
  assert.deepEqual(
    negotiateCapability([runtimeOffer("com.example.reports", 1, 2)], {
      id: "com.example.reports",
      major: 1,
    }),
    runtimeOffer("com.example.reports", 1, 2),
  );
});

test("capabilities fail before invocation when a requirement has no usable id", () => {
  const registry = createCapabilityRegistry([runtimeOffer("com.example.reports", 1, 0)]);

  assert.throws(
    () => registry.require({ major: 1 } as unknown as { readonly id: string; readonly major: number }),
    (error: unknown) =>
      error instanceof InvalidCapabilityRequirementError &&
      error.kind === "capability" &&
      error.code === "invalid_capability_requirement",
  );
  assert.throws(
    () => registry.require({ id: "unscoped", major: 1 }),
    (error: unknown) =>
      error instanceof InvalidCapabilityRequirementError &&
      error.message.includes("dot-separated"),
  );
  assert.throws(
    () => registry.require({ id: " com.example.reports", major: 1 }),
    (error: unknown) =>
      error instanceof InvalidCapabilityRequirementError &&
      error.message.includes("whitespace"),
  );
  assert.throws(
    () => registry.require({ id: "com.example.reports", major: -1 }),
    (error: unknown) =>
      error instanceof InvalidCapabilityRequirementError &&
      error.message.includes("non-negative integer"),
  );
});

test("capabilities distinguish absent ids from incompatible versions", () => {
  const registry = createCapabilityRegistry([
    runtimeOffer("com.example.reports", 1, 1),
    runtimeOffer("com.example.analytics", 2, 0),
  ]);

  assert.throws(
    () => registry.require({ id: "com.example.missing", major: 1 }),
    (error: unknown) =>
      error instanceof UnsupportedCapabilityError &&
      error.kind === "capability" &&
      error.code === "unsupported_capability",
  );
  assert.equal(registry.match({ id: "com.example.missing", major: 1 }), undefined);
  assert.throws(
    () => registry.require({ id: "com.example.analytics", major: 1 }),
    (error: unknown) =>
      error instanceof CapabilityVersionError &&
      error.kind === "capability" &&
      error.code === "capability_version_mismatch",
  );
});

test("capabilities reject offered minors below the requirement minimum", () => {
  const registry = createCapabilityRegistry([runtimeOffer("com.example.reports", 1, 1)]);

  assert.throws(
    () => registry.require({ id: "com.example.reports", major: 1, minMinor: 2 }),
    (error: unknown) =>
      error instanceof CapabilityVersionError &&
      error.toJSON().details !== undefined &&
      JSON.stringify(error.toJSON().details).includes('"minMinor":2'),
  );
});

test("capabilities reject duplicate offers before publishing a snapshot", () => {
  assert.throws(
    () =>
      createCapabilityRegistry([
        runtimeOffer("com.example.reports", 1, 0),
        { ...runtimeOffer("com.example.reports", 1, 0), origin: "extension" },
      ]),
    DuplicateCapabilityOfferError,
  );
  assert.throws(
    () => createCapabilityRegistry([{ ...runtimeOffer("com.example.reports", 1, 0), origin: "bad" as "runtime" }]),
    InvalidCapabilityRequirementError,
  );
  assert.throws(
    () => createCapabilityRegistry([runtimeOffer("com.example.reports", 1.5, 0)]),
    InvalidCapabilityRequirementError,
  );
});

test("capabilities expose snapshots and offers as immutable copies", () => {
  const mutable = [runtimeOffer("com.example.reports", 1, 0)];
  const registry = createCapabilityRegistry(mutable);
  const snapshot = registry.getSnapshot();

  mutable[0] = runtimeOffer("com.example.reports", 1, 9);

  assert.deepEqual(snapshot.offers[0], runtimeOffer("com.example.reports", 1, 0));
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.offers), true);
  assert.equal(Object.isFrozen(snapshot.offers[0]), true);
  assert.equal(Object.isFrozen(snapshot.offers[0]?.version), true);
});

test("capabilities subscriptions receive replacement snapshots safely", () => {
  const registry = createCapabilityRuntimeUpdater([runtimeOffer("com.example.reports", 1, 0)]);
  const seen: (readonly CapabilityOffer[])[] = [];
  let unsubscribe = (): void => {};
  unsubscribe = registry.subscribe((snapshot) => {
    seen.push(snapshot.offers);
    unsubscribe();
  });

  registry.replaceOffers([runtimeOffer("com.example.reports", 1, 1)]);
  registry.replaceOffers([runtimeOffer("com.example.reports", 1, 2)]);
  unsubscribe();

  assert.deepEqual(seen, [[runtimeOffer("com.example.reports", 1, 1)]]);
  assert.equal(registry.getSnapshot().revision, 2);
});

test("public capability registry factory returns a read-only view with no runtime mutation seam", () => {
  const registry = createCapabilityRegistry([runtimeOffer("com.example.reports", 1, 0)]);

  assert.deepEqual(registry.require({ id: "com.example.reports", major: 1 }), runtimeOffer("com.example.reports", 1, 0));
  assert.equal((registry as unknown as { replaceOffers?: unknown }).replaceOffers, undefined);
  assert.throws(
    () => (registry as unknown as { replaceOffers(offers: readonly CapabilityOffer[]): unknown }).replaceOffers([]),
    TypeError,
  );
});

test("capability view exposes read-only access and cannot replace or forge holm offers", () => {
  const registry = createCapabilityRuntimeUpdater([runtimeOffer("holm.core.session", 1, 0)]);
  const view = createCapabilityView(registry);

  assert.deepEqual(view.getSnapshot(), registry.getSnapshot());
  assert.deepEqual(view.require({ id: "holm.core.session", major: 1 }), runtimeOffer("holm.core.session", 1, 0));
  assert.equal((view as unknown as { replaceOffers?: unknown }).replaceOffers, undefined);
  assert.throws(
    () => (view as unknown as { replaceOffers(offers: readonly CapabilityOffer[]): unknown }).replaceOffers([]),
    TypeError,
  );

  registry.replaceOffers([runtimeOffer("holm.core.session", 1, 1)]);
  assert.deepEqual(view.getSnapshot().offers, [runtimeOffer("holm.core.session", 1, 1)]);
});

test("capabilities merge extension-registered sdk offers with runtime offers and enforce the sdk namespace", () => {
  const registry = createCapabilityRuntimeUpdater([runtimeOffer("holm.core.session", 1, 0)]);

  assert.throws(
    () =>
      registry.registerExtensionOffer({ id: "holm.fake.offer", origin: "extension", version: { major: 1, minor: 0 } }),
    InvalidCapabilityRequirementError,
  );

  const registered = registry.registerExtensionOffer({
    id: "sdk.reports.export",
    origin: "runtime",
    version: { major: 1, minor: 0 },
  });

  assert.deepEqual(registered, { id: "sdk.reports.export", origin: "extension", version: { major: 1, minor: 0 } });
  assert.deepEqual(registry.getSnapshot().offers, [
    runtimeOffer("holm.core.session", 1, 0),
    { id: "sdk.reports.export", origin: "extension", version: { major: 1, minor: 0 } },
  ]);

  registry.replaceOffers([runtimeOffer("holm.core.session", 1, 1)]);
  assert.deepEqual(registry.getSnapshot().offers, [
    runtimeOffer("holm.core.session", 1, 1),
    { id: "sdk.reports.export", origin: "extension", version: { major: 1, minor: 0 } },
  ]);
});

test("capabilities roll back a failed duplicate extension offer registration so later runtime replacement succeeds", () => {
  const registry = createCapabilityRuntimeUpdater([runtimeOffer("holm.core.session", 1, 0)]);
  const sdkOffer = { id: "sdk.reports.export", origin: "extension" as const, version: { major: 1, minor: 0 } };

  registry.registerExtensionOffer(sdkOffer);

  assert.throws(() => registry.registerExtensionOffer(sdkOffer), DuplicateCapabilityOfferError);
  assert.deepEqual(registry.getSnapshot().offers, [runtimeOffer("holm.core.session", 1, 0), sdkOffer]);

  const snapshot = registry.replaceOffers([runtimeOffer("holm.core.session", 1, 1)]);

  assert.deepEqual(snapshot.offers, [runtimeOffer("holm.core.session", 1, 1), sdkOffer]);
});

test("capabilities roll back a runtime replacement that conflicts with an existing extension offer", () => {
  const registry = createCapabilityRuntimeUpdater([runtimeOffer("holm.core.session", 1, 0)]);
  const sdkOffer = { id: "sdk.reports.export", origin: "extension" as const, version: { major: 1, minor: 0 } };
  registry.registerExtensionOffer(sdkOffer);

  assert.throws(
    () =>
      registry.replaceOffers([
        runtimeOffer("holm.core.session", 1, 1),
        { id: "sdk.reports.export", origin: "runtime", version: { major: 1, minor: 0 } },
      ]),
    DuplicateCapabilityOfferError,
  );
  assert.deepEqual(registry.getSnapshot().offers, [runtimeOffer("holm.core.session", 1, 0), sdkOffer]);

  const snapshot = registry.replaceOffers([runtimeOffer("holm.core.session", 1, 2)]);

  assert.deepEqual(snapshot.offers, [runtimeOffer("holm.core.session", 1, 2), sdkOffer]);
});

test("capabilities subscriptions isolate listener mutation and failures", () => {
  const registry = createCapabilityRuntimeUpdater([runtimeOffer("com.example.reports", 1, 0)]);
  const seen: number[] = [];
  let first = (): void => {};
  first = registry.subscribe(() => {
    seen.push(1);
    first();
  });
  const second = registry.subscribe(() => {
    seen.push(2);
    throw new Error("listener failed");
  });
  const third = registry.subscribe(() => {
    seen.push(3);
    throw new TypeError("listener failed again");
  });

  assert.throws(
    () => registry.replaceOffers([runtimeOffer("com.example.reports", 1, 1)]),
    AggregateError,
  );
  second();
  second();
  third();
  registry.replaceOffers([runtimeOffer("com.example.reports", 1, 2)]);

  assert.deepEqual(seen, [1, 2, 3]);
});
