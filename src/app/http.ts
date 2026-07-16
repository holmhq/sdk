import type { ExtensionSetupContext } from "../core/extensions.js";
import type { InvocationControl, OperationResponse } from "../core/runtime.js";
import type { WireValue } from "../core/wire-value.js";
import {
  createTransportRequest,
  type TransportHeaders,
  type TransportParams,
  type TransportRequest,
  type TransportRequestInput,
  type TransportResponseMode,
  type TransportSensitivityInput,
} from "../transports/index.js";
import {
  APP_HTTP_INVALIDATE_OPERATION,
  APP_HTTP_REQUEST_OPERATION,
  HOLM_APP_HTTP_CAPABILITY,
} from "./protocol.js";

export interface AppHttpInvocationOptions {
  readonly control?: InvocationControl;
  readonly reason?: string;
}

export interface AppHttpRequestOptions extends AppHttpInvocationOptions {
  readonly params?: TransportParams;
  readonly headers?: TransportHeaders;
  readonly responseMode?: TransportResponseMode;
  readonly timeoutMs?: number;
  readonly sensitive?: TransportSensitivityInput;
}

export interface AppHttpClient {
  request<Result = WireValue>(
    input: TransportRequestInput,
    options?: AppHttpInvocationOptions,
  ): Promise<Result>;
  requestRaw(
    input: TransportRequestInput,
    options?: AppHttpInvocationOptions,
  ): Promise<OperationResponse>;
  get<Result = WireValue>(url: string, options?: AppHttpRequestOptions): Promise<Result>;
  post<Result = WireValue>(url: string, body: unknown, options?: AppHttpRequestOptions): Promise<Result>;
  put<Result = WireValue>(url: string, body: unknown, options?: AppHttpRequestOptions): Promise<Result>;
  patch<Result = WireValue>(url: string, body: unknown, options?: AppHttpRequestOptions): Promise<Result>;
  delete<Result = WireValue>(url: string, options?: AppHttpRequestOptions): Promise<Result>;
  invalidateCache(): Promise<void>;
}

export type AppRequestIdFactory = (sequence: number) => string;

export function createAppHttpClient(
  context: ExtensionSetupContext,
  requestIdFactory: AppRequestIdFactory,
): AppHttpClient {
  let sequence = 0;

  async function requestRaw(
    input: TransportRequestInput,
    options: AppHttpInvocationOptions = {},
  ): Promise<OperationResponse> {
    const request = createTransportRequest(input);
    sequence += 1;
    const requestId = requestIdFactory(sequence);
    return context.invoke({
      capability: HOLM_APP_HTTP_CAPABILITY,
      operation: APP_HTTP_REQUEST_OPERATION,
      payload: request,
      requestId,
      ...(options.reason === undefined ? {} : { reason: options.reason }),
      ...createInvocationControl(request, options.control),
    });
  }

  async function request<Result = WireValue>(
    input: TransportRequestInput,
    options: AppHttpInvocationOptions = {},
  ): Promise<Result> {
    return (await requestRaw(input, options)).payload as Result;
  }

  async function invalidateCache(): Promise<void> {
    sequence += 1;
    await context.invoke({
      capability: HOLM_APP_HTTP_CAPABILITY,
      operation: APP_HTTP_INVALIDATE_OPERATION,
      payload: null,
      requestId: requestIdFactory(sequence),
      reason: "app.http.invalidate-cache",
    });
  }

  return Object.freeze({
    request,
    requestRaw,
    invalidateCache,
    get<Result = WireValue>(url: string, options: AppHttpRequestOptions = {}): Promise<Result> {
      return request<Result>(requestInput("GET", url, options), options);
    },
    post<Result = WireValue>(url: string, body: unknown, options: AppHttpRequestOptions = {}): Promise<Result> {
      return request<Result>(jsonRequestInput("POST", url, body, options), options);
    },
    put<Result = WireValue>(url: string, body: unknown, options: AppHttpRequestOptions = {}): Promise<Result> {
      return request<Result>(jsonRequestInput("PUT", url, body, options), options);
    },
    patch<Result = WireValue>(url: string, body: unknown, options: AppHttpRequestOptions = {}): Promise<Result> {
      return request<Result>(jsonRequestInput("PATCH", url, body, options), options);
    },
    delete<Result = WireValue>(url: string, options: AppHttpRequestOptions = {}): Promise<Result> {
      return request<Result>(requestInput("DELETE", url, options), options);
    },
  });
}

function requestInput(
  method: string,
  url: string,
  options: AppHttpRequestOptions,
): TransportRequestInput {
  return {
    method,
    url,
    ...(options.params === undefined ? {} : { params: options.params }),
    ...(options.headers === undefined ? {} : { headers: options.headers }),
    ...(options.responseMode === undefined ? {} : { responseMode: options.responseMode }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    ...(options.sensitive === undefined ? {} : { sensitive: options.sensitive }),
  };
}

function jsonRequestInput(
  method: string,
  url: string,
  body: unknown,
  options: AppHttpRequestOptions,
): TransportRequestInput {
  return {
    ...requestInput(method, url, options),
    body: { mode: "json", value: body },
  };
}

function createInvocationControl(
  request: TransportRequest,
  control: InvocationControl | undefined,
): { readonly control?: InvocationControl } {
  if (request.timeoutMs === undefined || control?.timeoutMs !== undefined) {
    return control === undefined ? {} : { control };
  }
  return {
    control: Object.freeze({
      ...(control ?? {}),
      timeoutMs: request.timeoutMs,
    }),
  };
}
