import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  createCapabilityRegistry,
  createExtensionGraph,
  createExtensionLifecycle,
  createLifecycleController,
  ExtensionError,
  LifecycleError,
  UnsupportedCapabilityError,
  type ExtensionSetupContext,
  type HolmExtension,
} from "../../../src/core/index.js";
import { createCapabilityRuntimeUpdater } from "../../../src/core/capabilities.js";

interface ExtensionFixtureOptions<Api> {
  readonly id: string;
  readonly namespace: string;
  readonly api?: Api;
  readonly version?: { readonly major: number; readonly minor: number };
  readonly requiresExtensions?: readonly { readonly id: string; readonly major: number; readonly minMinor?: number }[];
  readonly requiresCapabilities?: readonly { readonly id: string; readonly major: number; readonly minMinor?: number }[];
  readonly conflicts?: readonly string[];
  readonly setup?: (context: ExtensionSetupContext) => {
    readonly api: Api;
    start?(): void | Promise<void>;
    dispose?(): void | Promise<void>;
  };
}

function extension<Api extends object = { readonly ok: true }>(
  options: ExtensionFixtureOptions<Api>,
): HolmExtension<Api> {
  const api = options.api ?? ({ ok: true } as Api);
  return {
    id: options.id,
    namespace: options.namespace,
    version: options.version ?? { major: 1, minor: 0 },
    ...(options.requiresExtensions === undefined ? {} : { requiresExtensions: options.requiresExtensions }),
    ...(options.requiresCapabilities === undefined ? {} : { requiresCapabilities: options.requiresCapabilities }),
    ...(options.conflicts === undefined ? {} : { conflicts: options.conflicts }),
    setup: options.setup ?? (() => ({ api })),
  };
}

function testCapabilities() {
  return createCapabilityRegistry([{ id: "com.example.runtime", origin: "runtime", version: { major: 1, minor: 2 } }]);
}

test("extensions reject duplicate ids and namespaces before setup side effects", () => {
  const effects: string[] = [];
  const first = extension({
    id: "com.example.reports",
    namespace: "reports",
    setup: () => {
      effects.push("setup:first");
      return { api: { ok: true } };
    },
  });

  assert.throws(
    () =>
      createExtensionLifecycle(
        [
          first,
          extension({ id: "com.example.reports", namespace: "analytics" }),
        ],
        { capabilities: testCapabilities() },
      ),
    (error: unknown) =>
      error instanceof ExtensionError &&
      error.kind === "extension" &&
      error.code === "duplicate_extension_id",
  );
  assert.throws(
    () =>
      createExtensionLifecycle(
        [
          first,
          extension({ id: "com.example.analytics", namespace: "reports" }),
        ],
        { capabilities: testCapabilities() },
      ),
    (error: unknown) => error instanceof ExtensionError && error.code === "duplicate_extension_namespace",
  );
  assert.throws(
    () =>
      createExtensionLifecycle([extension({ id: "com.example.lifecycle", namespace: "lifecycle" })], {
        capabilities: testCapabilities(),
      }),
    (error: unknown) => error instanceof ExtensionError && error.code === "reserved_extension_namespace",
  );
  assert.deepEqual(effects, []);
});

