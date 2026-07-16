import { type CapabilityOffer, type CapabilityRequirement } from "../core/capabilities.js";
import { HolmError, type SerializedHolmError } from "../core/errors.js";
import type { Clock, InvocationControl, OperationRequest, OperationResponse, RuntimeAdapter, Scheduler } from "../core/runtime.js";
import { type WireValue } from "../core/wire-value.js";
export declare const bridgeMailboxProtocol = "holm.sdk.bridge.mailbox/1";
export type BridgeSurface = "desktop" | "mobile";
export type BridgeRuntimeServiceName = "mailbox" | "clock" | "scheduler" | "secureStorage" | "lifecycle" | "connectivity" | "deepLink" | "navigation" | "background";
export interface BridgeRuntimeServiceErrorOptions {
    readonly adapter: string;
    readonly surface: BridgeSurface;
    readonly service: BridgeRuntimeServiceName;
    readonly message?: string;
}
export declare class UnsupportedBridgeRuntimeServiceError extends HolmError {
    constructor(options: BridgeRuntimeServiceErrorOptions);
}
export interface BridgeSecureStorageService {
    get(key: string): WireValue | undefined;
    set(key: string, value: WireValue): void;
    delete(key: string): void;
}
export type BridgeLifecycleState = "active" | "inactive" | "background" | "unknown";
export interface BridgeLifecycleSnapshot {
    readonly state: BridgeLifecycleState;
    readonly at?: number;
}
export type BridgeLifecycleListener = (snapshot: BridgeLifecycleSnapshot) => void;
export interface BridgeLifecycleService {
    current(): BridgeLifecycleSnapshot;
    subscribe(listener: BridgeLifecycleListener): () => void;
}
export type BridgeConnectivityKind = "online" | "offline" | "unknown";
export interface BridgeConnectivitySnapshot {
    readonly kind: BridgeConnectivityKind;
    readonly metered?: boolean;
    readonly at?: number;
}
export type BridgeConnectivityListener = (snapshot: BridgeConnectivitySnapshot) => void;
export interface BridgeConnectivityService {
    current(): BridgeConnectivitySnapshot;
    subscribe(listener: BridgeConnectivityListener): () => void;
}
export interface BridgeDeepLinkEvent {
    readonly url: string;
    readonly at?: number;
}
export type BridgeDeepLinkListener = (event: BridgeDeepLinkEvent) => void;
export interface BridgeDeepLinkService {
    initial(): BridgeDeepLinkEvent | undefined;
    subscribe(listener: BridgeDeepLinkListener): () => void;
}
export interface BridgeNavigationService {
    open(url: string): void;
}
export interface BridgeBackgroundService {
    run(task: string, payload: WireValue): WireValue | undefined;
}
export interface BridgeRuntimeServices {
    readonly secureStorage: BridgeSecureStorageService;
    readonly lifecycle: BridgeLifecycleService;
    readonly connectivity: BridgeConnectivityService;
    readonly deepLink: BridgeDeepLinkService;
    readonly navigation: BridgeNavigationService;
    readonly background: BridgeBackgroundService;
}
export interface MockBridgeServicesOptions {
    readonly adapter?: string;
    readonly surface?: BridgeSurface;
    readonly secureStorage?: BridgeSecureStorageService | {
        readonly entries?: Readonly<Record<string, WireValue>>;
    };
    readonly lifecycle?: BridgeLifecycleService | BridgeLifecycleSnapshot;
    readonly connectivity?: BridgeConnectivityService | BridgeConnectivitySnapshot;
    readonly deepLink?: BridgeDeepLinkService | BridgeDeepLinkEvent;
    readonly navigation?: BridgeNavigationService;
    readonly background?: BridgeBackgroundService | Readonly<Record<string, (payload: WireValue) => WireValue | undefined>>;
}
export type BridgeMailboxKind = "request" | "response" | "error" | "event" | "cancel";
export interface BridgeMailboxEnvelope {
    readonly protocol: typeof bridgeMailboxProtocol;
    readonly kind: BridgeMailboxKind;
    readonly requestId?: string;
    readonly eventId?: string;
    readonly name?: string;
    readonly capability?: CapabilityRequirement;
    readonly operation?: string;
    readonly payload?: WireValue;
    readonly metadata?: WireValue;
    readonly error?: SerializedHolmError;
    readonly reason?: string;
}
export interface BridgeMailboxRequestInput {
    readonly requestId: string;
    readonly capability: CapabilityRequirement;
    readonly operation: string;
    readonly payload: unknown;
}
export interface BridgeMailboxResponse {
    readonly requestId: string;
    readonly payload: WireValue;
    readonly metadata?: WireValue;
}
export interface BridgeMailboxOptions {
    post(envelope: BridgeMailboxEnvelope): void;
}
export interface BridgeMailbox {
    readonly pendingCount: number;
    request(input: BridgeMailboxRequestInput): Promise<BridgeMailboxResponse>;
    receive(envelope: BridgeMailboxEnvelope): boolean;
    cancel(requestId: string, reason?: string): boolean;
}
export interface BridgeRuntimeAdapter extends RuntimeAdapter {
    readonly surface: BridgeSurface;
    readonly services: BridgeRuntimeServices;
}
export interface ReservedBridgeRuntimeOptions {
    readonly id?: string;
    readonly clock?: Clock;
    readonly scheduler?: Scheduler;
    readonly services?: BridgeRuntimeServices;
}
export type BridgeRuntimeHandler = (request: OperationRequest, control: InvocationControl) => OperationResponse | Promise<OperationResponse>;
export interface MockBridgeRuntimeOptions {
    readonly id?: string;
    readonly surface: BridgeSurface;
    readonly capabilities?: readonly CapabilityOffer[];
    readonly handlers?: Readonly<Record<string, BridgeRuntimeHandler>>;
    readonly clock?: Clock;
    readonly scheduler?: Scheduler;
    readonly services?: BridgeRuntimeServices;
}
export interface MockBridgeRuntimeAdapter extends BridgeRuntimeAdapter {
    readonly invocations: readonly OperationRequest[];
    readonly controls: readonly InvocationControl[];
    setCapabilities(offers: readonly CapabilityOffer[]): void;
    setHandler(key: string, handler: BridgeRuntimeHandler): void;
}
export declare function copyBridgeMailboxEnvelope(envelope: BridgeMailboxEnvelope): BridgeMailboxEnvelope;
export declare function createBridgeMailbox(options: BridgeMailboxOptions): BridgeMailbox;
export declare function createMockBridgeServices(options?: MockBridgeServicesOptions): BridgeRuntimeServices;
export declare function createReservedDesktopBridgeRuntime(options?: ReservedBridgeRuntimeOptions): BridgeRuntimeAdapter;
export declare function createReservedMobileBridgeRuntime(options?: ReservedBridgeRuntimeOptions): BridgeRuntimeAdapter;
export declare function createMockBridgeRuntime(options: MockBridgeRuntimeOptions): MockBridgeRuntimeAdapter;
//# sourceMappingURL=index.d.ts.map