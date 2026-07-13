import { HolmError } from "./errors.js";
export type LifecycleState = "created" | "starting" | "ready" | "failed" | "disposing" | "disposed";
export interface LifecycleSnapshot {
    readonly revision: number;
    readonly state: LifecycleState;
}
export interface LifecycleErrorOptions {
    readonly code: string;
    readonly message: string;
    readonly state?: LifecycleState;
    readonly details?: unknown;
    readonly cause?: unknown;
}
export interface LifecycleControllerOptions {
    start(): void | Promise<void>;
    dispose(): void | Promise<void>;
}
export interface LifecycleController {
    getSnapshot(): LifecycleSnapshot;
    start(): Promise<void>;
    dispose(): Promise<void>;
    assertReady(): void;
}
export declare class LifecycleError extends HolmError {
    constructor(options: LifecycleErrorOptions);
}
export declare function createLifecycleController(options: LifecycleControllerOptions): LifecycleController;
//# sourceMappingURL=lifecycle.d.ts.map