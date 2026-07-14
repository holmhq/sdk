import {
  type CapabilityRequirement,
  type CapabilityView,
  createCapabilityRegistry,
  createCapabilityView,
} from "./capabilities.js";
import { createCancellationController, createCancellationScope } from "./cancellation.js";
import type { CallerPartitionListener, CallerProvider } from "./caller.js";
import {
  createExtensionLifecycle,
  type ExtensionLifecycle,
  type ExtensionNamespaces,
  type HolmExtension,
} from "./extensions.js";
import { invokeRuntime } from "./invoke.js";
import {
  createLifecycleController,
  type LifecycleController,
  type LifecycleSnapshot,
} from "./lifecycle.js";
import type { InvocationControl, OperationResponse, RuntimeAdapter } from "./runtime.js";

export interface HolmOptions<Extensions extends readonly HolmExtension[] = readonly HolmExtension[]> {
  readonly runtime: RuntimeAdapter;
  readonly caller: CallerProvider;
  readonly extensions?: Extensions;
  readonly onCallerPartition?: CallerPartitionListener;
}

export interface HolmInvokeOptions {
  readonly capability: CapabilityRequirement;
  readonly operation: string;
  readonly payload: unknown;
  readonly requestId: string;
  readonly reason?: string;
  readonly control?: InvocationControl;
}

export interface Holm<Extensions extends readonly HolmExtension[] = readonly HolmExtension[]> {
  readonly lifecycle: LifecycleSnapshot;
  readonly capabilities: CapabilityView;
  readonly extensions: ExtensionLifecycle<ExtensionNamespaces<Extensions>>;
  start(): Promise<void>;
  invoke(options: HolmInvokeOptions): Promise<OperationResponse>;
  dispose(): Promise<void>;
}

export function createHolm<const Extensions extends readonly HolmExtension[] = readonly []>(
  options: HolmOptions<Extensions>,
): Holm<Extensions> & ExtensionNamespaces<Extensions> {
  return new HolmInstance(options).api();
}

class HolmInstance<const Extensions extends readonly HolmExtension[]> {
  readonly #runtime: RuntimeAdapter;
  readonly #caller: CallerProvider;
  readonly #onCallerPartition: CallerPartitionListener | undefined;
  readonly #capabilities = createCapabilityRegistry([]);
  readonly #extensionLifecycle: ExtensionLifecycle<ExtensionNamespaces<Extensions>>;
  readonly #ownedCancellation = createCancellationController();
  readonly #controller: LifecycleController;
  #runtimeStarted = false;

  constructor(options: HolmOptions<Extensions>) {
    this.#runtime = options.runtime;
    this.#caller = options.caller;
    this.#onCallerPartition = options.onCallerPartition;
    this.#extensionLifecycle = createExtensionLifecycle(options.extensions ?? ([] as unknown as Extensions), {
      capabilities: this.#capabilities,
      validateCapabilities: false,
      invoke: (invokeOptions) => this.#invoke(invokeOptions),
    });
    this.#controller = createLifecycleController({
      start: () => this.#startComponents(),
      dispose: () => this.#disposeComponents(),
    });
  }

  api(): Holm<Extensions> & ExtensionNamespaces<Extensions> {
    const instance = this;
    const core = {
      get lifecycle(): LifecycleSnapshot {
        return instance.#controller.getSnapshot();
      },
      capabilities: createCapabilityView(this.#capabilities),
      extensions: this.#extensionLifecycle,
      start(): Promise<void> {
        return instance.#controller.start();
      },
      invoke(options: HolmInvokeOptions): Promise<OperationResponse> {
        return instance.#invoke(options);
      },
      dispose(): Promise<void> {
        return instance.#controller.dispose();
      },
    } satisfies Holm<Extensions>;

    return Object.freeze(Object.assign(core, this.#extensionLifecycle.namespaces)) as Holm<Extensions> &
      ExtensionNamespaces<Extensions>;
  }

  async #startComponents(): Promise<void> {
    try {
      const offers = await this.#runtime.start();
      this.#runtimeStarted = true;
      this.#capabilities.replaceOffers(offers);
      this.#validateExtensionCapabilities();
      await this.#extensionLifecycle.start();
    } catch (error) {
      await this.#rollbackAfterStartFailure();
      throw error;
    }
  }

  async #rollbackAfterStartFailure(): Promise<void> {
    const errors: unknown[] = [];
    try {
      await this.#extensionLifecycle.dispose();
    } catch (error) {
      errors.push(error);
    }
    if (this.#runtimeStarted) {
      try {
        await this.#runtime.dispose();
        this.#runtimeStarted = false;
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 1) {
      throw new AggregateError(errors, "Holm startup rollback failed.");
    }
  }

  async #disposeComponents(): Promise<void> {
    this.#ownedCancellation.cancel("disposed");
    const errors: unknown[] = [];
    try {
      await this.#extensionLifecycle.dispose();
    } catch (error) {
      errors.push(error);
    }
    if (this.#runtimeStarted) {
      try {
        await this.#runtime.dispose();
        this.#runtimeStarted = false;
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 1) {
      throw new AggregateError(errors, "Holm disposal failed.");
    }
  }

  async #invoke(options: HolmInvokeOptions): Promise<OperationResponse> {
    await this.#controller.start();
    this.#controller.assertReady();
    const scope = createCancellationScope({
      scheduler: this.#runtime.scheduler,
      ...(options.control?.timeoutMs === undefined ? {} : { timeoutMs: options.control.timeoutMs }),
      ...(options.control?.cancellation === undefined ? {} : { external: options.control.cancellation }),
      owner: this.#ownedCancellation.signal,
    });
    try {
      return await scope.race(
        invokeRuntime({
          runtime: this.#runtime,
          capabilities: this.#capabilities,
          caller: this.#caller,
          capability: options.capability,
          operation: options.operation,
          payload: options.payload,
          requestId: options.requestId,
          ...(options.reason === undefined ? {} : { reason: options.reason }),
          control: Object.freeze({ ...options.control, cancellation: scope.signal }),
          ...(this.#onCallerPartition === undefined ? {} : { onCallerPartition: this.#onCallerPartition }),
        }),
      );
    } finally {
      scope.cleanup();
    }
  }

  #validateExtensionCapabilities(): void {
    for (const descriptor of this.#extensionLifecycle.graph.ordered) {
      for (const requirement of descriptor.requiresCapabilities) {
        this.#capabilities.require(requirement);
      }
    }
  }
}
