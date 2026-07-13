import type {
  CapabilityRegistry,
  CapabilityRequirement,
  CapabilityVersion,
} from "./capabilities.js";
import { HolmError } from "./errors.js";
import {
  createLifecycleController,
  type LifecycleController,
  type LifecycleSnapshot,
} from "./lifecycle.js";

export type ReadonlyDeep<T> = T extends (...args: infer Args) => infer Return
  ? (...args: Args) => Return
  : T extends readonly (infer Item)[]
    ? readonly ReadonlyDeep<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: ReadonlyDeep<T[Key]> }
      : T;

export interface ExtensionRequirement {
  readonly id: string;
  readonly major: number;
  readonly minMinor?: number;
}

export interface ExtensionDescriptor {
  readonly id: string;
  readonly version: CapabilityVersion;
  readonly namespace: string;
  readonly requiresExtensions: readonly ExtensionRequirement[];
  readonly requiresCapabilities: readonly CapabilityRequirement[];
  readonly conflicts: readonly string[];
}

export interface ExtensionSetupContext {
  readonly capabilities: CapabilityRegistry;
  readonly extension: ExtensionDescriptor;
}

export interface ExtensionSetupResult<Api = unknown> {
  readonly api: Api;
  start?(): void | Promise<void>;
  dispose?(): void | Promise<void>;
}

export interface HolmExtension<Api = unknown, Namespace extends string = string> {
  readonly id: string;
  readonly version: CapabilityVersion;
  readonly namespace: Namespace;
  readonly requiresExtensions?: readonly ExtensionRequirement[];
  readonly requiresCapabilities?: readonly CapabilityRequirement[];
  readonly conflicts?: readonly string[];
  setup(context: ExtensionSetupContext): ExtensionSetupResult<Api>;
}

export type ExtensionNamespaceMap = Readonly<Record<string, unknown>>;

type ExtensionNamespaceEntry<Extension> = Extension extends HolmExtension<infer Api, infer Namespace>
  ? { readonly [Key in Namespace]: ReadonlyDeep<Api> }
  : never;

type UnionToIntersection<Union> = (Union extends unknown ? (value: Union) => void : never) extends (
  value: infer Intersection,
) => void
  ? Intersection
  : never;

export type ExtensionNamespaces<Extensions extends readonly HolmExtension[]> = Readonly<
  UnionToIntersection<ExtensionNamespaceEntry<Extensions[number]>>
>;

export interface ExtensionGraph {
  readonly ordered: readonly ExtensionDescriptor[];
  readonly ids: readonly string[];
  readonly namespaces: readonly string[];
  get(id: string): ExtensionDescriptor | undefined;
}

export interface ExtensionLifecycle<Namespaces extends object = ExtensionNamespaceMap> {
  readonly graph: ExtensionGraph;
  readonly namespaces: Readonly<Namespaces>;
  getNamespace<Api = unknown>(namespace: string): ReadonlyDeep<Api> | undefined;
  getSnapshot(): LifecycleSnapshot;
  start(): Promise<void>;
  dispose(): Promise<void>;
}

export interface ExtensionLifecycleOptions {
  readonly capabilities: CapabilityRegistry;
}

export interface ExtensionErrorOptions {
  readonly code: string;
  readonly message: string;
  readonly extensionId?: string;
  readonly details?: unknown;
  readonly cause?: unknown;
}

interface NormalizedExtension {
  readonly source: HolmExtension;
  readonly descriptor: ExtensionDescriptor;
}

interface BuiltExtensionGraph {
  readonly graph: ExtensionGraph;
  readonly ordered: readonly NormalizedExtension[];
}

interface ExtensionComponent {
  readonly descriptor: ExtensionDescriptor;
  readonly api: unknown;
  start?(): void | Promise<void>;
  dispose?(): void | Promise<void>;
}

const reservedNamespaces = new Set(["lifecycle", "capabilities", "resources", "extensions"]);

export class ExtensionError extends HolmError {
  constructor(options: ExtensionErrorOptions) {
    super({
      kind: "extension",
      code: options.code,
      message: options.message,
      details: extensionErrorDetails(options),
      cause: options.cause,
    });
    this.name = "ExtensionError";
  }
}

export function createExtensionGraph<const Extensions extends readonly HolmExtension[]>(
  extensions: Extensions,
): ExtensionGraph {
  return buildExtensionGraph(extensions).graph;
}

