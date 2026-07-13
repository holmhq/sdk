import { type WireValue } from "./wire-value.js";
export type HolmErrorKind = "capability" | "transport" | "remote" | "protocol" | "serialization" | "cancellation" | "timeout" | "lifecycle" | "extension";
export interface HolmErrorOptions {
    readonly kind: HolmErrorKind;
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
    readonly status?: number;
    readonly retryable?: boolean;
    readonly cause?: unknown;
}
export interface SerializedHolmError {
    readonly $holm: "error";
    readonly kind: HolmErrorKind;
    readonly code: string;
    readonly message: string;
    readonly details?: WireValue;
    readonly status?: number;
    readonly retryable?: boolean;
}
export declare class HolmError extends Error {
    readonly kind: HolmErrorKind;
    readonly code: string;
    readonly details?: unknown;
    readonly status?: number;
    readonly retryable?: boolean;
    constructor(options: HolmErrorOptions);
    toJSON(): SerializedHolmError;
}
export declare function isHolmError(value: unknown): value is HolmError;
export declare function serializeHolmError(value: unknown): SerializedHolmError;
//# sourceMappingURL=errors.d.ts.map