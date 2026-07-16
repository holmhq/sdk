import { createStaticCallerProvider } from "../core/caller.js";
import { HolmError } from "../core/errors.js";
export class UnsupportedNodeRuntimeServiceError extends HolmError {
    constructor(options) {
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
export function createNodeTokenAuth(options) {
    const scheme = normalizeTokenPart(options.scheme ?? "Bearer", "scheme");
    let token = resolveToken(options.token);
    let epoch = 0;
    const operatorPartition = options.operatorId === undefined ? "" : `:operator:${normalizeTokenPart(options.operatorId, "operator id")}`;
    const fixedPartition = options.cachePartition === undefined ? undefined : normalizeTokenPart(options.cachePartition, "cache partition");
    return Object.freeze({
        current() {
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
export function createNodeOperatorCaller(options = {}) {
    return createStaticCallerProvider({
        surface: "cli",
        principal: Object.freeze({
            kind: "operator",
            ...(options.operatorId === undefined ? {} : { id: normalizeTokenPart(options.operatorId, "operator id") }),
        }),
        ...(options.app === undefined ? {} : { app: options.app }),
        ...(options.scope === undefined ? {} : { scope: options.scope }),
        ...(options.origin === undefined ? {} : { origin: options.origin }),
    });
}
export function createUnsupportedClock(adapter) {
    return Object.freeze({
        now() {
            throw new UnsupportedNodeRuntimeServiceError({ adapter, service: "clock" });
        },
    });
}
export function createUnsupportedScheduler(adapter) {
    return Object.freeze({
        schedule() {
            throw new UnsupportedNodeRuntimeServiceError({ adapter, service: "scheduler" });
        },
    });
}
export function createNodeRuntimeServices(options) {
    return Object.freeze({
        environment: options.environment ?? unsupportedEnvironment(options.adapter),
        secureStore: options.secureStore ?? unsupportedSecureStore(options.adapter),
        ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
    });
}
function unsupportedEnvironment(adapter) {
    return Object.freeze({
        get() {
            throw new UnsupportedNodeRuntimeServiceError({ adapter, service: "environment" });
        },
    });
}
function unsupportedSecureStore(adapter) {
    return Object.freeze({
        get() {
            throw new UnsupportedNodeRuntimeServiceError({ adapter, service: "secureStore" });
        },
        set() {
            throw new UnsupportedNodeRuntimeServiceError({ adapter, service: "secureStore" });
        },
        delete() {
            throw new UnsupportedNodeRuntimeServiceError({ adapter, service: "secureStore" });
        },
    });
}
function resolveToken(source) {
    return normalizeTokenPart(typeof source === "function" ? source() : source, "token");
}
function normalizeTokenPart(value, label) {
    const normalized = value.trim();
    if (normalized === "") {
        throw new TypeError(`Node token auth ${label} must be non-empty.`);
    }
    return normalized;
}
function formatService(service) {
    switch (service) {
        case "secureStore":
            return "secure-store";
        default:
            return service;
    }
}
//# sourceMappingURL=services.js.map