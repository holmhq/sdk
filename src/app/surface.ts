export interface AppSurfaceBootstrap {
  readonly analytics?: string;
  readonly settings?: string;
  readonly members?: string;
  readonly account?: string;
  readonly login?: string;
  readonly logout?: string;
  readonly browserEvents?: string;
  readonly browser_events?: string;
}

export interface AppSurfaceRedirectOptions {
  readonly redirect?: string;
}

export interface AppSurfaceApi {
  analyticsUrl(): string | null;
  settingsUrl(): string | null;
  membersUrl(): string | null;
  accountUrl(): string | null;
  loginUrl(options?: string | AppSurfaceRedirectOptions): string | null;
  logoutUrl(options?: string | AppSurfaceRedirectOptions): string | null;
  browserEventsUrl(): string | null;
}

interface NormalizedAppSurfaces {
  readonly analytics: string | null;
  readonly settings: string | null;
  readonly members: string | null;
  readonly account: string | null;
  readonly login: string | null;
  readonly logout: string | null;
  readonly browserEvents: string | null;
}

export function createAppSurfaceApi(surfaces: AppSurfaceBootstrap = {}): AppSurfaceApi {
  const normalized = normalizeAppSurfaces(surfaces);
  return Object.freeze({
    analyticsUrl: () => normalized.analytics,
    settingsUrl: () => normalized.settings,
    membersUrl: () => normalized.members,
    accountUrl: () => normalized.account,
    loginUrl: (options: string | AppSurfaceRedirectOptions = {}) => withRedirect(normalized.login, options),
    logoutUrl: (options: string | AppSurfaceRedirectOptions = {}) => withRedirect(normalized.logout, options),
    browserEventsUrl: () => normalized.browserEvents,
  });
}

export function normalizeAppSurfaces(surfaces: AppSurfaceBootstrap = {}): NormalizedAppSurfaces {
  return Object.freeze({
    analytics: normalizeSurfaceUrl(surfaces.analytics),
    settings: normalizeSurfaceUrl(surfaces.settings),
    members: normalizeSurfaceUrl(surfaces.members),
    account: normalizeSurfaceUrl(surfaces.account),
    login: normalizeSurfaceUrl(surfaces.login),
    logout: normalizeSurfaceUrl(surfaces.logout),
    browserEvents: normalizeSurfaceUrl(surfaces.browserEvents ?? surfaces.browser_events),
  });
}

function withRedirect(
  url: string | null,
  options: string | AppSurfaceRedirectOptions,
): string | null {
  if (url === null) {
    return null;
  }
  const redirect = typeof options === "string" ? options : options.redirect;
  if (redirect === undefined || redirect === "") {
    return url;
  }
  const hashIndex = url.indexOf("#");
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
  const separator = beforeHash.includes("?") ? "&" : "?";
  return `${beforeHash}${separator}redirect=${encodeURIComponent(redirect)}${hash}`;
}

function normalizeSurfaceUrl(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}