export function createExtensionLifecycle<const Extensions extends readonly HolmExtension[]>(
  extensions: Extensions,
  options: ExtensionLifecycleOptions,
): ExtensionLifecycle<ExtensionNamespaces<Extensions>> {
  const built = buildExtensionGraph(extensions);
  validateCapabilityRequirements(built.ordered, options.capabilities);
  const components = setupComponents(built.ordered, options);
  return new InstanceExtensionLifecycle(
    built.graph,
    components.namespaces,
    components.ordered,
  ) as unknown as ExtensionLifecycle<ExtensionNamespaces<Extensions>>;
}

class InstanceExtensionLifecycle implements ExtensionLifecycle {
  readonly graph: ExtensionGraph;
  readonly namespaces: ExtensionNamespaceMap;
  readonly #components: readonly ExtensionComponent[];
  readonly #controller: LifecycleController;
  #active: readonly ExtensionComponent[] = [];

  constructor(
    graph: ExtensionGraph,
    namespaces: ExtensionNamespaceMap,
    components: readonly ExtensionComponent[],
  ) {
    this.graph = graph;
    this.namespaces = namespaces;
    this.#components = components;
    this.#controller = createLifecycleController({
      start: () => this.#startComponents(),
      dispose: () => this.#disposeActive(),
    });
  }

  getNamespace<Api = unknown>(namespace: string): ReadonlyDeep<Api> | undefined {
    return this.namespaces[namespace] as ReadonlyDeep<Api> | undefined;
  }

  getSnapshot(): LifecycleSnapshot {
    return this.#controller.getSnapshot();
  }

  start(): Promise<void> {
    return this.#controller.start();
  }

  dispose(): Promise<void> {
    return this.#controller.dispose();
  }

  async #startComponents(): Promise<void> {
    const active: ExtensionComponent[] = [];
    for (const component of this.#components) {
      try {
        await component.start?.();
        active.push(component);
      } catch (error) {
        const rollback = await disposeComponents(active);
        this.#active = [];
        throw new ExtensionError({
          code: "extension_start_failed",
          message: `Extension "${component.descriptor.id}" failed to start.`,
          extensionId: component.descriptor.id,
          cause: rollback ? new AggregateError([error, rollback], "Extension startup and rollback failed.") : error,
        });
      }
    }
    this.#active = Object.freeze([...active]);
  }

  async #disposeActive(): Promise<void> {
    const errors = await disposeComponents(this.#active);
    this.#active = [];
    if (errors) {
      throw new ExtensionError({
        code: "extension_dispose_failed",
        message: "One or more extensions failed to dispose.",
        cause: errors,
      });
    }
  }
}

function buildExtensionGraph(extensions: readonly HolmExtension[]): BuiltExtensionGraph {
  const normalized = extensions.map(normalizeExtension);
  const byId = new Map<string, NormalizedExtension>();
  const byNamespace = new Map<string, NormalizedExtension>();

  for (const extension of normalized) {
    const duplicateId = byId.get(extension.descriptor.id);
    if (duplicateId) {
      throw new ExtensionError({
        code: "duplicate_extension_id",
        message: `Duplicate extension id "${extension.descriptor.id}".`,
        extensionId: extension.descriptor.id,
        details: { existing: duplicateId.descriptor.id, duplicate: extension.descriptor.id },
      });
    }
    const duplicateNamespace = byNamespace.get(extension.descriptor.namespace);
    if (duplicateNamespace) {
      throw new ExtensionError({
        code: "duplicate_extension_namespace",
        message: `Duplicate extension namespace "${extension.descriptor.namespace}".`,
        extensionId: extension.descriptor.id,
        details: {
          namespace: extension.descriptor.namespace,
          existing: duplicateNamespace.descriptor.id,
          duplicate: extension.descriptor.id,
        },
      });
    }
    byId.set(extension.descriptor.id, extension);
    byNamespace.set(extension.descriptor.namespace, extension);
  }

  validateDependencies(normalized, byId);
  validateConflicts(normalized, byId);

  const ordered = orderExtensions(normalized, byId);
  const descriptors = Object.freeze(ordered.map((extension) => extension.descriptor));
  const publicById = new Map(descriptors.map((descriptor) => [descriptor.id, descriptor]));
  const graph = Object.freeze({
    ordered: descriptors,
    ids: Object.freeze(descriptors.map((descriptor) => descriptor.id)),
    namespaces: Object.freeze(descriptors.map((descriptor) => descriptor.namespace)),
    get(id: string): ExtensionDescriptor | undefined {
      return publicById.get(id);
    },
  }) satisfies ExtensionGraph;

  return Object.freeze({
    graph,
    ordered: Object.freeze(ordered),
  });
}

