import {
  CapabilityVersionError,
  negotiateCapability,
  UnsupportedCapabilityError,
  type CapabilityOffer,
  type CapabilityRequirement,
} from "../core/capabilities.js";
import { createInvocationContext } from "../core/caller.js";
import { CancelledError, throwIfCancelled } from "../core/cancellation.js";
import { HolmError, ProtocolError, type SerializedHolmError } from "../core/errors.js";
import type {
  Clock,
  InvocationControl,
  OperationRequest,
  OperationResponse,
  RuntimeAdapter,
  Scheduler,
  SurfaceKind,
} from "../core/runtime.js";
import { copyWireValue, type WireValue } from "../core/wire-value.js";

export const bridgeMailboxProtocol = "holm.sdk.bridge.mailbox/1";

export type BridgeSurface = "desktop" | "mobile";
export type BridgeRuntimeServiceName =
  | "mailbox"
  | "clock"
  | "scheduler"
  | "secureStorage"
  | "lifecycle"
  | "connectivity"
  | "deepLink"
  | "navigation"
  | "background";

export interface BridgeRuntimeServiceErrorOptions {
  readonly adapter: string;
  readonly surface: BridgeSurface;
  readonly service: BridgeRuntimeServiceName;
  readonly message?: string;
}

export class UnsupportedBridgeRuntimeServiceError extends HolmError {
  constructor(options: BridgeRuntimeServiceErrorOptions) {
    super({
      kind: "capability",
      code: "unsupported_runtime_service",
      message: options.message ?? `The ${options.surface} bridge runtime requires an injected ${formatService(options.service)} service.`,
      details: Object.freeze({
        adapter: options.adapter,
        surface: options.surface,
        service: options.service,
      }),
    });
    this.name = "UnsupportedBridgeRuntimeServiceError";
  }
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
  readonly secureStorage?: BridgeSecureStorageService | { readonly entries?: Readonly<Record<string, WireValue>> };
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

export type BridgeRuntimeHandler = (
  request: OperationRequest,
  control: InvocationControl,
) => OperationResponse | Promise<OperationResponse>;

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

interface PendingMailboxRequest {
  resolve(response: BridgeMailboxResponse): void;
  reject(error: unknown): void;
}

export function copyBridgeMailboxEnvelope(envelope: BridgeMailboxEnvelope): BridgeMailboxEnvelope {
  return copyBridgeEnvelope(envelope);
}

export function createBridgeMailbox(options: BridgeMailboxOptions): BridgeMailbox {
  const pending = new Map<string, PendingMailboxRequest>();

  return Object.freeze({
    get pendingCount(): number {
      return pending.size;
    },
    request(input: BridgeMailboxRequestInput): Promise<BridgeMailboxResponse> {
      const envelope = copyBridgeRequestEnvelope(input);
      if (pending.has(envelope.requestId as string)) {
        throw new ProtocolError({
          code: "bridge_mailbox_request_duplicate",
          message: "Bridge mailbox request IDs must be unique while pending.",
          details: { requestId: envelope.requestId },
        });
      }
      const promise = new Promise<BridgeMailboxResponse>((resolve, reject) => {
        pending.set(envelope.requestId as string, { resolve, reject });
      });
      try {
        options.post(envelope);
      } catch (cause) {
        pending.delete(envelope.requestId as string);
        throw new ProtocolError({
          code: "bridge_mailbox_post_failed",
          message: "Bridge mailbox post failed.",
          cause,
        });
      }
      return promise;
    },
    receive(envelope: BridgeMailboxEnvelope): boolean {
      if (envelope.protocol !== bridgeMailboxProtocol) {
        throw new ProtocolError({
          code: "invalid_bridge_mailbox_protocol",
          message: "Bridge mailbox envelopes must use the reserved bridge protocol.",
        });
      }
      switch (envelope.kind) {
        case "response":
        case "error": {
          const requestId = requireEnvelopeRequestId(envelope, envelope.kind);
          const entry = pending.get(requestId);
          if (!entry) {
            return false;
          }
          const copied = copyBridgeEnvelope(envelope);
          pending.delete(requestId);
          if (copied.kind === "error") {
            entry.reject(holmErrorFromSerialized(requireEnvelopeError(copied)));
          } else {
            entry.resolve(copyBridgeResponseEnvelope(copied));
          }
          return true;
        }
        case "request":
        case "event":
        case "cancel":
          copyBridgeEnvelope(envelope);
          return false;
        default:
          throw new ProtocolError({
            code: "invalid_bridge_mailbox_kind",
            message: "Bridge mailbox envelope kind is not supported.",
          });
      }
    },
    cancel(requestId: string, reason?: string): boolean {
      const entry = pending.get(requestId);
      if (!entry) {
        return false;
      }
      pending.delete(requestId);
      const envelope = copyBridgeCancelEnvelope({
        requestId,
        ...(reason === undefined ? {} : { reason }),
      });
      options.post(envelope);
      entry.reject(new CancelledError(reason === undefined ? {} : { reason }));
      return true;
    },
  });
}

export function createMockBridgeServices(options: MockBridgeServicesOptions = {}): BridgeRuntimeServices {
  const adapter = normalizeId(options.adapter ?? "bridge-mock");
  const surface = options.surface ?? "desktop";
  return Object.freeze({
    secureStorage: resolveSecureStorage(options.secureStorage, adapter, surface),
    lifecycle: resolveLifecycle(options.lifecycle, adapter, surface),
    connectivity: resolveConnectivity(options.connectivity, adapter, surface),
    deepLink: resolveDeepLink(options.deepLink, adapter, surface),
    navigation: options.navigation ?? unsupportedNavigation(adapter, surface),
    background: resolveBackground(options.background, adapter, surface),
  });
}

export function createReservedDesktopBridgeRuntime(options: ReservedBridgeRuntimeOptions = {}): BridgeRuntimeAdapter {
  return createReservedBridgeRuntime("desktop", options);
}

export function createReservedMobileBridgeRuntime(options: ReservedBridgeRuntimeOptions = {}): BridgeRuntimeAdapter {
  return createReservedBridgeRuntime("mobile", options);
}

export function createMockBridgeRuntime(options: MockBridgeRuntimeOptions): MockBridgeRuntimeAdapter {
  const id = normalizeId(options.id ?? `${options.surface}-bridge-mock`);
  const surface = options.surface;
  let offers = copyCapabilityOffers(options.capabilities ?? []);
  const handlers = new Map<string, BridgeRuntimeHandler>(Object.entries(options.handlers ?? {}));
  const invocations: OperationRequest[] = [];
  const controls: InvocationControl[] = [];
  const services = options.services ?? createMockBridgeServices({ adapter: id, surface });
  const clock = options.clock ?? unsupportedClock(id, surface);
  const scheduler = options.scheduler ?? unsupportedScheduler(id, surface);

  return Object.freeze({
    id,
    surface,
    clock,
    scheduler,
    services,
    get invocations(): readonly OperationRequest[] {
      return Object.freeze(invocations.map(copyOperationRequest));
    },
    get controls(): readonly InvocationControl[] {
      return Object.freeze(controls.map(copyInvocationControl));
    },
    async start(): Promise<readonly CapabilityOffer[]> {
      return copyCapabilityOffers(offers);
    },
    async invoke(request: OperationRequest, control: InvocationControl): Promise<OperationResponse> {
      const controlSnapshot = copyInvocationControl(control);
      throwIfCancelled(controlSnapshot.cancellation);
      const requestSnapshot = copyOperationRequest(request);
      requireRuntimeOffer(offers, requestSnapshot, id, surface);
      invocations.push(requestSnapshot);
      controls.push(controlSnapshot);
      const handler = handlers.get(`${requestSnapshot.capability.id}:${requestSnapshot.operation}`);
      const response = handler
        ? await handler(requestSnapshot, controlSnapshot)
        : { requestId: requestSnapshot.requestId, payload: requestSnapshot.payload };
      throwIfCancelled(controlSnapshot.cancellation);
      return copyOperationResponse(response);
    },
    async dispose(): Promise<void> {
      return undefined;
    },
    setCapabilities(nextOffers: readonly CapabilityOffer[]): void {
      offers = copyCapabilityOffers(nextOffers);
    },
    setHandler(key: string, handler: BridgeRuntimeHandler): void {
      handlers.set(key, handler);
    },
  }) satisfies MockBridgeRuntimeAdapter;
}

function createReservedBridgeRuntime(surface: BridgeSurface, options: ReservedBridgeRuntimeOptions): BridgeRuntimeAdapter {
  const id = normalizeId(options.id ?? `${surface}-bridge-reserved`);
  return Object.freeze({
    id,
    surface,
    clock: options.clock ?? unsupportedClock(id, surface),
    scheduler: options.scheduler ?? unsupportedScheduler(id, surface),
    services: options.services ?? createMockBridgeServices({ adapter: id, surface }),
    async start(): Promise<readonly CapabilityOffer[]> {
      return Object.freeze([]);
    },
    async invoke(request: OperationRequest): Promise<OperationResponse> {
      throw new UnsupportedCapabilityError({
        id: request.capability.id,
        requirement: copyCapabilityRequirement(request.capability),
        offered: Object.freeze([]),
        adapter: id,
        surface,
      });
    },
    async dispose(): Promise<void> {
      return undefined;
    },
  }) satisfies BridgeRuntimeAdapter;
}

function copyBridgeRequestEnvelope(input: BridgeMailboxRequestInput): BridgeMailboxEnvelope {
  return Object.freeze({
    protocol: bridgeMailboxProtocol,
    kind: "request",
    requestId: normalizeId(input.requestId),
    capability: copyCapabilityRequirement(input.capability),
    operation: normalizeId(input.operation),
    payload: copyWireValue(input.payload),
  });
}

function copyBridgeCancelEnvelope(input: { readonly requestId: string; readonly reason?: string }): BridgeMailboxEnvelope {
  return Object.freeze({
    protocol: bridgeMailboxProtocol,
    kind: "cancel",
    requestId: normalizeId(input.requestId),
    ...(input.reason === undefined ? {} : { reason: input.reason }),
  });
}

function copyBridgeEnvelope(envelope: BridgeMailboxEnvelope): BridgeMailboxEnvelope {
  if (envelope.protocol !== bridgeMailboxProtocol) {
    throw new ProtocolError({
      code: "invalid_bridge_mailbox_protocol",
      message: "Bridge mailbox envelopes must use the reserved bridge protocol.",
    });
  }
  switch (envelope.kind) {
    case "request":
      return copyBridgeRequestEnvelope({
        requestId: requireEnvelopeRequestId(envelope, "request"),
        capability: requireEnvelopeCapability(envelope),
        operation: requireEnvelopeOperation(envelope),
        payload: requireEnvelopePayload(envelope),
      });
    case "response":
      return Object.freeze({
        protocol: bridgeMailboxProtocol,
        kind: "response",
        requestId: requireEnvelopeRequestId(envelope, "response"),
        payload: copyWireValue(requireEnvelopePayload(envelope)),
        ...(envelope.metadata === undefined ? {} : { metadata: copyWireValue(envelope.metadata) }),
      });
    case "error":
      return Object.freeze({
        protocol: bridgeMailboxProtocol,
        kind: "error",
        requestId: requireEnvelopeRequestId(envelope, "error"),
        error: requireEnvelopeError(envelope),
      });
    case "event":
      return Object.freeze({
        protocol: bridgeMailboxProtocol,
        kind: "event",
        eventId: normalizeId(envelope.eventId ?? ""),
        name: normalizeId(envelope.name ?? ""),
        payload: copyWireValue(requireEnvelopePayload(envelope)),
      });
    case "cancel":
      return copyBridgeCancelEnvelope({
        requestId: requireEnvelopeRequestId(envelope, "cancel"),
        ...(envelope.reason === undefined ? {} : { reason: envelope.reason }),
      });
    default:
      throw new ProtocolError({
        code: "invalid_bridge_mailbox_kind",
        message: "Bridge mailbox envelope kind is not supported.",
      });
  }
}

function copyBridgeResponseEnvelope(envelope: BridgeMailboxEnvelope): BridgeMailboxResponse {
  return Object.freeze({
    requestId: requireEnvelopeRequestId(envelope, "response"),
    payload: copyWireValue(requireEnvelopePayload(envelope)),
    ...(envelope.metadata === undefined ? {} : { metadata: copyWireValue(envelope.metadata) }),
  });
}

function requireEnvelopeRequestId(envelope: BridgeMailboxEnvelope, kind: string): string {
  if (typeof envelope.requestId !== "string" || envelope.requestId.trim() === "") {
    throw new ProtocolError({
      code: "invalid_bridge_mailbox_request_id",
      message: `Bridge mailbox ${kind} envelopes must include a non-empty request ID.`,
    });
  }
  return envelope.requestId;
}

function requireEnvelopeCapability(envelope: BridgeMailboxEnvelope): CapabilityRequirement {
  if (envelope.capability === undefined) {
    throw new ProtocolError({
      code: "invalid_bridge_mailbox_capability",
      message: "Bridge mailbox request envelopes must include a capability requirement.",
    });
  }
  return envelope.capability;
}

function requireEnvelopeOperation(envelope: BridgeMailboxEnvelope): string {
  if (typeof envelope.operation !== "string" || envelope.operation.trim() === "") {
    throw new ProtocolError({
      code: "invalid_bridge_mailbox_operation",
      message: "Bridge mailbox request envelopes must include a non-empty operation.",
    });
  }
  return envelope.operation;
}

function requireEnvelopePayload(envelope: BridgeMailboxEnvelope): WireValue {
  if (!("payload" in envelope)) {
    throw new ProtocolError({
      code: "invalid_bridge_mailbox_payload",
      message: "Bridge mailbox envelopes must include a payload when their kind requires one.",
    });
  }
  return envelope.payload as WireValue;
}

function requireEnvelopeError(envelope: BridgeMailboxEnvelope): SerializedHolmError {
  const error = envelope.error;
  if (
    error?.$holm !== "error" ||
    typeof error.kind !== "string" ||
    typeof error.code !== "string" ||
    error.code.trim() === "" ||
    typeof error.message !== "string"
  ) {
    throw new ProtocolError({
      code: "invalid_bridge_mailbox_error",
      message: "Bridge mailbox error envelopes must include a serialized Holm error.",
    });
  }
  return Object.freeze({
    $holm: "error",
    kind: error.kind,
    code: error.code,
    message: error.message,
    ...(error.details === undefined ? {} : { details: copyWireValue(error.details) }),
    ...(error.status === undefined ? {} : { status: error.status }),
    ...(error.retryable === undefined ? {} : { retryable: error.retryable }),
  });
}

function holmErrorFromSerialized(error: SerializedHolmError): HolmError {
  return new HolmError({
    kind: error.kind,
    code: error.code,
    message: error.message,
    ...(error.details === undefined ? {} : { details: error.details }),
    ...(error.status === undefined ? {} : { status: error.status }),
    ...(error.retryable === undefined ? {} : { retryable: error.retryable }),
  });
}

function resolveSecureStorage(
  input: MockBridgeServicesOptions["secureStorage"],
  adapter: string,
  surface: BridgeSurface,
): BridgeSecureStorageService {
  if (input === undefined) {
    return unsupportedSecureStorage(adapter, surface);
  }
  if ("get" in input) {
    return input;
  }
  const entries = new Map<string, WireValue>();
  for (const [key, value] of Object.entries(input.entries ?? {})) {
    entries.set(key, copyWireValue(value));
  }
  return Object.freeze({
    get(key: string): WireValue | undefined {
      const value = entries.get(key);
      return value === undefined ? undefined : copyWireValue(value);
    },
    set(key: string, value: WireValue): void {
      entries.set(key, copyWireValue(value));
    },
    delete(key: string): void {
      entries.delete(key);
    },
  });
}

function resolveLifecycle(
  input: MockBridgeServicesOptions["lifecycle"],
  adapter: string,
  surface: BridgeSurface,
): BridgeLifecycleService {
  if (input === undefined) {
    return unsupportedLifecycle(adapter, surface);
  }
  if ("current" in input) {
    return input;
  }
  const listeners = new Set<BridgeLifecycleListener>();
  const snapshot = copyLifecycleSnapshot(input);
  return Object.freeze({
    current(): BridgeLifecycleSnapshot {
      return copyLifecycleSnapshot(snapshot);
    },
    subscribe(listener: BridgeLifecycleListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
}

function resolveConnectivity(
  input: MockBridgeServicesOptions["connectivity"],
  adapter: string,
  surface: BridgeSurface,
): BridgeConnectivityService {
  if (input === undefined) {
    return unsupportedConnectivity(adapter, surface);
  }
  if ("current" in input) {
    return input;
  }
  const listeners = new Set<BridgeConnectivityListener>();
  const snapshot = copyConnectivitySnapshot(input);
  return Object.freeze({
    current(): BridgeConnectivitySnapshot {
      return copyConnectivitySnapshot(snapshot);
    },
    subscribe(listener: BridgeConnectivityListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
}

function resolveDeepLink(
  input: MockBridgeServicesOptions["deepLink"],
  adapter: string,
  surface: BridgeSurface,
): BridgeDeepLinkService {
  if (input === undefined) {
    return unsupportedDeepLink(adapter, surface);
  }
  if ("initial" in input) {
    return input;
  }
  const listeners = new Set<BridgeDeepLinkListener>();
  const event = copyDeepLinkEvent(input);
  return Object.freeze({
    initial(): BridgeDeepLinkEvent {
      return copyDeepLinkEvent(event);
    },
    subscribe(listener: BridgeDeepLinkListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
}

function resolveBackground(
  input: MockBridgeServicesOptions["background"],
  adapter: string,
  surface: BridgeSurface,
): BridgeBackgroundService {
  if (input === undefined) {
    return unsupportedBackground(adapter, surface);
  }
  if (isBridgeBackgroundService(input)) {
    return input;
  }
  const handlers = new Map(Object.entries(input));
  return Object.freeze({
    run(task: string, payload: WireValue): WireValue | undefined {
      const handler = handlers.get(task);
      return handler ? copyOptionalWireValue(handler(copyWireValue(payload))) : undefined;
    },
  });
}

function isBridgeBackgroundService(input: NonNullable<MockBridgeServicesOptions["background"]>): input is BridgeBackgroundService {
  return typeof (input as { readonly run?: unknown }).run === "function";
}

function unsupportedSecureStorage(adapter: string, surface: BridgeSurface): BridgeSecureStorageService {
  return Object.freeze({
    get(): never {
      throw unsupportedService(adapter, surface, "secureStorage");
    },
    set(): never {
      throw unsupportedService(adapter, surface, "secureStorage");
    },
    delete(): never {
      throw unsupportedService(adapter, surface, "secureStorage");
    },
  });
}

function unsupportedLifecycle(adapter: string, surface: BridgeSurface): BridgeLifecycleService {
  return Object.freeze({
    current(): never {
      throw unsupportedService(adapter, surface, "lifecycle");
    },
    subscribe(): never {
      throw unsupportedService(adapter, surface, "lifecycle");
    },
  });
}

function unsupportedConnectivity(adapter: string, surface: BridgeSurface): BridgeConnectivityService {
  return Object.freeze({
    current(): never {
      throw unsupportedService(adapter, surface, "connectivity");
    },
    subscribe(): never {
      throw unsupportedService(adapter, surface, "connectivity");
    },
  });
}

function unsupportedDeepLink(adapter: string, surface: BridgeSurface): BridgeDeepLinkService {
  return Object.freeze({
    initial(): never {
      throw unsupportedService(adapter, surface, "deepLink");
    },
    subscribe(): never {
      throw unsupportedService(adapter, surface, "deepLink");
    },
  });
}

function unsupportedNavigation(adapter: string, surface: BridgeSurface): BridgeNavigationService {
  return Object.freeze({
    open(): never {
      throw unsupportedService(adapter, surface, "navigation");
    },
  });
}

function unsupportedBackground(adapter: string, surface: BridgeSurface): BridgeBackgroundService {
  return Object.freeze({
    run(): never {
      throw unsupportedService(adapter, surface, "background");
    },
  });
}

function unsupportedClock(adapter: string, surface: BridgeSurface): Clock {
  return Object.freeze({
    now(): never {
      throw unsupportedService(adapter, surface, "clock");
    },
  });
}

function unsupportedScheduler(adapter: string, surface: BridgeSurface): Scheduler {
  return Object.freeze({
    schedule(): never {
      throw unsupportedService(adapter, surface, "scheduler");
    },
  });
}

function unsupportedService(
  adapter: string,
  surface: BridgeSurface,
  service: BridgeRuntimeServiceName,
): UnsupportedBridgeRuntimeServiceError {
  return new UnsupportedBridgeRuntimeServiceError({ adapter, surface, service });
}

function copyLifecycleSnapshot(snapshot: BridgeLifecycleSnapshot): BridgeLifecycleSnapshot {
  return Object.freeze({
    state: snapshot.state,
    ...(snapshot.at === undefined ? {} : { at: snapshot.at }),
  });
}

function copyConnectivitySnapshot(snapshot: BridgeConnectivitySnapshot): BridgeConnectivitySnapshot {
  return Object.freeze({
    kind: snapshot.kind,
    ...(snapshot.metered === undefined ? {} : { metered: snapshot.metered }),
    ...(snapshot.at === undefined ? {} : { at: snapshot.at }),
  });
}

function copyDeepLinkEvent(event: BridgeDeepLinkEvent): BridgeDeepLinkEvent {
  return Object.freeze({
    url: event.url,
    ...(event.at === undefined ? {} : { at: event.at }),
  });
}

function copyCapabilityOffers(offers: readonly CapabilityOffer[]): readonly CapabilityOffer[] {
  return Object.freeze(offers.map(copyCapabilityOffer));
}

function copyCapabilityOffer(offer: CapabilityOffer): CapabilityOffer {
  return Object.freeze({
    id: offer.id,
    origin: offer.origin,
    version: Object.freeze({ major: offer.version.major, minor: offer.version.minor }),
  });
}

function copyCapabilityRequirement(capability: CapabilityRequirement): CapabilityRequirement {
  return Object.freeze({
    id: capability.id,
    major: capability.major,
    ...(capability.minMinor === undefined ? {} : { minMinor: capability.minMinor }),
  });
}

function copyInvocationControl(control: InvocationControl): InvocationControl {
  return Object.freeze({
    ...(control.cancellation === undefined ? {} : { cancellation: control.cancellation }),
    ...(control.timeoutMs === undefined ? {} : { timeoutMs: control.timeoutMs }),
  });
}

function copyOperationRequest(request: OperationRequest): OperationRequest {
  return Object.freeze({
    requestId: request.requestId,
    capability: copyCapabilityRequirement(request.capability),
    operation: request.operation,
    caller: createInvocationContext(
      request.caller,
      request.caller.invocationId,
      request.caller.startedAt,
      request.caller.reason,
    ),
    callerFingerprint: request.callerFingerprint,
    payload: copyWireValue(request.payload),
  });
}

function copyOperationResponse(response: OperationResponse): OperationResponse {
  return Object.freeze({
    requestId: response.requestId,
    payload: copyWireValue(response.payload),
    ...(response.metadata === undefined ? {} : { metadata: copyWireValue(response.metadata) }),
  });
}

function copyOptionalWireValue(value: WireValue | undefined): WireValue | undefined {
  return value === undefined ? undefined : copyWireValue(value);
}

function requireRuntimeOffer(
  offers: readonly CapabilityOffer[],
  request: OperationRequest,
  adapter: string,
  surface: SurfaceKind,
): void {
  try {
    negotiateCapability(offers, request.capability);
  } catch (error) {
    if (error instanceof UnsupportedCapabilityError) {
      throw new UnsupportedCapabilityError({
        id: request.capability.id,
        requirement: request.capability,
        offered: offers,
        adapter,
        surface,
      });
    }
    if (error instanceof CapabilityVersionError) {
      throw new CapabilityVersionError({
        id: request.capability.id,
        requirement: request.capability,
        offered: offers.filter((offer) => offer.id === request.capability.id),
        adapter,
        surface,
      });
    }
    throw error;
  }
}

function normalizeId(value: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError("Bridge identifiers must be non-empty strings.");
  }
  return normalized;
}

function formatService(service: BridgeRuntimeServiceName): string {
  switch (service) {
    case "secureStorage":
      return "secure-storage";
    case "deepLink":
      return "deep-link";
    default:
      return service;
  }
}
