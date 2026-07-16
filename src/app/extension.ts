import type { ExtensionSetupContext, HolmExtension } from "../core/extensions.js";
import {
  createAppAuthApi,
  type AppAuthApi,
  type AppNavigationService,
} from "./auth.js";
import {
  createAppHttpClient,
  type AppHttpClient,
  type AppRequestIdFactory,
} from "./http.js";
import { createAppLinksApi, type AppLinksApi } from "./links.js";
import { createAppPaginate, type AppPaginate } from "./pagination.js";
import { HOLM_APP_HTTP_CAPABILITY } from "./protocol.js";
import {
  createAppSurfaceApi,
  type AppSurfaceApi,
  type AppSurfaceBootstrap,
} from "./surface.js";
import {
  createAppUpload,
  type AppUpload,
  type AppUploadService,
} from "./upload.js";

export interface AppApi {
  readonly http: AppHttpClient;
  readonly auth: AppAuthApi;
  readonly links: AppLinksApi;
  readonly surface: AppSurfaceApi;
  readonly paginate: AppPaginate;
  readonly upload: AppUpload;
}

export interface AppExtensionOptions {
  readonly requestId?: AppRequestIdFactory;
  readonly navigation?: AppNavigationService;
  readonly surfaces?: AppSurfaceBootstrap;
  readonly uploads?: AppUploadService;
}

export function createAppExtension(options: AppExtensionOptions = {}): HolmExtension<AppApi, "app"> {
  const requestId = options.requestId ?? defaultAppRequestId;
  return Object.freeze({
    id: "sdk.app",
    namespace: "app",
    version: Object.freeze({ major: 1, minor: 0 }),
    requiresCapabilities: Object.freeze([HOLM_APP_HTTP_CAPABILITY]),
    setup(context: ExtensionSetupContext) {
      const http = createAppHttpClient(context, requestId);
      const auth = createAppAuthApi(http, options.navigation);
      const upload = createAppUpload(options.uploads);
      const links = createAppLinksApi(http, upload);
      const surface = createAppSurfaceApi(options.surfaces);
      const paginate = createAppPaginate(http);
      return {
        api: Object.freeze({ http, auth, links, surface, paginate, upload }),
      };
    },
  });
}

function defaultAppRequestId(sequence: number): string {
  return `app-${sequence}`;
}
