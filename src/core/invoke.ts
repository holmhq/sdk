import {
  CapabilityVersionError,
  type CapabilityRequirement,
  type CapabilityView,
  UnsupportedCapabilityError,
} from "./capabilities.js";
import {
  createCallerFingerprint,
  createInvocationContext,
  resolveCallerContext,
  type CallerPartitionListener,
  type CallerProvider,
} from "./caller.js";
import {
  createInvocationResponseTracker,
  normalizeInvocationRequestId,
  type InvocationResponseTracker,
} from "./correlation.js";
import { ProtocolError } from "./errors.js";
import type { InvocationControl, OperationRequest, OperationResponse, RuntimeAdapter } from "./runtime.js";
import { copyWireValue } from "./wire-value.js";

export { createInvocationResponseTracker } from "./correlation.js";
export type {
  InvocationResponseHandle,
  InvocationResponseOutcome,
  InvocationResponseTracker,
  InvocationResponseTrackerOptions,
} from "./correlation.js";

export interface InvokeRuntimeOptions {
  readonly runtime: RuntimeAdapter;
  readonly capabilities: CapabilityView;
  readonly caller: CallerProvider;
  readonly capability: CapabilityRequirement;
  readonly operation: string;
  readonly payload: unknown;
  readonly requestId: string;
  readonly reason?: string;
  readonly control?: InvocationControl;
  readonly onCallerPartition?: CallerPartitionListener;
}

export async function invokeRuntime(
  options: InvokeRuntimeOptions,
  responses: InvocationResponseTracker = createInvocationResponseTracker({ clock: options.runtime.clock }),
): Promise<OperationResponse> {
  const capability = requireRuntimeCapability(options);
  const requestId = normalizeInvocationRequestId(options.requestId);
  const caller = await resolveCallerContext(options.caller);
  const callerFingerprint = createCallerFingerprint(caller);
  const request = Object.freeze({
    requestId,
    capability,
    operation: options.operation,
    caller: createInvocationContext(caller, requestId, options.runtime.clock.now(), options.reason),
    callerFingerprint,
    payload: copyWireValue(options.payload),
  }) satisfies OperationRequest;
  const control = Object.freeze({ ...(options.control ?? {}) });

  options.onCallerPartition?.(
    Object.freeze({
      runtime: Object.freeze({ id: options.runtime.id, surface: options.runtime.surface }),
      capability,
      operation: options.operation,
      caller,
      fingerprint: callerFingerprint,
    }),
  );

  const responseHandle = responses.begin(request.requestId);
  const unsubscribe = control.cancellation?.onCancel(() => responseHandle.cancel());
  try {
    const response = await options.runtime.invoke(request, control);
    const outcome = responseHandle.accept(response);
    if (outcome !== "accepted") {
      throw new ProtocolError({
        code: outcome === "duplicate" ? "runtime_response_duplicate" : "runtime_response_late",
        message: `${outcome === "duplicate" ? "Duplicate" : "Late"} runtime response was ignored.`,
      });
    }
    return copyOperationResponse(response);
  } catch (error) {
    responseHandle.fail();
    throw error;
  } finally {
    unsubscribe?.();
  }
}

function requireRuntimeCapability(options: InvokeRuntimeOptions): CapabilityRequirement {
  try {
    const offer = options.capabilities.require(options.capability);
    return Object.freeze({
      id: offer.id,
      major: options.capability.major,
      ...(options.capability.minMinor === undefined ? {} : { minMinor: options.capability.minMinor }),
    });
  } catch (error) {
    if (error instanceof UnsupportedCapabilityError) {
      throw new UnsupportedCapabilityError({
        id: options.capability.id,
        requirement: options.capability,
        offered: options.capabilities.getSnapshot().offers,
        adapter: options.runtime.id,
        surface: options.runtime.surface,
      });
    }
    if (error instanceof CapabilityVersionError) {
      throw new CapabilityVersionError({
        id: options.capability.id,
        requirement: options.capability,
        offered: options.capabilities.getSnapshot().offers.filter((offer) => offer.id === options.capability.id),
        adapter: options.runtime.id,
        surface: options.runtime.surface,
      });
    }
    throw error;
  }
}

function copyOperationResponse(response: OperationResponse): OperationResponse {
  return Object.freeze({
    requestId: response.requestId,
    payload: copyWireValue(response.payload),
    ...(response.metadata === undefined ? {} : { metadata: copyWireValue(response.metadata) }),
  });
}
