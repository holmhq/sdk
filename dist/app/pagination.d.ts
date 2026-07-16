import type { WireValue } from "../core/wire-value.js";
import type { TransportParams } from "../transports/index.js";
import type { AppHttpClient } from "./http.js";
export interface AppPaginationOptions {
    readonly limit?: number;
    readonly params?: TransportParams;
}
export interface AppPage<Item> {
    readonly items: readonly Item[];
    readonly done: boolean;
}
export interface AppPaginator<Item> {
    next(): Promise<AppPage<Item>>;
    reset(): void;
}
export type AppPaginate = <Item = WireValue>(url: string, options?: AppPaginationOptions) => AppPaginator<Item>;
export declare function createAppPaginate(http: AppHttpClient): AppPaginate;
//# sourceMappingURL=pagination.d.ts.map