test("extensions reject missing incompatible cyclic and conflicting graph edges before setup", () => {
  const effects: string[] = [];

  assert.throws(
    () =>
      createExtensionGraph([
        extension({
          id: "com.example.reports",
          namespace: "reports",
          requiresExtensions: [{ id: "com.example.missing", major: 1 }],
          setup: () => {
            effects.push("setup");
            return { api: { ok: true } };
          },
        }),
      ]),
    (error: unknown) => error instanceof ExtensionError && error.code === "missing_extension_dependency",
  );
  assert.throws(
    () =>
      createExtensionGraph([
        extension({ id: "com.example.base", namespace: "base", version: { major: 1, minor: 0 } }),
        extension({
          id: "com.example.reports",
          namespace: "reports",
          requiresExtensions: [{ id: "com.example.base", major: 1, minMinor: 1 }],
        }),
      ]),
    (error: unknown) => error instanceof ExtensionError && error.code === "extension_dependency_version_mismatch",
  );
  assert.throws(
    () =>
      createExtensionGraph([
        extension({
          id: "com.example.alpha",
          namespace: "alpha",
          requiresExtensions: [{ id: "com.example.bravo", major: 1 }],
        }),
        extension({
          id: "com.example.bravo",
          namespace: "bravo",
          requiresExtensions: [{ id: "com.example.alpha", major: 1 }],
        }),
      ]),
    (error: unknown) => error instanceof ExtensionError && error.code === "extension_dependency_cycle",
  );
  assert.throws(
    () =>
      createExtensionGraph([
        extension({ id: "com.example.alpha", namespace: "alpha", conflicts: ["com.example.bravo"] }),
        extension({ id: "com.example.bravo", namespace: "bravo" }),
      ]),
    (error: unknown) => error instanceof ExtensionError && error.code === "extension_conflict",
  );
  assert.deepEqual(effects, []);
});

test("extensions reject invalid descriptors and keep ready-set ordering stable", () => {
  assert.throws(
    () => createExtensionGraph([extension({ id: "unscoped", namespace: "bad" })]),
    (error: unknown) => error instanceof ExtensionError && error.code === "invalid_extension_id",
  );
  assert.throws(
    () => createExtensionGraph([extension({ id: "com.example.bad", namespace: "not-valid" })]),
    (error: unknown) => error instanceof ExtensionError && error.code === "invalid_extension_namespace",
  );
  assert.throws(
    () =>
      createExtensionGraph([
        extension({ id: "com.example.bad", namespace: "bad", version: { major: 1, minor: -1 } }),
      ]),
    (error: unknown) => error instanceof ExtensionError && error.code === "invalid_extension_version",
  );

  const graph = createExtensionGraph([
    extension({ id: "com.example.zulu", namespace: "zulu", conflicts: ["com.example.absent"] }),
    extension({
      id: "com.example.alpha",
      namespace: "alpha",
      requiresExtensions: [{ id: "com.example.base", major: 1 }],
    }),
    extension({
      id: "com.example.bravo",
      namespace: "bravo",
      requiresExtensions: [{ id: "com.example.base", major: 1 }],
    }),
    extension({ id: "com.example.base", namespace: "base" }),
  ]);

  assert.deepEqual(graph.ids, [
    "com.example.base",
    "com.example.alpha",
    "com.example.bravo",
    "com.example.zulu",
  ]);
  assert.equal(graph.get("com.example.alpha")?.namespace, "alpha");
  assert.equal(graph.get("com.example.missing"), undefined);
});

test("extensions validate runtime capabilities before setup side effects", () => {
  const effects: string[] = [];

  assert.throws(
    () =>
      createExtensionLifecycle(
        [
          extension({
            id: "com.example.reports",
            namespace: "reports",
            requiresCapabilities: [{ id: "com.example.missing", major: 1 }],
            setup: () => {
              effects.push("setup");
              return { api: { ok: true } };
            },
          }),
        ],
        { capabilities: testCapabilities() },
      ),
    UnsupportedCapabilityError,
  );
  assert.deepEqual(effects, []);
});

test("extensions wrap setup failures and freeze cyclic extension APIs", () => {
  assert.throws(
    () =>
      createExtensionLifecycle(
        [
          extension({
            id: "com.example.broken",
            namespace: "broken",
            setup: () => {
              throw new Error("setup failed");
            },
          }),
        ],
        { capabilities: testCapabilities() },
      ),
    (error: unknown) => error instanceof ExtensionError && error.code === "extension_setup_failed",
  );

  const api: { readonly label: string; self?: unknown } = { label: "cyclic" };
  api.self = api;
  const lifecycle = createExtensionLifecycle(
    [extension({ id: "com.example.cyclic", namespace: "cyclic", api })],
    { capabilities: testCapabilities() },
  );

  assert.equal(lifecycle.getNamespace("missing"), undefined);
  assert.equal(Object.isFrozen(lifecycle.namespaces.cyclic), true);
  assert.equal((lifecycle.namespaces.cyclic as typeof api).self, lifecycle.namespaces.cyclic);
});

