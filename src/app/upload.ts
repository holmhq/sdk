import { UnsupportedCapabilityError } from "../core/capabilities.js";
import type { WireValue } from "../core/wire-value.js";
import type { UploadRequest } from "../transports/index.js";

export type AppUploadRequest = UploadRequest;
export type AppLinkImportRequest = Omit<AppUploadRequest, "path">;

export interface AppUploadService {
  upload(request: AppUploadRequest): WireValue | Promise<WireValue>;
}

export type AppUpload = <Result = WireValue>(request: AppUploadRequest) => Promise<Result>;

export function createAppUpload(service: AppUploadService | undefined): AppUpload {
  return async function upload<Result = WireValue>(request: AppUploadRequest): Promise<Result> {
    if (service === undefined) {
      throw new UnsupportedCapabilityError({
        id: "sdk.app.upload",
        message: "App uploads require an explicit runtime upload service.",
      });
    }
    return await service.upload(request) as Result;
  };
}

export function withUploadPath(path: string, request: AppLinkImportRequest): AppUploadRequest {
  return Object.freeze({
    ...request,
    path,
  });
}
