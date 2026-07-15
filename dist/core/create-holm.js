import { createCapabilityRuntimeUpdater, createCapabilityView, } from "./capabilities.js";
import { createCancellationController, createCancellationScope } from "./cancellation.js";
import { createExtensionLifecycle, } from "./extensions.js";
import { createInvocationResponseTracker, invokeRuntime, } from "./invoke.js";
import { createLifecycleController, } from "./lifecycle.js";
export function createHolm(options) {
    return new HolmInstance(options).api();
}
class HolmInstance {
    #runtime;
    #caller;
    #onCallerPartition;
    #capabilities = createCapabilityRuntimeUpdater([]);
    #extensionLifecycle;
    #ownedCancellation = createCancellationController();
    #responses;
    #controller;
    #runtimeStarted = false;
    constructor(options) {
        this.#runtime = options.runtime;
        this.#caller = options.caller;
        this.#onCallerPartition = options.onCallerPartition;
        this.#responses = createInvocationResponseTracker({
            clock: options.runtime.clock,
            ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
        });
        this.#extensionLifecycle = createExtensionLifecycle(options.extensions ?? [], {
            capabilities: this.#capabilities,
            validateCapabilities: false,
            invoke: (invokeOptions) => this.#invoke(invokeOptions),
            registerExtensionOffer: (offer) => this.#capabilities.registerExtensionOffer(offer),
        });
        this.#controller = createLifecycleController({
            start: () => this.#startComponents(),
            dispose: () => this.#disposeComponents(),
        });
    }
    api() {
        const instance = this;
        const core = {
            get lifecycle() {
                return instance.#controller.getSnapshot();
            },
            capabilities: createCapabilityView(this.#capabilities),
            extensions: this.#extensionLifecycle,
            start() {
                return instance.#controller.start();
            },
            invoke(options) {
                return instance.#invoke(options);
            },
            dispose() {
                return instance.#controller.dispose();
            },
        };
        return Object.freeze(Object.assign(core, this.#extensionLifecycle.namespaces));
    }
    async #startComponents() {
        try {
            const offers = await this.#runtime.start();
            this.#runtimeStarted = true;
            this.#capabilities.replaceOffers(offers);
            this.#validateExtensionCapabilities();
            await this.#extensionLifecycle.start();
        }
        catch (error) {
            await this.#rollbackAfterStartFailure();
            throw error;
        }
    }
    async #rollbackAfterStartFailure() {
        const errors = [];
        try {
            await this.#extensionLifecycle.dispose();
        }
        catch (error) {
            errors.push(error);
        }
        if (this.#runtimeStarted) {
            try {
                await this.#runtime.dispose();
                this.#runtimeStarted = false;
            }
            catch (error) {
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
    async #disposeComponents() {
        this.#ownedCancellation.cancel("disposed");
        const errors = [];
        try {
            await this.#extensionLifecycle.dispose();
        }
        catch (error) {
            errors.push(error);
        }
        if (this.#runtimeStarted) {
            try {
                await this.#runtime.dispose();
                this.#runtimeStarted = false;
            }
            catch (error) {
                errors.push(error);
            }
        }
        this.#responses.clear();
        if (errors.length === 1) {
            throw errors[0];
        }
        if (errors.length > 1) {
            throw new AggregateError(errors, "Holm disposal failed.");
        }
    }
    async #invoke(options) {
        await this.#controller.start();
        this.#controller.assertReady();
        const scope = createCancellationScope({
            scheduler: this.#runtime.scheduler,
            ...(options.control?.timeoutMs === undefined ? {} : { timeoutMs: options.control.timeoutMs }),
            ...(options.control?.cancellation === undefined ? {} : { external: options.control.cancellation }),
            owner: this.#ownedCancellation.signal,
        });
        try {
            return await scope.race(invokeRuntime({
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
            }, this.#responses));
        }
        finally {
            scope.cleanup();
        }
    }
    #validateExtensionCapabilities() {
        for (const descriptor of this.#extensionLifecycle.graph.ordered) {
            for (const requirement of descriptor.requiresCapabilities) {
                this.#capabilities.require(requirement);
            }
        }
    }
}
//# sourceMappingURL=create-holm.js.map