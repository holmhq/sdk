import { CapabilityVersionError, negotiateCapability, UnsupportedCapabilityError, } from "../core/capabilities.js";
import { createInvocationContext } from "../core/caller.js";
import { CancelledError, throwIfCancelled } from "../core/cancellation.js";
import { HolmError, ProtocolError } from "../core/errors.js";
import { copyWireValue } from "../core/wire-value.js";
export const bridgeMailboxProtocol = "holm.sdk.bridge.mailbox/1";
export class UnsupportedBridgeRuntimeServiceError extends HolmError {
    constructor(options) {
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
export function copyBridgeMailboxEnvelope(envelope) {
    return copyBridgeEnvelope(envelope);
}
export function createBridgeMailbox(options) {
    const pending = new Map();
    return Object.freeze({
        get pendingCount() {
            return pending.size;
        },
        request(input) {
            const envelope = copyBridgeRequestEnvelope(input);
            if (pending.has(envelope.requestId)) {
                throw new ProtocolError({
                    code: "bridge_mailbox_request_duplicate",
                    message: "Bridge mailbox request IDs must be unique while pending.",
                    details: { requestId: envelope.requestId },
                });
            }
            const promise = new Promise((resolve, reject) => {
                pending.set(envelope.requestId, { resolve, reject });
            });
            try {
                options.post(envelope);
            }
            catch (cause) {
                pending.delete(envelope.requestId);
                throw new ProtocolError({
                    code: "bridge_mailbox_post_failed",
                    message: "Bridge mailbox post failed.",
                    cause,
                });
            }
            return promise;
        },
        receive(envelope) {
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
                    }
                    else {
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
        cancel(requestId, reason) {
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
export function createMockBridgeServices(options = {}) {
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
export function createReservedDesktopBridgeRuntime(options = {}) {
    return createReservedBridgeRuntime("desktop", options);
}
export function createReservedMobileBridgeRuntime(options = {}) {
    return createReservedBridgeRuntime("mobile", options);
}
export function createMockBridgeRuntime(options) {
    const id = normalizeId(options.id ?? `${options.surface}-bridge-mock`);
    const surface = options.surface;
    let offers = copyCapabilityOffers(options.capabilities ?? []);
    const handlers = new Map(Object.entries(options.handlers ?? {}));
    const invocations = [];
    const controls = [];
    const services = options.services ?? createMockBridgeServices({ adapter: id, surface });
    const clock = options.clock ?? unsupportedClock(id, surface);
    const scheduler = options.scheduler ?? unsupportedScheduler(id, surface);
    return Object.freeze({
        id,
        surface,
        clock,
        scheduler,
        services,
        get invocations() {
            return Object.freeze(invocations.map(copyOperationRequest));
        },
        get controls() {
            return Object.freeze(controls.map(copyInvocationControl));
        },
        async start() {
            return copyCapabilityOffers(offers);
        },
        async invoke(request, control) {
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
        async dispose() {
            return undefined;
        },
        setCapabilities(nextOffers) {
            offers = copyCapabilityOffers(nextOffers);
        },
        setHandler(key, handler) {
            handlers.set(key, handler);
        },
    });
}
function createReservedBridgeRuntime(surface, options) {
    const id = normalizeId(options.id ?? `${surface}-bridge-reserved`);
    return Object.freeze({
        id,
        surface,
        clock: options.clock ?? unsupportedClock(id, surface),
        scheduler: options.scheduler ?? unsupportedScheduler(id, surface),
        services: options.services ?? createMockBridgeServices({ adapter: id, surface }),
        async start() {
            return Object.freeze([]);
        },
        async invoke(request) {
            throw new UnsupportedCapabilityError({
                id: request.capability.id,
                requirement: copyCapabilityRequirement(request.capability),
                offered: Object.freeze([]),
                adapter: id,
                surface,
            });
        },
        async dispose() {
            return undefined;
        },
    });
}
function copyBridgeRequestEnvelope(input) {
    return Object.freeze({
        protocol: bridgeMailboxProtocol,
        kind: "request",
        requestId: normalizeId(input.requestId),
        capability: copyCapabilityRequirement(input.capability),
        operation: normalizeId(input.operation),
        payload: copyWireValue(input.payload),
    });
}
function copyBridgeCancelEnvelope(input) {
    return Object.freeze({
        protocol: bridgeMailboxProtocol,
        kind: "cancel",
        requestId: normalizeId(input.requestId),
        ...(input.reason === undefined ? {} : { reason: input.reason }),
    });
}
function copyBridgeEnvelope(envelope) {
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
function copyBridgeResponseEnvelope(envelope) {
    return Object.freeze({
        requestId: requireEnvelopeRequestId(envelope, "response"),
        payload: copyWireValue(requireEnvelopePayload(envelope)),
        ...(envelope.metadata === undefined ? {} : { metadata: copyWireValue(envelope.metadata) }),
    });
}
function requireEnvelopeRequestId(envelope, kind) {
    if (typeof envelope.requestId !== "string" || envelope.requestId.trim() === "") {
        throw new ProtocolError({
            code: "invalid_bridge_mailbox_request_id",
            message: `Bridge mailbox ${kind} envelopes must include a non-empty request ID.`,
        });
    }
    return envelope.requestId;
}
function requireEnvelopeCapability(envelope) {
    if (envelope.capability === undefined) {
        throw new ProtocolError({
            code: "invalid_bridge_mailbox_capability",
            message: "Bridge mailbox request envelopes must include a capability requirement.",
        });
    }
    return envelope.capability;
}
function requireEnvelopeOperation(envelope) {
    if (typeof envelope.operation !== "string" || envelope.operation.trim() === "") {
        throw new ProtocolError({
            code: "invalid_bridge_mailbox_operation",
            message: "Bridge mailbox request envelopes must include a non-empty operation.",
        });
    }
    return envelope.operation;
}
function requireEnvelopePayload(envelope) {
    if (!("payload" in envelope)) {
        throw new ProtocolError({
            code: "invalid_bridge_mailbox_payload",
            message: "Bridge mailbox envelopes must include a payload when their kind requires one.",
        });
    }
    return envelope.payload;
}
function requireEnvelopeError(envelope) {
    const error = envelope.error;
    if (error?.$holm !== "error" ||
        typeof error.kind !== "string" ||
        typeof error.code !== "string" ||
        error.code.trim() === "" ||
        typeof error.message !== "string") {
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
function holmErrorFromSerialized(error) {
    return new HolmError({
        kind: error.kind,
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
        ...(error.status === undefined ? {} : { status: error.status }),
        ...(error.retryable === undefined ? {} : { retryable: error.retryable }),
    });
}
function resolveSecureStorage(input, adapter, surface) {
    if (input === undefined) {
        return unsupportedSecureStorage(adapter, surface);
    }
    if ("get" in input) {
        return input;
    }
    const entries = new Map();
    for (const [key, value] of Object.entries(input.entries ?? {})) {
        entries.set(key, copyWireValue(value));
    }
    return Object.freeze({
        get(key) {
            const value = entries.get(key);
            return value === undefined ? undefined : copyWireValue(value);
        },
        set(key, value) {
            entries.set(key, copyWireValue(value));
        },
        delete(key) {
            entries.delete(key);
        },
    });
}
function resolveLifecycle(input, adapter, surface) {
    if (input === undefined) {
        return unsupportedLifecycle(adapter, surface);
    }
    if ("current" in input) {
        return input;
    }
    const listeners = new Set();
    const snapshot = copyLifecycleSnapshot(input);
    return Object.freeze({
        current() {
            return copyLifecycleSnapshot(snapshot);
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    });
}
function resolveConnectivity(input, adapter, surface) {
    if (input === undefined) {
        return unsupportedConnectivity(adapter, surface);
    }
    if ("current" in input) {
        return input;
    }
    const listeners = new Set();
    const snapshot = copyConnectivitySnapshot(input);
    return Object.freeze({
        current() {
            return copyConnectivitySnapshot(snapshot);
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    });
}
function resolveDeepLink(input, adapter, surface) {
    if (input === undefined) {
        return unsupportedDeepLink(adapter, surface);
    }
    if ("initial" in input) {
        return input;
    }
    const listeners = new Set();
    const event = copyDeepLinkEvent(input);
    return Object.freeze({
        initial() {
            return copyDeepLinkEvent(event);
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    });
}
function resolveBackground(input, adapter, surface) {
    if (input === undefined) {
        return unsupportedBackground(adapter, surface);
    }
    if (isBridgeBackgroundService(input)) {
        return input;
    }
    const handlers = new Map(Object.entries(input));
    return Object.freeze({
        run(task, payload) {
            const handler = handlers.get(task);
            return handler ? copyOptionalWireValue(handler(copyWireValue(payload))) : undefined;
        },
    });
}
function isBridgeBackgroundService(input) {
    return typeof input.run === "function";
}
function unsupportedSecureStorage(adapter, surface) {
    return Object.freeze({
        get() {
            throw unsupportedService(adapter, surface, "secureStorage");
        },
        set() {
            throw unsupportedService(adapter, surface, "secureStorage");
        },
        delete() {
            throw unsupportedService(adapter, surface, "secureStorage");
        },
    });
}
function unsupportedLifecycle(adapter, surface) {
    return Object.freeze({
        current() {
            throw unsupportedService(adapter, surface, "lifecycle");
        },
        subscribe() {
            throw unsupportedService(adapter, surface, "lifecycle");
        },
    });
}
function unsupportedConnectivity(adapter, surface) {
    return Object.freeze({
        current() {
            throw unsupportedService(adapter, surface, "connectivity");
        },
        subscribe() {
            throw unsupportedService(adapter, surface, "connectivity");
        },
    });
}
function unsupportedDeepLink(adapter, surface) {
    return Object.freeze({
        initial() {
            throw unsupportedService(adapter, surface, "deepLink");
        },
        subscribe() {
            throw unsupportedService(adapter, surface, "deepLink");
        },
    });
}
function unsupportedNavigation(adapter, surface) {
    return Object.freeze({
        open() {
            throw unsupportedService(adapter, surface, "navigation");
        },
    });
}
function unsupportedBackground(adapter, surface) {
    return Object.freeze({
        run() {
            throw unsupportedService(adapter, surface, "background");
        },
    });
}
function unsupportedClock(adapter, surface) {
    return Object.freeze({
        now() {
            throw unsupportedService(adapter, surface, "clock");
        },
    });
}
function unsupportedScheduler(adapter, surface) {
    return Object.freeze({
        schedule() {
            throw unsupportedService(adapter, surface, "scheduler");
        },
    });
}
function unsupportedService(adapter, surface, service) {
    return new UnsupportedBridgeRuntimeServiceError({ adapter, surface, service });
}
function copyLifecycleSnapshot(snapshot) {
    return Object.freeze({
        state: snapshot.state,
        ...(snapshot.at === undefined ? {} : { at: snapshot.at }),
    });
}
function copyConnectivitySnapshot(snapshot) {
    return Object.freeze({
        kind: snapshot.kind,
        ...(snapshot.metered === undefined ? {} : { metered: snapshot.metered }),
        ...(snapshot.at === undefined ? {} : { at: snapshot.at }),
    });
}
function copyDeepLinkEvent(event) {
    return Object.freeze({
        url: event.url,
        ...(event.at === undefined ? {} : { at: event.at }),
    });
}
function copyCapabilityOffers(offers) {
    return Object.freeze(offers.map(copyCapabilityOffer));
}
function copyCapabilityOffer(offer) {
    return Object.freeze({
        id: offer.id,
        origin: offer.origin,
        version: Object.freeze({ major: offer.version.major, minor: offer.version.minor }),
    });
}
function copyCapabilityRequirement(capability) {
    return Object.freeze({
        id: capability.id,
        major: capability.major,
        ...(capability.minMinor === undefined ? {} : { minMinor: capability.minMinor }),
    });
}
function copyInvocationControl(control) {
    return Object.freeze({
        ...(control.cancellation === undefined ? {} : { cancellation: control.cancellation }),
        ...(control.timeoutMs === undefined ? {} : { timeoutMs: control.timeoutMs }),
    });
}
function copyOperationRequest(request) {
    return Object.freeze({
        requestId: request.requestId,
        capability: copyCapabilityRequirement(request.capability),
        operation: request.operation,
        caller: createInvocationContext(request.caller, request.caller.invocationId, request.caller.startedAt, request.caller.reason),
        callerFingerprint: request.callerFingerprint,
        payload: copyWireValue(request.payload),
    });
}
function copyOperationResponse(response) {
    return Object.freeze({
        requestId: response.requestId,
        payload: copyWireValue(response.payload),
        ...(response.metadata === undefined ? {} : { metadata: copyWireValue(response.metadata) }),
    });
}
function copyOptionalWireValue(value) {
    return value === undefined ? undefined : copyWireValue(value);
}
function requireRuntimeOffer(offers, request, adapter, surface) {
    try {
        negotiateCapability(offers, request.capability);
    }
    catch (error) {
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
function normalizeId(value) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError("Bridge identifiers must be non-empty strings.");
    }
    return normalized;
}
function formatService(service) {
    switch (service) {
        case "secureStorage":
            return "secure-storage";
        case "deepLink":
            return "deep-link";
        default:
            return service;
    }
}
//# sourceMappingURL=index.js.map