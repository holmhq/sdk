import { type CapabilityOffer } from "../core/capabilities.js";
import type { InvocationControl, OperationRequest, OperationResponse, RuntimeAdapter, Scheduler, Clock } from "../core/runtime.js";
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
export type InMemoryRuntimeHandler = (request: OperationRequest, control: InvocationControl) => OperationResponse | Promise<OperationResponse>;
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
export declare function createFakeClock(start?: number): FakeClockScheduler;
export declare function createInMemoryRuntimeAdapter(options?: InMemoryRuntimeAdapterOptions): InMemoryRuntimeAdapter;
//# sourceMappingURL=index.d.ts.map