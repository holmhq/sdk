import type { ExtensionSetupContext } from "../core/extensions.js";
import type { InvocationControl, OperationResponse } from "../core/runtime.js";
import type { WireValue } from "../core/wire-value.js";
import {
  createTransportRequest,
  type TransportRequest,
  type TransportRequestInput,
} from "../transports/index.js";
import {
  ADMIN_HTTP_INVALIDATE_OPERATION,
  ADMIN_HTTP_PREFLIGHT_OPERATION,
  ADMIN_HTTP_REQUEST_OPERATION,
  HOLM_ADMIN_HTTP_CAPABILITY,
} from "./protocol.js";

export interface AdminHttpInvocationOptions {
  readonly control?: InvocationControl;
  readonly reason?: string;
}

export interface AdminHttpClient {
  request<Result = WireValue>(
    input: TransportRequestInput,
    options?: AdminHttpInvocationOptions,
  ): Promise<Result>;
  requestRaw(
    input: TransportRequestInput,
    options?: AdminHttpInvocationOptions,
  ): Promise<OperationResponse>;
  preflight(reason?: string): Promise<void>;
  invalidateCache(): Promise<void>;
}

export type AdminRequestIdFactory = (sequence: number) => string;

export function createAdminHttpClient(
  context: ExtensionSetupContext,
  requestIdFactory: AdminRequestIdFactory,
): AdminHttpClient {
  let sequence = 0;

  async function requestRaw(
    input: TransportRequestInput,
    options: AdminHttpInvocationOptions = {},
  ): Promise<OperationResponse> {
    const request = createTransportRequest(input);
    sequence += 1;
    return context.invoke({
      capability: HOLM_ADMIN_HTTP_CAPABILITY,
      operation: ADMIN_HTTP_REQUEST_OPERATION,
      payload: request,
      requestId: requestIdFactory(sequence),
      ...(options.reason === undefined ? {} : { reason: options.reason }),
      ...createInvocationControl(request, options.control),
    });
  }

  async function request<Result = WireValue>(
    input: TransportRequestInput,
    options: AdminHttpInvocationOptions = {},
  ): Promise<Result> {
    return (await requestRaw(input, options)).payload as Result;
  }

  async function preflight(reason = "admin.preflight"): Promise<void> {
    sequence += 1;
    await context.invoke({
      capability: HOLM_ADMIN_HTTP_CAPABILITY,
      operation: ADMIN_HTTP_PREFLIGHT_OPERATION,
      payload: null,
      requestId: requestIdFactory(sequence),
      reason,
    });
  }

  async function invalidateCache(): Promise<void> {
    sequence += 1;
    await context.invoke({
      capability: HOLM_ADMIN_HTTP_CAPABILITY,
      operation: ADMIN_HTTP_INVALIDATE_OPERATION,
      payload: null,
      requestId: requestIdFactory(sequence),
      reason: "admin.http.invalidate-cache",
    });
  }

  return Object.freeze({ request, requestRaw, preflight, invalidateCache });
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
