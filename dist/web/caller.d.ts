import { type CallerProvider, type CallerScopeContext, type PrincipalRef } from "../core/index.js";
export type WebCallerValueSource<Value> = Value | (() => Value);
export interface WebCallerOptions {
    readonly principal?: WebCallerValueSource<PrincipalRef>;
    readonly appId?: WebCallerValueSource<string | undefined>;
    readonly scope?: WebCallerValueSource<CallerScopeContext | undefined>;
    readonly origin?: WebCallerValueSource<string | undefined>;
    readonly subscribe?: (listener: () => void) => () => void;
}
export declare function createWebCaller(options?: WebCallerOptions): CallerProvider;
//# sourceMappingURL=caller.d.ts.map