import { HolmError } from "./errors.js";

export type LifecycleState = "created" | "starting" | "ready" | "failed" | "disposing" | "disposed";

export interface LifecycleSnapshot {
  readonly revision: number;
  readonly state: LifecycleState;
}

export interface LifecycleErrorOptions {
  readonly code: string;
  readonly message: string;
  readonly state?: LifecycleState;
  readonly details?: unknown;
  readonly cause?: unknown;
}

export interface LifecycleControllerOptions {
  start(): void | Promise<void>;
  dispose(): void | Promise<void>;
}

export interface LifecycleController {
  getSnapshot(): LifecycleSnapshot;
  start(): Promise<void>;
  dispose(): Promise<void>;
  assertReady(): void;
}

export class LifecycleError extends HolmError {
  constructor(options: LifecycleErrorOptions) {
    super({
      kind: "lifecycle",
      code: options.code,
      message: options.message,
      details: lifecycleErrorDetails(options),
      cause: options.cause,
    });
    this.name = "LifecycleError";
  }
}

export function createLifecycleController(options: LifecycleControllerOptions): LifecycleController {
  return new InstanceLifecycleController(options);
}

class InstanceLifecycleController implements LifecycleController {
  readonly #options: LifecycleControllerOptions;
  #snapshot: LifecycleSnapshot = freezeSnapshot(0, "created");
  #startPromise: Promise<void> | undefined;
  #disposePromise: Promise<void> | undefined;
  #failure: unknown;

  constructor(options: LifecycleControllerOptions) {
    this.#options = options;
  }

  getSnapshot(): LifecycleSnapshot {
    return this.#snapshot;
  }

  async start(): Promise<void> {
    if (this.#snapshot.state === "ready") {
      return;
    }
    if (this.#snapshot.state === "starting" && this.#startPromise) {
      return this.#startPromise;
    }
    if (this.#snapshot.state === "failed") {
      throw new LifecycleError({
        code: "lifecycle_start_failed",
        message: "Lifecycle startup previously failed.",
        state: this.#snapshot.state,
        cause: this.#failure,
      });
    }
    if (this.#snapshot.state === "disposing" || this.#snapshot.state === "disposed") {
      throw new LifecycleError({
        code: "lifecycle_disposed",
        message: "Lifecycle has already been disposed.",
        state: this.#snapshot.state,
      });
    }

    this.#transition("starting");
    this.#startPromise = this.#runStart();
    return this.#startPromise;
  }

  async dispose(): Promise<void> {
    if (this.#snapshot.state === "disposed") {
      return;
    }
    if (this.#disposePromise) {
      return this.#disposePromise;
    }
    this.#disposePromise = this.#runDispose();
    return this.#disposePromise;
  }

  assertReady(): void {
    if (this.#snapshot.state === "ready") {
      return;
    }
    throw new LifecycleError({
      code: "lifecycle_not_ready",
      message: "Lifecycle is not ready.",
      state: this.#snapshot.state,
    });
  }

  async #runStart(): Promise<void> {
    try {
      await this.#options.start();
      this.#transition("ready");
    } catch (error) {
      this.#failure = error;
      this.#transition("failed");
      throw new LifecycleError({
        code: "lifecycle_start_failed",
        message: "Lifecycle startup failed.",
        state: "failed",
        cause: error,
      });
    }
  }

  async #runDispose(): Promise<void> {
    const startPromise = this.#snapshot.state === "starting" ? this.#startPromise : undefined;
    if (startPromise) {
      try {
        await startPromise;
      } catch {
        // Disposal is still allowed after a terminal startup failure.
      }
    }
    if (this.#snapshot.state === "disposed") {
      return;
    }
    this.#transition("disposing");
    try {
      await this.#options.dispose();
    } catch (error) {
      throw new LifecycleError({
        code: "lifecycle_dispose_failed",
        message: "Lifecycle disposal failed.",
        state: "disposed",
        cause: error,
      });
    } finally {
      this.#transition("disposed");
    }
  }

  #transition(state: LifecycleState): void {
    this.#snapshot = freezeSnapshot(this.#snapshot.revision + 1, state);
  }
}

function freezeSnapshot(revision: number, state: LifecycleState): LifecycleSnapshot {
  return Object.freeze({ revision, state });
}

function lifecycleErrorDetails(options: LifecycleErrorOptions): unknown {
  if (options.state === undefined && options.details === undefined) {
    return undefined;
  }
  return Object.freeze({
    ...(options.state === undefined ? {} : { state: options.state }),
    ...(options.details === undefined ? {} : { details: options.details }),
  });
}