test("extensions rollback prior setup components in reverse order when later setup fails", () => {
  const effects: string[] = [];
  const setupFailure = new Error("charlie setup failed");
  const cleanupFailure = new Error("alpha setup rollback failed");

  assert.throws(
    () =>
      createExtensionLifecycle(
        [
          extension({
            id: "com.example.alpha",
            namespace: "alpha",
            setup: () => {
              effects.push("setup:alpha");
              return {
                api: { ok: true },
                dispose: () => {
                  effects.push("dispose:alpha");
                  throw cleanupFailure;
                },
              };
            },
          }),
          extension({
            id: "com.example.bravo",
            namespace: "bravo",
            setup: () => {
              effects.push("setup:bravo");
              return {
                api: { ok: true },
                dispose: () => {
                  effects.push("dispose:bravo");
                },
              };
            },
          }),
          extension({
            id: "com.example.charlie",
            namespace: "charlie",
            setup: () => {
              effects.push("setup:charlie");
              throw setupFailure;
            },
          }),
        ],
        { capabilities: testCapabilities() },
      ),
    (error: unknown) =>
      error instanceof ExtensionError &&
      error.code === "extension_setup_failed" &&
      error.cause instanceof AggregateError &&
      error.cause.errors[0] === setupFailure &&
      error.cause.errors[1] instanceof AggregateError &&
      error.cause.errors[1].errors[0] === cleanupFailure,
  );

  assert.deepEqual(effects, ["setup:alpha", "setup:bravo", "setup:charlie", "dispose:bravo", "dispose:alpha"]);
});

test("extensions report async setup rollback disposers when later setup fails", () => {
  const effects: string[] = [];
  const setupFailure = new Error("bravo setup failed");
  const asyncCleanupFailure = new Error("alpha async setup rollback failed");

  assert.throws(
    () =>
      createExtensionLifecycle(
        [
          extension({
            id: "com.example.alpha",
            namespace: "alpha",
            setup: () => {
              effects.push("setup:alpha");
              return {
                api: { ok: true },
                dispose: () => {
                  effects.push("dispose:alpha");
                  return Promise.reject(asyncCleanupFailure);
                },
              };
            },
          }),
          extension({
            id: "com.example.bravo",
            namespace: "bravo",
            setup: () => {
              effects.push("setup:bravo");
              throw setupFailure;
            },
          }),
        ],
        { capabilities: testCapabilities() },
      ),
    (error: unknown) => {
      if (!(error instanceof ExtensionError) || error.code !== "extension_setup_failed") {
        return false;
      }
      if (!(error.cause instanceof AggregateError) || error.cause.errors[0] !== setupFailure) {
        return false;
      }
      const rollback = error.cause.errors[1];
      if (!(rollback instanceof AggregateError)) {
        return false;
      }
      const asyncRollback = rollback.errors[0];
      return asyncRollback instanceof ExtensionError &&
        asyncRollback.code === "extension_setup_rollback_async_disposer" &&
        (asyncRollback.toJSON().details as { readonly extensionId?: unknown } | undefined)?.extensionId ===
          "com.example.alpha";
    },
  );

  assert.deepEqual(effects, ["setup:alpha", "setup:bravo", "dispose:alpha"]);
});

