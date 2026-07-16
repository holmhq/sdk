import type { WireValue } from "../core/wire-value.js";
import type { TransportParams } from "../transports/index.js";
import type { AppHttpClient } from "./http.js";
import {
  withUploadPath,
  type AppLinkImportRequest,
  type AppUpload,
} from "./upload.js";

export interface AppLinksApi {
  list<Result = WireValue>(appId: string, filters?: TransportParams): Promise<Result>;
  get<Result = WireValue>(appId: string, idOrSlug: string): Promise<Result>;
  create<Result = WireValue>(appId: string, data: unknown): Promise<Result>;
  update<Result = WireValue>(appId: string, idOrSlug: string, data: unknown): Promise<Result>;
  delete<Result = WireValue>(appId: string, idOrSlug: string): Promise<Result>;
  import<Result = WireValue>(appId: string, request: AppLinkImportRequest): Promise<Result>;
}

export function createAppLinksApi(http: AppHttpClient, upload: AppUpload): AppLinksApi {
  return Object.freeze({
    list<Result = WireValue>(appId: string, filters: TransportParams = {}): Promise<Result> {
      return http.get<Result>(linksPath(appId), {
        params: filters,
        reason: "app.links.list",
      });
    },
    get<Result = WireValue>(appId: string, idOrSlug: string): Promise<Result> {
      return http.get<Result>(linkPath(appId, idOrSlug), { reason: "app.links.get" });
    },
    create<Result = WireValue>(appId: string, data: unknown): Promise<Result> {
      return http.post<Result>(linksPath(appId), data, { reason: "app.links.create" });
    },
    update<Result = WireValue>(appId: string, idOrSlug: string, data: unknown): Promise<Result> {
      return http.patch<Result>(linkPath(appId, idOrSlug), data, { reason: "app.links.update" });
    },
    delete<Result = WireValue>(appId: string, idOrSlug: string): Promise<Result> {
      return http.delete<Result>(linkPath(appId, idOrSlug), { reason: "app.links.delete" });
    },
    import<Result = WireValue>(appId: string, request: AppLinkImportRequest): Promise<Result> {
      return upload<Result>(withUploadPath(`${linksPath(appId)}/import`, request));
    },
  });
}

function linksPath(appId: string): string {
  return `/api/apps/${encodePathSegment(appId, "App id")}/links`;
}

function linkPath(appId: string, idOrSlug: string): string {
  return `${linksPath(appId)}/${encodePathSegment(idOrSlug, "Link id or slug")}`;
}

function encodePathSegment(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError(`${label} must be non-empty.`);
  }
  return encodeURIComponent(normalized);
}
