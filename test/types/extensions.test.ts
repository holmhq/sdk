import {
  createCapabilityRegistry,
  createExtensionLifecycle,
  type ExtensionNamespaces,
  type HolmExtension,
} from "../../src/core/index.js";

interface ReportsApi {
  readonly list: () => readonly string[];
  readonly nested: {
    readonly count: () => number;
  };
}

const reports = {
  id: "com.example.reports",
  namespace: "reports",
  version: { major: 1, minor: 0 },
  setup() {
    return {
      api: {
        list: () => ["ready"] as const,
        nested: {
          count: () => 1,
        },
      },
    };
  },
} satisfies HolmExtension<ReportsApi, "reports">;

const lifecycle = createExtensionLifecycle([reports] as const, {
  capabilities: createCapabilityRegistry([]),
});

const namespaces: ExtensionNamespaces<readonly [typeof reports]> = lifecycle.namespaces;
const listed: readonly string[] = lifecycle.namespaces.reports.list();
const namespaced = lifecycle.getNamespace<ReportsApi>("reports");

// @ts-expect-error namespace map is readonly after composition.
lifecycle.namespaces.reports = { list: () => [], nested: { count: () => 0 } };

// @ts-expect-error exposed extension API is deeply readonly.
lifecycle.namespaces.reports.nested = { count: () => 2 };

// @ts-expect-error normalized extension descriptors are readonly values.
lifecycle.graph.ordered[0].id = "com.example.changed";

void namespaces;
void listed;
void namespaced;