test("extensions setup and start in deterministic dependency order with frozen namespaces", async () => {
  const effects: string[] = [];
  const lifecycle = createExtensionLifecycle(
    [
      extension({
        id: "com.example.zulu",
        namespace: "zulu",
        setup: () => {
          effects.push("setup:zulu");
          return {
            api: { nested: { value: 1 } },
            start: () => {
              effects.push("start:zulu");
            },
          };
        },
      }),
      extension({
        id: "com.example.alpha",
        namespace: "alpha",
        requiresExtensions: [{ id: "com.example.zulu", major: 1 }],
        setup: () => {
          effects.push("setup:alpha");
          return {
            api: { nested: { value: 2 } },
            start: () => {
              effects.push("start:alpha");
            },
          };
        },
      }),
      extension({
        id: "com.example.bravo",
        namespace: "bravo",
        setup: () => {
          effects.push("setup:bravo");
          return {
            api: { nested: { value: 3 } },
            start: () => {
              effects.push("start:bravo");
            },
          };
        },
      }),
    ],
    { capabilities: testCapabilities() },
  );

  assert.deepEqual(lifecycle.graph.ordered.map((entry) => entry.id), [
    "com.example.bravo",
    "com.example.zulu",
    "com.example.alpha",
  ]);
  assert.deepEqual(effects, ["setup:bravo", "setup:zulu", "setup:alpha"]);
  assert.equal(Object.isFrozen(lifecycle.namespaces), true);
  assert.equal(Object.isFrozen(lifecycle.namespaces.alpha), true);
  assert.equal(Object.isFrozen((lifecycle.namespaces.alpha as { readonly nested: object }).nested), true);
  assert.throws(
    () => {
      (lifecycle.namespaces as { alpha: unknown }).alpha = {};
    },
    TypeError,
  );

  await lifecycle.start();
  await lifecycle.start();

  assert.deepEqual(effects, [
    "setup:bravo",
    "setup:zulu",
    "setup:alpha",
    "start:bravo",
    "start:zulu",
    "start:alpha",
  ]);
  assert.equal(lifecycle.getSnapshot().state, "ready");
  assert.deepEqual(lifecycle.getNamespace("alpha"), lifecycle.namespaces.alpha);
  await lifecycle.dispose();
  await lifecycle.dispose();
  assert.equal(lifecycle.getSnapshot().state, "disposed");
});

test("extensions rollback started components in reverse deterministic order when start fails", async () => {
  const effects: string[] = [];
  const lifecycle = createExtensionLifecycle(
    [
      extension({
        id: "com.example.alpha",
        namespace: "alpha",
        setup: () => ({
          api: { ok: true },
          dispose: () => {
            effects.push("dispose:alpha");
          },
        }),
      }),
      extension({
        id: "com.example.bravo",
        namespace: "bravo",
        setup: () => ({
          api: { ok: true },
          start: () => {
            effects.push("start:bravo");
          },
          dispose: () => {
            effects.push("dispose:bravo");
          },
        }),
      }),
      extension({
        id: "com.example.charlie",
        namespace: "charlie",
        setup: () => ({
          api: { ok: true },
          start: () => {
            effects.push("start:charlie");
            throw new Error("start failed");
          },
          dispose: () => {
            effects.push("dispose:charlie");
          },
        }),
      }),
    ],
    { capabilities: testCapabilities() },
  );

  await assert.rejects(
    () => lifecycle.start(),
    (error: unknown) =>
      error instanceof LifecycleError &&
      error.code === "lifecycle_start_failed" &&
      error.cause instanceof ExtensionError,
  );

  assert.equal(lifecycle.getSnapshot().state, "failed");
  assert.deepEqual(effects, ["start:bravo", "start:charlie", "dispose:bravo", "dispose:alpha"]);
});

test("extensions include rollback cleanup failures in startup errors", async () => {
  const effects: string[] = [];
  const lifecycle = createExtensionLifecycle(
    [
      extension({
        id: "com.example.alpha",
        namespace: "alpha",
        setup: () => ({
          api: { ok: true },
          dispose: () => {
            effects.push("dispose:alpha");
            throw new Error("alpha rollback failed");
          },
        }),
      }),
      extension({
        id: "com.example.bravo",
        namespace: "bravo",
        setup: () => ({
          api: { ok: true },
          start: () => {
            effects.push("start:bravo");
            throw new Error("bravo start failed");
          },
        }),
      }),
    ],
    { capabilities: testCapabilities() },
  );

  await assert.rejects(
    () => lifecycle.start(),
    (error: unknown) =>
      error instanceof LifecycleError &&
      error.cause instanceof ExtensionError &&
      error.cause.cause instanceof AggregateError,
  );

  assert.deepEqual(effects, ["start:bravo", "dispose:alpha"]);
});

