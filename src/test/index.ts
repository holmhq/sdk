import {
  CapabilityVersionError,
  negotiateCapability,
  UnsupportedCapabilityError,
  type CapabilityOffer,
  type CapabilityRequirement,
} from "../core/capabilities.js";
import { createInvocationContext } from "../core/caller.js";
import { throwIfCancelled } from "../core/cancellation.js";
import type { InvocationControl, OperationRequest, OperationResponse, RuntimeAdapter, Scheduler, Clock } from "../core/runtime.js";
import { copyWireValue } from "../core/wire-value.js";

export interface FakeClock extends Clock {
  advanceBy(delayMs: number): void;
  set(now: number): void;
}

export interface FakeScheduler extends Scheduler {
  runDue(): void;
  pending(): number;
}

export interface FakeClockScheduler {
  readonly clock: FakeClock;
  readonly scheduler: FakeScheduler;
  advanceBy(delayMs: number): void;
  pending(): number;
}

interface ScheduledEntry {
  readonly id: number;
  readonly dueAt: number;
  readonly task: () => void;
  cancelled: boolean;
}

export type InMemoryRuntimeHandler = (
  request: OperationRequest,
  control: InvocationControl,
) => OperationResponse | Promise<OperationResponse>;

export interface InMemoryRuntimeAdapter extends RuntimeAdapter {
  readonly requests: readonly OperationRequest[];
  readonly controls: readonly InvocationControl[];
  readonly startCount: number;
  readonly disposeCount: number;
  setOffers(offers: readonly CapabilityOffer[]): void;
  setHandler(key: string, handler: InMemoryRuntimeHandler): void;
}

export interface InMemoryRuntimeAdapterOptions {
  readonly id?: string;
  readonly surface?: "test";
  readonly clock?: Clock;
  readonly scheduler?: Scheduler;
  readonly offers?: readonly CapabilityOffer[];
  readonly handlers?: Readonly<Record<string, InMemoryRuntimeHandler>>;
}

export function createFakeClock(start = 0): FakeClockScheduler {
  let now = start;
  let nextId = 0;
  const entries: ScheduledEntry[] = [];

  const clock = Object.freeze({
    now(): number {
      return now;
    },
    advanceBy(delayMs: number): void {
      advanceBy(delayMs);
    },
    set(nextNow: number): void {
      if (!Number.isFinite(nextNow)) {
        throw new TypeError("Fake clock time must be finite.");
      }
      now = nextNow;
      runDue();
    },
  }) satisfies FakeClock;

  const scheduler = Object.freeze({
    schedule(delayMs: number, task: () => void): { cancel(): void } {
      if (!Number.isFinite(delayMs) || delayMs < 0) {
        throw new TypeError("Fake scheduler delay must be a non-negative finite number.");
      }
      const entry: ScheduledEntry = {
        id: nextId,
        dueAt: now + delayMs,
        task,
        cancelled: false,
      };
      nextId += 1;
      entries.push(entry);
      sortEntries(entries);
      return Object.freeze({
        cancel(): void {
          entry.cancelled = true;
        },
      });
    },
    runDue(): void {
      runDue();
    },
    pending(): number {
      return entries.filter((entry) => !entry.cancelled).length;
    },
  }) satisfies FakeScheduler;

  function advanceBy(delayMs: number): void {
    if (!Number.isFinite(delayMs) || delayMs < 0) {
      throw new TypeError("Fake clock advance must be a non-negative finite number.");
    }
    now += delayMs;
    runDue();
  }

  function runDue(): void {
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
    pending(): number {
      return scheduler.pending();
    },
  });
}

export function createInMemoryRuntimeAdapter(options: InMemoryRuntimeAdapterOptions = {}): InMemoryRuntimeAdapter {
  const fake = createFakeClock();
  let offers = copyCapabilityOffers(options.offers ?? []);
  let startCount = 0;
  let disposeCount = 0;
  const requests: OperationRequest[] = [];
  const controls: InvocationControl[] = [];
  const handlers = new Map<string, InMemoryRuntimeHandler>(Object.entries(options.handlers ?? {}));

  return Object.freeze({
    id: options.id ?? "runtime-test",
    surface: options.surface ?? "test",
    clock: options.clock ?? fake.clock,
    scheduler: options.scheduler ?? fake.scheduler,
    get requests(): readonly OperationRequest[] {
      return Object.freeze([...requests]);
    },
    get controls(): readonly InvocationControl[] {
      return Object.freeze([...controls]);
    },
    get startCount(): number {
      return startCount;
    },
    get disposeCount(): number {
      return disposeCount;
    },
    async start(): Promise<readonly CapabilityOffer[]> {
      startCount += 1;
      return copyCapabilityOffers(offers);
    },
    async invoke(request: OperationRequest, control: InvocationControl): Promise<OperationResponse> {
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
    async dispose(): Promise<void> {
      disposeCount += 1;
    },
    setOffers(nextOffers: readonly CapabilityOffer[]): void {
      offers = copyCapabilityOffers(nextOffers);
    },
    setHandler(key: string, handler: InMemoryRuntimeHandler): void {
      handlers.set(key, handler);
    },
  }) satisfies InMemoryRuntimeAdapter;
}

function copyCapabilityOffers(offers: readonly CapabilityOffer[]): readonly CapabilityOffer[] {
  return Object.freeze(offers.map((offer) => copyCapabilityOffer(offer)));
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

function requireRuntimeOffer(
  offers: readonly CapabilityOffer[],
  request: OperationRequest,
  adapter: string,
  surface: string,
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

function sortEntries(entries: ScheduledEntry[]): void {
  entries.sort((left, right) => left.dueAt - right.dueAt || left.id - right.id);
}

function removeCancelled(entries: ScheduledEntry[]): void {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (entries[index]?.cancelled) {
      entries.splice(index, 1);
    }
  }
}
