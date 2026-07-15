import { createCapabilityView, } from "./capabilities.js";
import { HolmError } from "./errors.js";
import { createLifecycleController, } from "./lifecycle.js";
const reservedNamespaces = new Set([
    "capabilities",
    "dispose",
    "extensions",
    "invoke",
    "lifecycle",
    "resources",
    "start",
]);
export class ExtensionError extends HolmError {
    constructor(options) {
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
export function createExtensionGraph(extensions) {
    return buildExtensionGraph(extensions).graph;
}
export function createExtensionLifecycle(extensions, options) {
    const built = buildExtensionGraph(extensions);
    if (options.validateCapabilities !== false) {
        validateCapabilityRequirements(built.ordered, options.capabilities);
    }
    const components = setupComponents(built.ordered, options);
    return new InstanceExtensionLifecycle(built.graph, components.namespaces, components.ordered);
}
class InstanceExtensionLifecycle {
    graph;
    namespaces;
    #components;
    #controller;
    #active = [];
    constructor(graph, namespaces, components) {
        this.graph = graph;
        this.namespaces = namespaces;
        this.#components = components;
        this.#controller = createLifecycleController({
            start: () => this.#startComponents(),
            dispose: () => this.#disposeActive(),
        });
    }
    getNamespace(namespace) {
        return this.namespaces[namespace];
    }
    getSnapshot() {
        return this.#controller.getSnapshot();
    }
    start() {
        return this.#controller.start();
    }
    dispose() {
        return this.#controller.dispose();
    }
    async #startComponents() {
        const active = [];
        for (const component of this.#components) {
            try {
                await component.start?.();
                active.push(component);
            }
            catch (error) {
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
    async #disposeActive() {
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
function buildExtensionGraph(extensions) {
    const normalized = extensions.map(normalizeExtension);
    const byId = new Map();
    const byNamespace = new Map();
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
        get(id) {
            return publicById.get(id);
        },
    });
    return Object.freeze({
        graph,
        ordered: Object.freeze(ordered),
    });
}
function normalizeExtension(extension) {
    const id = normalizeNamespacedId(extension.id, "extension id");
    const namespace = normalizeNamespace(extension.namespace, id);
    const descriptor = Object.freeze({
        id,
        namespace,
        version: normalizeVersion(extension.version, "extension version"),
        requiresExtensions: Object.freeze((extension.requiresExtensions ?? []).map(normalizeExtensionRequirement)),
        requiresCapabilities: Object.freeze((extension.requiresCapabilities ?? []).map(normalizeCapabilityRequirement)),
        conflicts: Object.freeze((extension.conflicts ?? []).map((conflict) => normalizeNamespacedId(conflict, "conflict id"))),
    });
    return Object.freeze({ source: extension, descriptor });
}
function validateDependencies(extensions, byId) {
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
            if (target.descriptor.version.major !== dependency.major ||
                target.descriptor.version.minor < (dependency.minMinor ?? 0)) {
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
function validateConflicts(extensions, byId) {
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
function orderExtensions(extensions, byId) {
    const indegree = new Map();
    const dependents = new Map();
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
    const ordered = [];
    while (ready.length > 0) {
        const id = ready.shift();
        const extension = byId.get(id);
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
function validateCapabilityRequirements(extensions, capabilities) {
    for (const extension of extensions) {
        for (const requirement of extension.descriptor.requiresCapabilities) {
            capabilities.require(requirement);
        }
    }
}
function setupComponents(extensions, options) {
    const ordered = [];
    const namespaces = {};
    const capabilities = createCapabilityView(options.capabilities);
    const invoke = options.invoke ?? extensionInvokeUnavailable;
    const registerOffer = options.registerExtensionOffer ?? extensionCapabilityOfferRegistrationUnavailable;
    for (const extension of extensions) {
        let result;
        try {
            result = extension.source.setup(Object.freeze({
                capabilities,
                extension: extension.descriptor,
                invoke,
                registerCapabilityOffer: createCapabilityOfferRegistrar(registerOffer, extension.descriptor.id),
            }));
        }
        catch (error) {
            const rollback = disposeSetupComponents(ordered);
            throw new ExtensionError({
                code: "extension_setup_failed",
                message: `Extension "${extension.descriptor.id}" failed during setup.`,
                extensionId: extension.descriptor.id,
                cause: rollback ? new AggregateError([error, rollback], "Extension setup and rollback failed.") : error,
            });
        }
        const api = deepFreeze(result.api);
        namespaces[extension.descriptor.namespace] = api;
        const start = result.start;
        const dispose = result.dispose;
        ordered.push(Object.freeze({
            descriptor: extension.descriptor,
            api,
            ...(start === undefined ? {} : { start: () => start() }),
            ...(dispose === undefined ? {} : { dispose: () => dispose() }),
        }));
    }
    return Object.freeze({
        ordered: Object.freeze(ordered),
        namespaces: Object.freeze(namespaces),
    });
}
async function extensionInvokeUnavailable() {
    throw new ExtensionError({
        code: "extension_invoke_unavailable",
        message: "Extension invocation is not available outside a running Holm instance.",
    });
}
function extensionCapabilityOfferRegistrationUnavailable() {
    throw new ExtensionError({
        code: "extension_capability_offer_registration_unavailable",
        message: "Extension capability offer registration is not available outside a running Holm instance.",
    });
}
function createCapabilityOfferRegistrar(registerOffer, extensionId) {
    return (offer) => {
        try {
            return registerOffer({ id: offer.id, version: offer.version, origin: "extension" });
        }
        catch (error) {
            throw new ExtensionError({
                code: "extension_capability_offer_forbidden",
                message: `Extension "${extensionId}" attempted to register a forbidden capability offer.`,
                extensionId,
                cause: error,
                details: { id: offer?.id },
            });
        }
    };
}
function disposeSetupComponents(components) {
    const errors = [];
    for (const component of [...components].reverse()) {
        try {
            const disposal = component.dispose?.();
            if (isPromiseLike(disposal)) {
                void Promise.resolve(disposal).catch(() => undefined);
                errors.push(new ExtensionError({
                    code: "extension_setup_rollback_async_disposer",
                    message: `Extension "${component.descriptor.id}" returned an async disposer during setup rollback.`,
                    extensionId: component.descriptor.id,
                    details: {
                        phase: "setup_rollback",
                        requirement: "setup rollback disposers must complete synchronously",
                    },
                }));
            }
        }
        catch (error) {
            errors.push(error);
        }
    }
    if (errors.length === 0) {
        return undefined;
    }
    return new AggregateError(errors, "One or more extension setup rollback disposers failed.");
}
function isPromiseLike(value) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) {
        return false;
    }
    return typeof value.then === "function";
}
async function disposeComponents(components) {
    const errors = [];
    for (const component of [...components].reverse()) {
        try {
            await component.dispose?.();
        }
        catch (error) {
            errors.push(error);
        }
    }
    if (errors.length === 0) {
        return undefined;
    }
    return new AggregateError(errors, "One or more extension disposers failed.");
}
function normalizeExtensionRequirement(requirement) {
    return Object.freeze({
        id: normalizeNamespacedId(requirement.id, "extension dependency id"),
        major: normalizeVersionPart(requirement.major, "extension dependency major"),
        ...(requirement.minMinor === undefined
            ? {}
            : { minMinor: normalizeVersionPart(requirement.minMinor, "extension dependency minimum minor") }),
    });
}
function normalizeCapabilityRequirement(requirement) {
    return Object.freeze({
        id: normalizeNamespacedId(requirement.id, "capability requirement id"),
        major: normalizeVersionPart(requirement.major, "capability requirement major"),
        ...(requirement.minMinor === undefined
            ? {}
            : { minMinor: normalizeVersionPart(requirement.minMinor, "capability requirement minimum minor") }),
    });
}
function normalizeVersion(version, label) {
    return Object.freeze({
        major: normalizeVersionPart(version?.major, `${label} major`),
        minor: normalizeVersionPart(version?.minor, `${label} minor`),
    });
}
function normalizeVersionPart(value, label) {
    if (!Number.isInteger(value) || value < 0) {
        throw new ExtensionError({
            code: "invalid_extension_version",
            message: `${label} must be a non-negative integer.`,
            details: { value },
        });
    }
    return value;
}
function normalizeNamespacedId(value, label) {
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
function normalizeNamespace(value, extensionId) {
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
function deepFreeze(value, seen = new WeakSet()) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) {
        return value;
    }
    const objectValue = value;
    if (seen.has(objectValue)) {
        return value;
    }
    seen.add(objectValue);
    for (const key of Reflect.ownKeys(objectValue)) {
        deepFreeze(objectValue[key], seen);
    }
    return Object.freeze(objectValue);
}
function extensionErrorDetails(options) {
    if (options.extensionId === undefined && options.details === undefined) {
        return undefined;
    }
    return Object.freeze({
        ...(options.extensionId === undefined ? {} : { extensionId: options.extensionId }),
        ...(options.details === undefined ? {} : { details: options.details }),
    });
}
function insertSorted(values, value) {
    const index = values.findIndex((item) => compareStrings(value, item) < 0);
    if (index === -1) {
        values.push(value);
        return;
    }
    values.splice(index, 0, value);
}
function compareStrings(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
}
//# sourceMappingURL=extensions.js.map