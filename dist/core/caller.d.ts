import type { SurfaceKind } from "./runtime.js";
export type PrincipalRef = {
    readonly kind: "anonymous";
} | {
    readonly kind: "browser-session";
} | {
    readonly kind: "member";
    readonly id: string;
} | {
    readonly kind: "operator";
    readonly id?: string;
} | {
    readonly kind: "agent";
    readonly memberId: string;
} | {
    readonly kind: "service";
    readonly id: string;
};
export interface CallerAppContext {
    readonly id: string;
}
export interface CallerScopeContext {
    readonly id: string;
    readonly type?: string;
}
export interface CallerContext {
    readonly surface: SurfaceKind;
    readonly principal: PrincipalRef;
    readonly app?: CallerAppContext;
    readonly scope?: CallerScopeContext;
    readonly origin?: string;
}
export interface InvocationContext extends CallerContext {
    readonly invocationId: string;
    readonly startedAt: number;
    readonly reason?: string;
}
export interface CallerProvider {
    current(): CallerContext | Promise<CallerContext>;
    subscribe?(listener: () => void): () => void;
}
export interface CallerPartition {
    readonly runtime: {
        readonly id: string;
        readonly surface: SurfaceKind;
    };
    readonly capability: {
        readonly id: string;
        readonly major: number;
        readonly minMinor?: number;
    };
    readonly operation: string;
    readonly caller: CallerContext;
    readonly fingerprint: string;
}
export type CallerPartitionListener = (partition: CallerPartition) => void;
export declare function createStaticCallerProvider(context: CallerContext): CallerProvider;
export declare function resolveCallerContext(provider: CallerProvider): Promise<CallerContext>;
export declare function createInvocationContext(context: CallerContext, invocationId: string, startedAt: number, reason?: string): InvocationContext;
export declare function createCallerFingerprint(context: CallerContext): string;
export declare function normalizeCallerContext(context: CallerContext): CallerContext;
//# sourceMappingURL=caller.d.ts.map