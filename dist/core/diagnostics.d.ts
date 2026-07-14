import { type SerializedHolmError } from "./errors.js";
import type { WireObject } from "./wire-value.js";
export type HolmDiagnosticSeverity = "debug" | "info" | "warn" | "error";
export interface HolmDiagnosticEventInput {
    readonly channel: string;
    readonly code: string;
    readonly severity: HolmDiagnosticSeverity;
    readonly message: string;
    readonly at?: number;
    readonly details?: unknown;
    readonly error?: unknown;
}
export interface HolmDiagnosticEvent {
    readonly channel: string;
    readonly code: string;
    readonly severity: HolmDiagnosticSeverity;
    readonly message: string;
    readonly at?: number;
    readonly details?: WireObject;
    readonly error?: SerializedHolmError;
}
export type HolmDiagnosticsHandler = (event: HolmDiagnosticEvent) => void | PromiseLike<void>;
export interface HolmDiagnosticsSink {
    emit(event: HolmDiagnosticEventInput): HolmDiagnosticEvent;
}
export interface DiagnosticsSinkOptions {
    readonly onHandlerError?: HolmDiagnosticsHandler;
}
export declare function createHolmDiagnosticEvent(input: HolmDiagnosticEventInput): HolmDiagnosticEvent;
export declare function createDiagnosticsSink(handlers?: HolmDiagnosticsHandler | readonly HolmDiagnosticsHandler[], options?: DiagnosticsSinkOptions): HolmDiagnosticsSink;
//# sourceMappingURL=diagnostics.d.ts.map