test("extensions aggregate disposal failures while continuing reverse cleanup", async () => {
  const effects: string[] = [];
  const lifecycle = createExtensionLifecycle(
    [
      extension({
        id: "com.example.alpha",
        namespace: "alpha",
        setup: () => ({
          api: { ok: true },
          dispose: () => {
            effects.push("dispose:alpha");
            throw new Error("alpha dispose failed");
          },
        }),
      }),
      extension({
        id: "com.example.bravo",
        namespace: "bravo",
        setup: () => ({
          api: { ok: true },
          dispose: () => {
            effects.push("dispose:bravo");
            throw new Error("bravo dispose failed");
          },
        }),
      }),
    ],
    { capabilities: testCapabilities() },
  );

  await lifecycle.start();
  await assert.rejects(
    () => lifecycle.dispose(),
    (error: unknown) =>
      error instanceof LifecycleError &&
      error.cause instanceof ExtensionError &&
      error.cause.cause instanceof AggregateError &&
      error.cause.cause.errors.length === 2,
  );
  await lifecycle.dispose();

  assert.equal(lifecycle.getSnapshot().state, "disposed");
  assert.deepEqual(effects, ["dispose:bravo", "dispose:alpha"]);
});

test("extensions restrict capability offer registration to the sdk namespace and hide the runtime updater", () => {
  const capabilities = createCapabilityRuntimeUpdater([
    { id: "com.example.runtime", origin: "runtime", version: { major: 1, minor: 2 } },
  ]);
  let capturedCapabilities!: ExtensionSetupContext["capabilities"];
  let registerOffer!: ExtensionSetupContext["registerCapabilityOffer"];

  createExtensionLifecycle(
    [
      extension({
        id: "com.example.reports",
        namespace: "reports",
        setup: (context) => {
          capturedCapabilities = context.capabilities;
          registerOffer = context.registerCapabilityOffer;
          return { api: { ok: true } };
        },
      }),
    ],
    { capabilities, registerExtensionOffer: (offer) => capabilities.registerExtensionOffer(offer) },
  );

  assert.equal((capturedCapabilities as unknown as { replaceOffers?: unknown }).replaceOffers, undefined);
  assert.throws(
    () => registerOffer({ id: "holm.fake.offer", version: { major: 1, minor: 0 } }),
    (error: unknown) => error instanceof ExtensionError && error.code === "extension_capability_offer_forbidden",
  );

  const registered = registerOffer({ id: "sdk.reports.export", version: { major: 1, minor: 0 } });

  assert.deepEqual(registered, { id: "sdk.reports.export", origin: "extension", version: { major: 1, minor: 0 } });
  assert.deepEqual(
    capabilities.getSnapshot().offers.find((offer) => offer.id === "sdk.reports.export"),
    { id: "sdk.reports.export", origin: "extension", version: { major: 1, minor: 0 } },
  );
});

test("extensions capability offer registration is unavailable until a runtime wires it, even with a capable registry", () => {
  let unwiredRegisterOffer!: ExtensionSetupContext["registerCapabilityOffer"];

  createExtensionLifecycle(
    [
      extension({
        id: "com.example.unwired",
        namespace: "unwired",
        setup: (context) => {
          unwiredRegisterOffer = context.registerCapabilityOffer;
          return { api: { ok: true } };
        },
      }),
    ],
    { capabilities: createCapabilityRuntimeUpdater([]) },
  );

  assert.throws(
    () => unwiredRegisterOffer({ id: "sdk.reports.export", version: { major: 1, minor: 0 } }),
    (error: unknown) =>
      error instanceof ExtensionError &&
      error.code === "extension_capability_offer_forbidden" &&
      error.cause instanceof ExtensionError &&
      error.cause.code === "extension_capability_offer_registration_unavailable",
  );
});

