import type { CallerProvider, CallerAppContext, CallerScopeContext } from "../core/caller.js";
import type { HolmDiagnosticsSink } from "../core/diagnostics.js";
import { HolmError } from "../core/errors.js";
import type { Clock, Scheduler } from "../core/runtime.js";
import type { TransportAuthProvider } from "../transports/index.js";
export interface NodeRuntimeServiceErrorOptions {
    readonly adapter: string;
    readonly service: NodeRuntimeServiceName;
    readonly message?: string;
}
export type NodeRuntimeServiceName = "fetch" | "auth" | "clock" | "scheduler" | "environment" | "secureStore";
export declare class UnsupportedNodeRuntimeServiceError extends HolmError {
    constructor(options: NodeRuntimeServiceErrorOptions);
}
export interface NodeEnvironmentService {
    get(name: string): string | undefined | Promise<string | undefined>;
}
export interface NodeSecureStoreService {
    get(key: string): string | undefined | Promise<string | undefined>;
    set?(key: string, value: string): void | Promise<void>;
    delete?(key: string): void | Promise<void>;
}
export interface NodeRuntimeServices {
    readonly environment: NodeEnvironmentService;
    readonly secureStore: NodeSecureStoreService;
    readonly diagnostics?: HolmDiagnosticsSink;
}
export interface NodeOperatorCallerOptions {
    readonly operatorId?: string;
    readonly app?: CallerAppContext;
    readonly scope?: CallerScopeContext;
    readonly origin?: string;
}
export interface NodeTokenAuthOptions {
    readonly token: string | (() => string);
    readonly scheme?: string;
    readonly cachePartition?: string;
    readonly operatorId?: string;
}
export declare function createNodeTokenAuth(options: NodeTokenAuthOptions): TransportAuthProvider;
export declare function createNodeOperatorCaller(options?: NodeOperatorCallerOptions): CallerProvider;
export declare function createUnsupportedClock(adapter: string): Clock;
export declare function createUnsupportedScheduler(adapter: string): Scheduler;
export declare function createNodeRuntimeServices(options: {
    readonly adapter: string;
    readonly environment?: NodeEnvironmentService;
    readonly secureStore?: NodeSecureStoreService;
    readonly diagnostics?: HolmDiagnosticsSink;
}): NodeRuntimeServices;
//# sourceMappingURL=services.d.ts.map