function normalizeExtension(extension: HolmExtension): NormalizedExtension {
  const id = normalizeNamespacedId(extension.id, "extension id");
  const namespace = normalizeNamespace(extension.namespace, id);
  const descriptor = Object.freeze({
    id,
    namespace,
    version: normalizeVersion(extension.version, "extension version"),
    requiresExtensions: Object.freeze((extension.requiresExtensions ?? []).map(normalizeExtensionRequirement)),
    requiresCapabilities: Object.freeze((extension.requiresCapabilities ?? []).map(normalizeCapabilityRequirement)),
    conflicts: Object.freeze((extension.conflicts ?? []).map((conflict) => normalizeNamespacedId(conflict, "conflict id"))),
  }) satisfies ExtensionDescriptor;
  return Object.freeze({ source: extension, descriptor });
}

function validateDependencies(
  extensions: readonly NormalizedExtension[],
  byId: ReadonlyMap<string, NormalizedExtension>,
): void {
  for (const extension of extensions) {
    for (const dependency of extension.descriptor.requiresExtensions) {
      const target = byId.get(dependency.id);
      if (!target) {
        throw new ExtensionError({
          code: "missing_extension_dependency",
          message: `Extension "${extension.descriptor.id}" requires missing extension "${dependency.id}".`,
          extensionId: extension.descriptor.id,
          details: { dependency },
        });
      }
      if (
        target.descriptor.version.major !== dependency.major ||
        target.descriptor.version.minor < (dependency.minMinor ?? 0)
      ) {
        throw new ExtensionError({
          code: "extension_dependency_version_mismatch",
          message: `Extension "${extension.descriptor.id}" requires an incompatible version of "${dependency.id}".`,
          extensionId: extension.descriptor.id,
          details: { dependency, offered: target.descriptor.version },
        });
      }
    }
  }
}

function validateConflicts(
  extensions: readonly NormalizedExtension[],
  byId: ReadonlyMap<string, NormalizedExtension>,
): void {
  for (const extension of extensions) {
    for (const conflict of extension.descriptor.conflicts) {
      if (!byId.has(conflict)) {
        continue;
      }
      throw new ExtensionError({
        code: "extension_conflict",
        message: `Extension "${extension.descriptor.id}" conflicts with "${conflict}".`,
        extensionId: extension.descriptor.id,
        details: { conflict },
      });
    }
  }
}

function orderExtensions(
  extensions: readonly NormalizedExtension[],
  byId: ReadonlyMap<string, NormalizedExtension>,
): readonly NormalizedExtension[] {
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const extension of extensions) {
    indegree.set(extension.descriptor.id, extension.descriptor.requiresExtensions.length);
    for (const dependency of extension.descriptor.requiresExtensions) {
      const list = dependents.get(dependency.id) ?? [];
      list.push(extension.descriptor.id);
      dependents.set(dependency.id, list);
    }
  }

  const ready = [...indegree.entries()]
    .filter(([, count]) => count === 0)
    .map(([id]) => id)
    .sort(compareStrings);
  const ordered: NormalizedExtension[] = [];

  while (ready.length > 0) {
    const id = ready.shift() as string;
    const extension = byId.get(id) as NormalizedExtension;
    ordered.push(extension);
    for (const dependent of [...(dependents.get(id) ?? [])].sort(compareStrings)) {
      const nextCount = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, nextCount);
      if (nextCount === 0) {
        insertSorted(ready, dependent);
      }
    }
  }

  if (ordered.length !== extensions.length) {
    const cycle = [...indegree.entries()]
      .filter(([, count]) => count > 0)
      .map(([id]) => id)
      .sort(compareStrings);
    throw new ExtensionError({
      code: "extension_dependency_cycle",
      message: "Extension dependency graph contains a cycle.",
      details: { cycle },
    });
  }

  return Object.freeze(ordered);
}

function validateCapabilityRequirements(
  extensions: readonly NormalizedExtension[],
  capabilities: CapabilityRegistry,
): void {
  for (const extension of extensions) {
    for (const requirement of extension.descriptor.requiresCapabilities) {
      capabilities.require(requirement);
    }
  }
}

