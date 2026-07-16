import type { CallerProvider, CallerAppContext, CallerScopeContext } from "../core/caller.js";
import { createStaticCallerProvider } from "../core/caller.js";
import type { HolmDiagnosticsSink } from "../core/diagnostics.js";
import { HolmError } from "../core/errors.js";
import type { Clock, Scheduler } from "../core/runtime.js";
import type { TransportAuthProvider, BearerTransportAuthProof } from "../transports/index.js";

export interface NodeRuntimeServiceErrorOptions {
  readonly adapter: string;
  readonly service: NodeRuntimeServiceName;
  readonly message?: string;
}

export type NodeRuntimeServiceName = "fetch" | "auth" | "clock" | "scheduler" | "environment" | "secureStore";

export class UnsupportedNodeRuntimeServiceError extends HolmError {
  constructor(options: NodeRuntimeServiceErrorOptions) {
    super({
      kind: "capability",
      code: "unsupported_runtime_service",
      message: options.message ?? `The Node/CLI runtime requires an injected ${formatService(options.service)} service.`,
      details: Object.freeze({
        adapter: options.adapter,
        surface: "cli",
        service: options.service,
      }),
    });
    this.name = "UnsupportedNodeRuntimeServiceError";
  }
}

export interface NodeEnvironmentService {
  get(name: string): string | undefined | Promise<string | undefined>;
}

export interface NodeSecureStoreService {
  get(key: string): string | undefined | Promise<string | undefined>;
  set?(key: string, value: string): void | Promise<void>;
  delete?(key: string): void | Promise<void>;
}

export interface NodeRuntimeServices {
  readonly environment: NodeEnvironmentService;
  readonly secureStore: NodeSecureStoreService;
  readonly diagnostics?: HolmDiagnosticsSink;
}

export interface NodeOperatorCallerOptions {
  readonly operatorId?: string;
  readonly app?: CallerAppContext;
  readonly scope?: CallerScopeContext;
  readonly origin?: string;
}

export interface NodeTokenAuthOptions {
  readonly token: string | (() => string);
  readonly scheme?: string;
  readonly cachePartition?: string;
  readonly operatorId?: string;
}

export function createNodeTokenAuth(options: NodeTokenAuthOptions): TransportAuthProvider {
  const scheme = normalizeTokenPart(options.scheme ?? "Bearer", "scheme");
  let token = resolveToken(options.token);
  let epoch = 0;
  const operatorPartition = options.operatorId === undefined ? "" : `:operator:${normalizeTokenPart(options.operatorId, "operator id")}`;
  const fixedPartition = options.cachePartition === undefined ? undefined : normalizeTokenPart(options.cachePartition, "cache partition");
  return Object.freeze({
    current(): BearerTransportAuthProof {
      const nextToken = resolveToken(options.token);
      if (nextToken !== token) {
        token = nextToken;
        epoch += 1;
      }
      return Object.freeze({
        kind: "bearer",
        scheme,
        token,
        cachePartition: fixedPartition ?? `node-token${operatorPartition}:${epoch}`,
      });
    },
  });
}

export function createNodeOperatorCaller(options: NodeOperatorCallerOptions = {}): CallerProvider {
  return createStaticCallerProvider({
    surface: "cli",
    principal: Object.freeze({
      kind: "operator" as const,
      ...(options.operatorId === undefined ? {} : { id: normalizeTokenPart(options.operatorId, "operator id") }),
    }),
    ...(options.app === undefined ? {} : { app: options.app }),
    ...(options.scope === undefined ? {} : { scope: options.scope }),
    ...(options.origin === undefined ? {} : { origin: options.origin }),
  });
}

export function createUnsupportedClock(adapter: string): Clock {
  return Object.freeze({
    now(): number {
      throw new UnsupportedNodeRuntimeServiceError({ adapter, service: "clock" });
    },
  });
}

export function createUnsupportedScheduler(adapter: string): Scheduler {
  return Object.freeze({
    schedule(): { cancel(): void } {
      throw new UnsupportedNodeRuntimeServiceError({ adapter, service: "scheduler" });
    },
  });
}

export function createNodeRuntimeServices(options: {
  readonly adapter: string;
  readonly environment?: NodeEnvironmentService;
  readonly secureStore?: NodeSecureStoreService;
  readonly diagnostics?: HolmDiagnosticsSink;
}): NodeRuntimeServices {
  return Object.freeze({
    environment: options.environment ?? unsupportedEnvironment(options.adapter),
    secureStore: options.secureStore ?? unsupportedSecureStore(options.adapter),
    ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
  });
}

function unsupportedEnvironment(adapter: string): NodeEnvironmentService {
  return Object.freeze({
    get(): never {
      throw new UnsupportedNodeRuntimeServiceError({ adapter, service: "environment" });
    },
  });
}

function unsupportedSecureStore(adapter: string): NodeSecureStoreService {
  return Object.freeze({
    get(): never {
      throw new UnsupportedNodeRuntimeServiceError({ adapter, service: "secureStore" });
    },
    set(): never {
      throw new UnsupportedNodeRuntimeServiceError({ adapter, service: "secureStore" });
    },
    delete(): never {
      throw new UnsupportedNodeRuntimeServiceError({ adapter, service: "secureStore" });
    },
  });
}

function resolveToken(source: string | (() => string)): string {
  return normalizeTokenPart(typeof source === "function" ? source() : source, "token");
}

function normalizeTokenPart(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError(`Node token auth ${label} must be non-empty.`);
  }
  return normalized;
}

function formatService(service: NodeRuntimeServiceName): string {
  switch (service) {
    case "secureStore":
      return "secure-store";
    default:
      return service;
  }
}
