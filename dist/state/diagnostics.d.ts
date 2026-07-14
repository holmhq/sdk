import { type HolmDiagnosticsSink } from "../core/index.js";
import type { Clock } from "../core/runtime.js";
import type { Resource, ResourcePhase } from "./resource.js";
export interface ResourceHistoryEntry {
    readonly resourceId: string;
    readonly revision: number;
    readonly phase: ResourcePhase;
    readonly stale: boolean;
    readonly refreshing: boolean;
    readonly hasData: boolean;
    readonly at?: number;
    readonly updatedAt?: number;
    readonly errorCode?: string;
}
export interface ResourceHistoryOptions {
    readonly id?: string;
    readonly capacity?: number;
    readonly includeInitial?: boolean;
    readonly clock?: Clock;
    readonly diagnostics?: HolmDiagnosticsSink;
}
export interface ResourceHistory {
    getEntries(): readonly ResourceHistoryEntry[];
    dispose(): void;
}
export declare function createResourceHistory(resource: Resource<unknown, {
    readonly code?: string;
}>, options?: ResourceHistoryOptions): ResourceHistory;
//# sourceMappingURL=diagnostics.d.ts.map