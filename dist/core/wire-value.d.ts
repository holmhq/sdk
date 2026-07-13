export type WireScalar = null | boolean | number | string;
export type WireArray = readonly WireValue[];
export type WireObject = {
    readonly [key: string]: WireValue;
};
export type WireValue = WireScalar | ReadonlyBytes | WireArray | WireObject;
export interface ReadonlyBytes extends Iterable<number> {
    readonly $holm: "bytes";
    readonly byteLength: number;
    at(index: number): number | undefined;
    toUint8Array(): Uint8Array;
    toJSON(): HolmBytesTag;
}
export interface HolmBytesTag {
    readonly $holm: "bytes";
    readonly base64: string;
}
export declare function createReadonlyBytes(input: ArrayLike<number> | Iterable<number>): ReadonlyBytes;
export declare function isReadonlyBytes(value: unknown): value is ReadonlyBytes;
export declare function isWireValue(value: unknown): value is WireValue;
export declare function assertWireValue(value: unknown): asserts value is WireValue;
export declare function copyWireValue(value: unknown): WireValue;
export declare function canonicalEncodeWireValue(value: unknown): string;
//# sourceMappingURL=wire-value.d.ts.map