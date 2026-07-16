import {
  normalizeCallerContext,
  type CallerContext,
  type CallerProvider,
  type CallerScopeContext,
  type PrincipalRef,
} from "../core/index.js";

export type WebCallerValueSource<Value> = Value | (() => Value);

export interface WebCallerOptions {
  readonly principal?: WebCallerValueSource<PrincipalRef>;
  readonly appId?: WebCallerValueSource<string | undefined>;
  readonly scope?: WebCallerValueSource<CallerScopeContext | undefined>;
  readonly origin?: WebCallerValueSource<string | undefined>;
  readonly subscribe?: (listener: () => void) => () => void;
}

const browserSessionPrincipal = Object.freeze({ kind: "browser-session" }) satisfies PrincipalRef;

export function createWebCaller(options: WebCallerOptions = {}): CallerProvider {
  validateStaticOptionalString(options.appId, "Web caller app id");
  validateStaticOptionalString(options.origin, "Web caller origin");

  const provider = {
    current(): CallerContext {
      const appId = resolveOptionalString(options.appId, "Web caller app id");
      const origin = resolveOptionalString(options.origin, "Web caller origin");
      const scope = options.scope === undefined ? undefined : resolveSource(options.scope);
      return normalizeCallerContext({
        surface: "web",
        principal: resolveSource(options.principal ?? browserSessionPrincipal),
        ...(appId === undefined ? {} : { app: { id: appId } }),
        ...(scope === undefined ? {} : { scope }),
        ...(origin === undefined ? {} : { origin }),
      });
    },
    ...(options.subscribe === undefined
      ? {}
      : {
          subscribe(listener: () => void): () => void {
            return options.subscribe?.(listener) ?? (() => undefined);
          },
        }),
  } satisfies CallerProvider;
  return Object.freeze(provider);
}

function resolveSource<Value>(source: WebCallerValueSource<Value>): Value {
  return typeof source === "function" ? (source as () => Value)() : source;
}

function resolveOptionalString(
  source: WebCallerValueSource<string | undefined> | undefined,
  label: string,
): string | undefined {
  if (source === undefined) {
    return undefined;
  }
  const value = resolveSource(source);
  if (value === undefined) {
    return undefined;
  }
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError(`${label} must be non-empty.`);
  }
  return normalized;
}

function validateStaticOptionalString(
  source: WebCallerValueSource<string | undefined> | undefined,
  label: string,
): void {
  if (typeof source === "string") {
    resolveOptionalString(source, label);
  }
}
