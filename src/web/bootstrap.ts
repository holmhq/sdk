import type { AppSurfaceBootstrap } from "../app/surface.js";

export interface WebSurfaceRuntimeGlobal {
  readonly __HOLM_SURFACES__?: unknown;
}

export interface WebAppSurfaceBootstrapOptions {
  readonly surfaces?: AppSurfaceBootstrap | undefined;
  readonly runtimeGlobal?: WebSurfaceRuntimeGlobal;
}

const hasOwn = Object.prototype.hasOwnProperty;

export function readWebAppSurfaceBootstrap(
  options: WebAppSurfaceBootstrapOptions = {},
): Readonly<AppSurfaceBootstrap> {
  const source = hasOwn.call(options, "surfaces")
    ? options.surfaces
    : (options.runtimeGlobal ?? defaultRuntimeGlobal()).__HOLM_SURFACES__;
  if (!isRecord(source)) {
    return Object.freeze({});
  }

  const surfaces: AppSurfaceBootstrap = {
    ...surfaceEntry("analytics", source.analytics),
    ...surfaceEntry("settings", source.settings),
    ...surfaceEntry("members", source.members),
    ...surfaceEntry("account", source.account),
    ...surfaceEntry("login", source.login),
    ...surfaceEntry("logout", source.logout),
    ...surfaceEntry("browserEvents", source.browserEvents ?? source.browser_events),
  };
  return Object.freeze(surfaces);
}

function defaultRuntimeGlobal(): WebSurfaceRuntimeGlobal {
  return globalThis as WebSurfaceRuntimeGlobal;
}

function surfaceEntry<Key extends keyof AppSurfaceBootstrap>(
  key: Key,
  value: unknown,
): Readonly<Partial<Pick<AppSurfaceBootstrap, Key>>> {
  if (typeof value !== "string") {
    return Object.freeze({});
  }
  const normalized = value.trim();
  return normalized === ""
    ? Object.freeze({})
    : Object.freeze({ [key]: normalized }) as Readonly<Pick<AppSurfaceBootstrap, Key>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