test("extensions expose an invocation seam that is unavailable until a runtime wires it and forwards requests once wired", async () => {
  let unwiredInvoke!: ExtensionSetupContext["invoke"];
  createExtensionLifecycle(
    [
      extension({
        id: "com.example.unwired",
        namespace: "unwired",
        setup: (context) => {
          unwiredInvoke = context.invoke;
          return { api: { ok: true } };
        },
      }),
    ],
    { capabilities: testCapabilities() },
  );

  await assert.rejects(
    () =>
      unwiredInvoke({
        capability: { id: "com.example.reports", major: 1 },
        operation: "list",
        payload: null,
        requestId: "req-unwired",
      }),
    (error: unknown) => error instanceof ExtensionError && error.code === "extension_invoke_unavailable",
  );

  const seen: unknown[] = [];
  let wiredInvoke!: ExtensionSetupContext["invoke"];
  createExtensionLifecycle(
    [
      extension({
        id: "com.example.wired",
        namespace: "wired",
        setup: (context) => {
          wiredInvoke = context.invoke;
          return { api: { ok: true } };
        },
      }),
    ],
    {
      capabilities: testCapabilities(),
      invoke: async (request) => {
        seen.push(request);
        return { requestId: request.requestId, payload: { ok: true } };
      },
    },
  );

  const response = await wiredInvoke({
    capability: { id: "com.example.reports", major: 1 },
    operation: "list",
    payload: null,
    requestId: "req-wired",
  });

  assert.deepEqual(response, { requestId: "req-wired", payload: { ok: true } });
  assert.equal(seen.length, 1);
});

test("extensions lifecycle controller shares startup and rejects invalid states", async () => {
  const effects: string[] = [];
  let releaseStart!: () => void;
  const controller = createLifecycleController({
    start: () =>
      new Promise<void>((resolve) => {
        effects.push("start");
        releaseStart = resolve;
      }),
    dispose: () => {
      effects.push("dispose");
    },
  });

  const first = controller.start();
  const second = controller.start();
  assert.equal(controller.getSnapshot().state, "starting");
  releaseStart();
  await Promise.all([first, second]);
  controller.assertReady();
  await controller.dispose();
  await controller.dispose();

  assert.equal(controller.getSnapshot().state, "disposed");
  assert.deepEqual(effects, ["start", "dispose"]);
  assert.throws(() => controller.assertReady(), LifecycleError);
  await assert.rejects(() => controller.start(), LifecycleError);
});

test("extensions lifecycle controller handles dispose races and failed startup disposal", async () => {
  const effects: string[] = [];
  let releaseStart!: () => void;
  const pending = createLifecycleController({
    start: () =>
      new Promise<void>((resolve) => {
        effects.push("pending:start");
        releaseStart = resolve;
      }),
    dispose: () => {
      effects.push("pending:dispose");
    },
  });

  const start = pending.start();
  const firstDispose = pending.dispose();
  const secondDispose = pending.dispose();
  releaseStart();
  await Promise.all([start, firstDispose, secondDispose]);

  const failed = createLifecycleController({
    start: () => {
      effects.push("failed:start");
      throw new Error("failed startup");
    },
    dispose: () => {
      effects.push("failed:dispose");
    },
  });
  await assert.rejects(() => failed.start(), LifecycleError);
  await assert.rejects(
    () => failed.start(),
    (error: unknown) => {
      const details = error instanceof LifecycleError
        ? (error.toJSON().details as { readonly state?: unknown } | undefined)
        : undefined;
      return error instanceof LifecycleError && error.code === "lifecycle_start_failed" && details?.state === "failed";
    },
  );
  await failed.dispose();

  const detailed = new LifecycleError({
    code: "custom_lifecycle",
    message: "Custom lifecycle",
    state: "created",
    details: { reason: "test" },
  });

  assert.equal(pending.getSnapshot().state, "disposed");
  assert.equal(failed.getSnapshot().state, "disposed");
  assert.deepEqual(effects, ["pending:start", "pending:dispose", "failed:start", "failed:dispose"]);
  assert.deepEqual(detailed.toJSON().details as unknown, { state: "created", details: { reason: "test" } });
});
