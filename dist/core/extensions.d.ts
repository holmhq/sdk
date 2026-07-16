import { type CapabilityOffer, type CapabilityRequirement, type CapabilityVersion, type CapabilityView } from "./capabilities.js";
import { HolmError } from "./errors.js";
import { type LifecycleSnapshot } from "./lifecycle.js";
import type { InvocationControl, OperationResponse } from "./runtime.js";
export type ReadonlyDeep<T> = T extends (...args: never[]) => unknown ? T : T extends readonly (infer Item)[] ? readonly ReadonlyDeep<Item>[] : T extends object ? {
    readonly [Key in keyof T]: ReadonlyDeep<T[Key]>;
} : T;
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
interface ExtensionInvokeRequest {
    readonly capability: CapabilityRequirement;
    readonly operation: string;
    readonly payload: unknown;
    readonly requestId: string;
    readonly reason?: string;
    readonly control?: InvocationControl;
}
type ExtensionInvokeFunction = (request: ExtensionInvokeRequest) => Promise<OperationResponse>;
interface ExtensionCapabilityOfferInput {
    readonly id: string;
    readonly version: CapabilityVersion;
}
export interface ExtensionSetupContext {
    readonly capabilities: CapabilityView;
    readonly extension: ExtensionDescriptor;
    invoke: ExtensionInvokeFunction;
    registerCapabilityOffer(offer: ExtensionCapabilityOfferInput): CapabilityOffer;
}
export interface ExtensionSetupResult<Api = unknown> {
    readonly api: Api;
    start?(): void | Promise<void>;
    /**
     * Releases resources owned by the extension.
     *
     * Async disposers are supported after a lifecycle has been created. If a
     * later extension setup fails while `createExtensionLifecycle()` is still in
     * its synchronous construction path, rollback disposers must complete
     * synchronously; returned promises are reported as deterministic setup
     * rollback contract failures and their eventual rejection is suppressed.
     */
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
type ExtensionNamespaceEntry<Extension> = Extension extends HolmExtension<infer Api, infer Namespace> ? {
    readonly [Key in Namespace]: ReadonlyDeep<Api>;
} : never;
type UnionToIntersection<Union> = (Union extends unknown ? (value: Union) => void : never) extends (value: infer Intersection) => void ? Intersection : never;
export type ExtensionNamespaces<Extensions extends readonly HolmExtension[]> = Readonly<UnionToIntersection<ExtensionNamespaceEntry<Extensions[number]>>>;
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
    readonly capabilities: CapabilityView;
    readonly validateCapabilities?: boolean;
    readonly invoke?: ExtensionInvokeFunction;
    readonly registerExtensionOffer?: (offer: CapabilityOffer) => CapabilityOffer;
}
export interface ExtensionErrorOptions {
    readonly code: string;
    readonly message: string;
    readonly extensionId?: string;
    readonly details?: unknown;
    readonly cause?: unknown;
}
export declare class ExtensionError extends HolmError {
    constructor(options: ExtensionErrorOptions);
}
export declare function createExtensionGraph<const Extensions extends readonly HolmExtension[]>(extensions: Extensions): ExtensionGraph;
export declare function createExtensionLifecycle<const Extensions extends readonly HolmExtension[]>(extensions: Extensions, options: ExtensionLifecycleOptions): ExtensionLifecycle<ExtensionNamespaces<Extensions>>;
export {};
//# sourceMappingURL=extensions.d.ts.map