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
    let offers = Object.freeze([...(options.offers ?? [])]);
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
            return requests;
        },
        get controls() {
            return controls;
        },
        get startCount() {
            return startCount;
        },
        get disposeCount() {
            return disposeCount;
        },
        async start() {
            startCount += 1;
            return offers;
        },
        async invoke(request, control) {
            requests.push(request);
            controls.push(control);
            const handler = handlers.get(`${request.capability.id}:${request.operation}`);
            if (handler) {
                return handler(request, control);
            }
            return { requestId: request.requestId, payload: copyWireValue(request.payload) };
        },
        async dispose() {
            disposeCount += 1;
        },
        setOffers(nextOffers) {
            offers = Object.freeze([...nextOffers]);
        },
        setHandler(key, handler) {
            handlers.set(key, handler);
        },
    });
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