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

export type AppPaginate = <Item = WireValue>(
  url: string,
  options?: AppPaginationOptions,
) => AppPaginator<Item>;

export function createAppPaginate(http: AppHttpClient): AppPaginate {
  return function paginate<Item = WireValue>(
    url: string,
    options: AppPaginationOptions = {},
  ): AppPaginator<Item> {
    const limit = normalizeLimit(options.limit ?? 50);
    const params = Object.freeze({ ...(options.params ?? {}) });
    let offset = 0;
    let done = false;

    return Object.freeze({
      async next(): Promise<AppPage<Item>> {
        if (done) {
          return emptyPage();
        }
        const payload = await http.get<unknown>(url, {
          params: { ...params, limit, offset },
          reason: "app.paginate.next",
        });
        const items = extractPageItems<Item>(payload);
        offset += items.length;
        done = items.length < limit;
        return Object.freeze({ items, done });
      },
      reset(): void {
        offset = 0;
        done = false;
      },
    });
  };
}

function extractPageItems<Item>(payload: unknown): readonly Item[] {
  if (Array.isArray(payload)) {
    return Object.freeze([...payload]) as readonly Item[];
  }
  if (typeof payload !== "object" || payload === null) {
    return Object.freeze([]);
  }
  const record = payload as { readonly entries?: unknown; readonly items?: unknown };
  const values = Array.isArray(record.entries)
    ? record.entries
    : Array.isArray(record.items)
      ? record.items
      : [];
  return Object.freeze([...values]) as readonly Item[];
}

function emptyPage<Item>(): AppPage<Item> {
  return Object.freeze({ items: Object.freeze([]), done: true });
}

function normalizeLimit(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError("App pagination limit must be a positive safe integer.");
  }
  return value;
}