function setupComponents(
  extensions: readonly NormalizedExtension[],
  options: ExtensionLifecycleOptions,
): { readonly ordered: readonly ExtensionComponent[]; readonly namespaces: ExtensionNamespaceMap } {
  const ordered: ExtensionComponent[] = [];
  const namespaces: Record<string, unknown> = {};

  for (const extension of extensions) {
    let result: ExtensionSetupResult;
    try {
      result = extension.source.setup(
        Object.freeze({
          capabilities: options.capabilities,
          extension: extension.descriptor,
        }),
      );
    } catch (error) {
      throw new ExtensionError({
        code: "extension_setup_failed",
        message: `Extension "${extension.descriptor.id}" failed during setup.`,
        extensionId: extension.descriptor.id,
        cause: error,
      });
    }
    const api = deepFreeze(result.api);
    namespaces[extension.descriptor.namespace] = api;
    const start = result.start;
    const dispose = result.dispose;
    ordered.push(
      Object.freeze({
        descriptor: extension.descriptor,
        api,
        ...(start === undefined ? {} : { start: () => start() }),
        ...(dispose === undefined ? {} : { dispose: () => dispose() }),
      }),
    );
  }

  return Object.freeze({
    ordered: Object.freeze(ordered),
    namespaces: Object.freeze(namespaces),
  });
}

async function disposeComponents(components: readonly ExtensionComponent[]): Promise<AggregateError | undefined> {
  const errors: unknown[] = [];
  for (const component of [...components].reverse()) {
    try {
      await component.dispose?.();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 0) {
    return undefined;
  }
  return new AggregateError(errors, "One or more extension disposers failed.");
}

function normalizeExtensionRequirement(requirement: ExtensionRequirement): ExtensionRequirement {
  return Object.freeze({
    id: normalizeNamespacedId(requirement.id, "extension dependency id"),
    major: normalizeVersionPart(requirement.major, "extension dependency major"),
    ...(requirement.minMinor === undefined
      ? {}
      : { minMinor: normalizeVersionPart(requirement.minMinor, "extension dependency minimum minor") }),
  });
}

function normalizeCapabilityRequirement(requirement: CapabilityRequirement): CapabilityRequirement {
  return Object.freeze({
    id: normalizeNamespacedId(requirement.id, "capability requirement id"),
    major: normalizeVersionPart(requirement.major, "capability requirement major"),
    ...(requirement.minMinor === undefined
      ? {}
      : { minMinor: normalizeVersionPart(requirement.minMinor, "capability requirement minimum minor") }),
  });
}

function normalizeVersion(version: CapabilityVersion, label: string): CapabilityVersion {
  return Object.freeze({
    major: normalizeVersionPart(version?.major, `${label} major`),
    minor: normalizeVersionPart(version?.minor, `${label} minor`),
  });
}

function normalizeVersionPart(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new ExtensionError({
      code: "invalid_extension_version",
      message: `${label} must be a non-negative integer.`,
      details: { value },
    });
  }
  return value as number;
}

function normalizeNamespacedId(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ExtensionError({
      code: "invalid_extension_id",
      message: `${label} must be a non-empty namespaced string.`,
      details: { value },
    });
  }
  if (value !== value.trim() || !value.includes(".") || value.split(".").some((part) => part.length === 0)) {
    throw new ExtensionError({
      code: "invalid_extension_id",
      message: `${label} must contain dot-separated non-empty parts with no surrounding whitespace.`,
      details: { value },
    });
  }
  return value;
}

function normalizeNamespace(value: unknown, extensionId: string): string {
  if (typeof value !== "string" || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value)) {
    throw new ExtensionError({
      code: "invalid_extension_namespace",
      message: `Extension "${extensionId}" must declare a valid top-level namespace.`,
      extensionId,
      details: { namespace: value },
    });
  }
  if (reservedNamespaces.has(value)) {
    throw new ExtensionError({
      code: "reserved_extension_namespace",
      message: `Extension namespace "${value}" is reserved by the SDK core.`,
      extensionId,
      details: { namespace: value },
    });
  }
  return value;
}

function deepFreeze<T>(value: T, seen: WeakSet<object> = new WeakSet<object>()): ReadonlyDeep<T> {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return value as ReadonlyDeep<T>;
  }
  const objectValue = value as object;
  if (seen.has(objectValue)) {
    return value as ReadonlyDeep<T>;
  }
  seen.add(objectValue);
  for (const key of Reflect.ownKeys(objectValue)) {
    deepFreeze((objectValue as Record<PropertyKey, unknown>)[key], seen);
  }
  return Object.freeze(objectValue) as ReadonlyDeep<T>;
}

function extensionErrorDetails(options: ExtensionErrorOptions): unknown {
  if (options.extensionId === undefined && options.details === undefined) {
    return undefined;
  }
  return Object.freeze({
    ...(options.extensionId === undefined ? {} : { extensionId: options.extensionId }),
    ...(options.details === undefined ? {} : { details: options.details }),
  });
}

function insertSorted(values: string[], value: string): void {
  const index = values.findIndex((item) => compareStrings(value, item) < 0);
  if (index === -1) {
    values.push(value);
    return;
  }
  values.splice(index, 0, value);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
