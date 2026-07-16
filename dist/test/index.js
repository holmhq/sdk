import { CapabilityVersionError, negotiateCapability, UnsupportedCapabilityError, } from "../core/capabilities.js";
import { createInvocationContext } from "../core/caller.js";
import { throwIfCancelled } from "../core/cancellation.js";
import { copyWireValue } from "../core/wire-value.js";
export function createFakeClock(start = 0) {
    let now = start;
    let nextId = 0;
    const entries = [];
    const clock = Object.freeze({
        now() {
            return now;
        },
        advanceBy(delayMs) {
            advanceBy(delayMs);
        },
        set(nextNow) {
            if (!Number.isFinite(nextNow)) {
                throw new TypeError("Fake clock time must be finite.");
            }
            now = nextNow;
            runDue();
        },
    });
    const scheduler = Object.freeze({
        schedule(delayMs, task) {
            if (!Number.isFinite(delayMs) || delayMs < 0) {
                throw new TypeError("Fake scheduler delay must be a non-negative finite number.");
            }
            const entry = {
                id: nextId,
                dueAt: now + delayMs,
                task,
                cancelled: false,
            };
            nextId += 1;
            entries.push(entry);
            sortEntries(entries);
            return Object.freeze({
                cancel() {
                    entry.cancelled = true;
                },
            });
        },
        runDue() {
            runDue();
        },
        pending() {
            return entries.filter((entry) => !entry.cancelled).length;
        },
    });
    function advanceBy(delayMs) {
        if (!Number.isFinite(delayMs) || delayMs < 0) {
            throw new TypeError("Fake clock advance must be a non-negative finite number.");
        }
        now += delayMs;
        runDue();
    }
    function runDue() {
        for (;;) {
            const index = entries.findIndex((entry) => !entry.cancelled && entry.dueAt <= now);
            if (index === -1) {
                removeCancelled(entries);
                return;
            }
            const [entry] = entries.splice(index, 1);
            if (entry && !entry.cancelled) {
                entry.cancelled = true;
                entry.task();
            }
        }
    }
    return Object.freeze({
        clock,
        scheduler,
        advanceBy,
        pending() {
            return scheduler.pending();
        },
    });
}
export function createInMemoryRuntimeAdapter(options = {}) {
    const fake = createFakeClock();
    let offers = copyCapabilityOffers(options.offers ?? []);
    let startCount = 0;
    let disposeCount = 0;
    const requests = [];
    const controls = [];
    const handlers = new Map(Object.entries(options.handlers ?? {}));
    return Object.freeze({
        id: options.id ?? "runtime-test",
        surface: options.surface ?? "test",
        clock: options.clock ?? fake.clock,
        scheduler: options.scheduler ?? fake.scheduler,
        get requests() {
            return Object.freeze([...requests]);
        },
        get controls() {
            return Object.freeze([...controls]);
        },
        get startCount() {
            return startCount;
        },
        get disposeCount() {
            return disposeCount;
        },
        async start() {
            startCount += 1;
            return copyCapabilityOffers(offers);
        },
        async invoke(request, control) {
            const controlSnapshot = copyInvocationControl(control);
            throwIfCancelled(controlSnapshot.cancellation);
            const requestSnapshot = copyOperationRequest(request);
            requireRuntimeOffer(offers, requestSnapshot, options.id ?? "runtime-test", options.surface ?? "test");
            requests.push(requestSnapshot);
            controls.push(controlSnapshot);
            const handler = handlers.get(`${requestSnapshot.capability.id}:${requestSnapshot.operation}`);
            if (handler) {
                return copyOperationResponse(await handler(requestSnapshot, controlSnapshot));
            }
            return copyOperationResponse({ requestId: requestSnapshot.requestId, payload: requestSnapshot.payload });
        },
        async dispose() {
            disposeCount += 1;
        },
        setOffers(nextOffers) {
            offers = copyCapabilityOffers(nextOffers);
        },
        setHandler(key, handler) {
            handlers.set(key, handler);
        },
    });
}
function copyCapabilityOffers(offers) {
    return Object.freeze(offers.map((offer) => copyCapabilityOffer(offer)));
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
function sortEntries(entries) {
    entries.sort((left, right) => left.dueAt - right.dueAt || left.id - right.id);
}
function removeCancelled(entries) {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
        if (entries[index]?.cancelled) {
            entries.splice(index, 1);
        }
    }
}
//# sourceMappingURL=index.js.map