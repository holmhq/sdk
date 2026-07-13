export type CoreEnvironment = "core";

export function createCoreEnvironment(): CoreEnvironment {
  return "core";
}

export {
  assertWireValue,
  canonicalEncodeWireValue,
  copyWireValue,
  createReadonlyBytes,
  isReadonlyBytes,
  isWireValue,
} from "./wire-value.js";
export type { HolmBytesTag, ReadonlyBytes, WireArray, WireObject, WireScalar, WireValue } from "./wire-value.js";

export {
  HolmError,
  isHolmError,
  serializeHolmError,
} from "./errors.js";
export type {
  HolmErrorKind,
  HolmErrorOptions,
  SerializedHolmError,
} from "./errors.js";

export {
  CapabilityVersionError,
  createCapabilityRegistry,
  DuplicateCapabilityOfferError,
  InvalidCapabilityRequirementError,
  negotiateCapability,
  UnsupportedCapabilityError,
} from "./capabilities.js";
export type {
  CapabilityOffer,
  CapabilityOrigin,
  CapabilityRegistry,
  CapabilityRequirement,
  CapabilitySnapshot,
  CapabilitySnapshotListener,
  CapabilityVersion,
  CapabilityVersionErrorOptions,
  DuplicateCapabilityOfferErrorOptions,
  InvalidCapabilityRequirementErrorOptions,
  UnsupportedCapabilityErrorOptions,
} from "./capabilities.js";

export {
  createCallerFingerprint,
  createInvocationContext,
  createStaticCallerProvider,
  normalizeCallerContext,
  resolveCallerContext,
} from "./caller.js";
export type {
  CallerAppContext,
  CallerContext,
  CallerPartition,
  CallerPartitionListener,
  CallerProvider,
  CallerScopeContext,
  InvocationContext,
  PrincipalRef,
} from "./caller.js";

export { invokeRuntime } from "./invoke.js";
export type { InvokeRuntimeOptions } from "./invoke.js";

export {
  CancelledError,
  createCancellationController,
  TimeoutError,
} from "./cancellation.js";
export type {
  CancellationController,
  CancelledErrorOptions,
  CancellationScope,
  CancellationScopeOptions,
  TimeoutErrorOptions,
} from "./cancellation.js";

export {
  createHolm,
} from "./create-holm.js";
export type {
  Holm,
  HolmInvokeOptions,
  HolmOptions,
} from "./create-holm.js";

export {
  createLifecycleController,
  LifecycleError,
} from "./lifecycle.js";
export type {
  LifecycleController,
  LifecycleControllerOptions,
  LifecycleErrorOptions,
  LifecycleSnapshot,
  LifecycleState,
} from "./lifecycle.js";

export {
  createExtensionGraph,
  createExtensionLifecycle,
  ExtensionError,
} from "./extensions.js";
export type {
  ExtensionDescriptor,
  ExtensionErrorOptions,
  ExtensionGraph,
  ExtensionLifecycle,
  ExtensionLifecycleOptions,
  ExtensionNamespaceMap,
  ExtensionNamespaces,
  ExtensionRequirement,
  ExtensionSetupContext,
  ExtensionSetupResult,
  HolmExtension,
  ReadonlyDeep,
} from "./extensions.js";

export { runtimeEnvelopeProtocol } from "./runtime.js";
export type {
  CancellationSignal,
  Clock,
  InvocationControl,
  OperationRequest,
  OperationResponse,
  RuntimeAdapter,
  ScheduledTask,
  Scheduler,
  SurfaceKind,
} from "./runtime.js";
