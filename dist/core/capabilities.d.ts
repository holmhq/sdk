import { HolmError } from "./errors.js";
export interface CapabilityVersion {
    readonly major: number;
    readonly minor: number;
}
export type CapabilityOrigin = "runtime" | "extension";
export interface CapabilityOffer {
    readonly id: string;
    readonly version: CapabilityVersion;
    readonly origin: CapabilityOrigin;
}
export interface CapabilityRequirement {
    readonly id: string;
    readonly major: number;
    readonly minMinor?: number;
}
export interface UnsupportedCapabilityErrorOptions {
    readonly id: string;
    readonly requirement?: unknown;
    readonly offered?: unknown;
    readonly adapter?: string;
    readonly surface?: string;
    readonly message?: string;
}
export interface CapabilityVersionErrorOptions {
    readonly id: string;
    readonly requirement: unknown;
    readonly offered: unknown;
    readonly adapter?: string;
    readonly surface?: string;
    readonly message?: string;
}
export interface InvalidCapabilityRequirementErrorOptions {
    readonly reason: string;
    readonly requirement?: unknown;
}
export interface DuplicateCapabilityOfferErrorOptions {
    readonly id: string;
    readonly version: unknown;
    readonly existing: unknown;
    readonly duplicate: unknown;
}
export interface CapabilitySnapshot {
    readonly revision: number;
    readonly offers: readonly CapabilityOffer[];
}
export type CapabilitySnapshotListener = (snapshot: CapabilitySnapshot) => void;
export interface CapabilityRegistry {
    getSnapshot(): CapabilitySnapshot;
    match(requirement: CapabilityRequirement): CapabilityOffer | undefined;
    require(requirement: CapabilityRequirement): CapabilityOffer;
    replaceOffers(offers: readonly CapabilityOffer[]): CapabilitySnapshot;
    subscribe(listener: CapabilitySnapshotListener): () => void;
}
export declare class UnsupportedCapabilityError extends HolmError {
    constructor(options: UnsupportedCapabilityErrorOptions);
}
export declare class CapabilityVersionError extends HolmError {
    constructor(options: CapabilityVersionErrorOptions);
}
export declare class InvalidCapabilityRequirementError extends HolmError {
    constructor(options: InvalidCapabilityRequirementErrorOptions);
}
export declare class DuplicateCapabilityOfferError extends HolmError {
    constructor(options: DuplicateCapabilityOfferErrorOptions);
}
export declare function createCapabilityRegistry(offers?: readonly CapabilityOffer[]): CapabilityRegistry;
export declare function negotiateCapability(offers: readonly CapabilityOffer[], requirement: CapabilityRequirement): CapabilityOffer;
//# sourceMappingURL=capabilities.d.ts.map