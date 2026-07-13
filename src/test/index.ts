import type { CapabilityOffer } from "../core/capabilities.js";
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
  let offers = Object.freeze([...(options.offers ?? [])]) as readonly CapabilityOffer[];
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
      return requests;
    },
    get controls(): readonly InvocationControl[] {
      return controls;
    },
    get startCount(): number {
      return startCount;
    },
    get disposeCount(): number {
      return disposeCount;
    },
    async start(): Promise<readonly CapabilityOffer[]> {
      startCount += 1;
      return offers;
    },
    async invoke(request: OperationRequest, control: InvocationControl): Promise<OperationResponse> {
      requests.push(request);
      controls.push(control);
      const handler = handlers.get(`${request.capability.id}:${request.operation}`);
      if (handler) {
        return handler(request, control);
      }
      return { requestId: request.requestId, payload: copyWireValue(request.payload) };
    },
    async dispose(): Promise<void> {
      disposeCount += 1;
    },
    setOffers(nextOffers: readonly CapabilityOffer[]): void {
      offers = Object.freeze([...nextOffers]);
    },
    setHandler(key: string, handler: InMemoryRuntimeHandler): void {
      handlers.set(key, handler);
    },
  }) satisfies InMemoryRuntimeAdapter;
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
