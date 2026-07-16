import type { WireValue } from "../core/wire-value.js";
import type { AppHttpClient } from "./http.js";

export interface AppNavigationService {
  assign(href: string): void;
}

export interface AppAuthNavigationOptions {
  readonly redirect?: string;
}

export interface AppQrScannerOptions extends AppAuthNavigationOptions {
  readonly appId?: string;
}

export interface StartAnonymousOptions {
  readonly appId?: string;
}

export interface RequestMagicLinkOptions extends AppAuthNavigationOptions {
  readonly appId?: string;
}

export type CompleteMagicLinkInput =
  | string
  | { readonly token: string }
  | { readonly email: string; readonly key: string };

export interface AppAuthApi {
  me<Result = WireValue>(): Promise<Result>;
  loginHref(options?: AppAuthNavigationOptions): string;
  login(options?: AppAuthNavigationOptions): string;
  qrScannerHref(options?: AppQrScannerOptions): string;
  scanQRCode(options?: AppQrScannerOptions): string;
  startAnonymous<Result = WireValue>(options?: StartAnonymousOptions): Promise<Result>;
  promoteAnonymous<Result = WireValue>(options?: StartAnonymousOptions): Promise<Result>;
  requestMagicLink<Result = WireValue>(email: string, options?: RequestMagicLinkOptions): Promise<Result>;
  completeMagicLink<Result = WireValue>(input: CompleteMagicLinkInput): Promise<Result>;
  logout<Result = WireValue>(): Promise<Result>;
}

export function createAppAuthApi(
  http: AppHttpClient,
  navigation: AppNavigationService | undefined,
): AppAuthApi {
  function loginHref(options: AppAuthNavigationOptions = {}): string {
    return appendQuery("/auth/login", [["redirect", options.redirect]]);
  }

  function qrScannerHref(options: AppQrScannerOptions = {}): string {
    return appendQuery("/auth/qr/scanner", [
      ["app", options.appId],
      ["redirect", options.redirect],
    ]);
  }

  return Object.freeze({
    me<Result = WireValue>(): Promise<Result> {
      return http.get<Result>("/api/me", { reason: "app.auth.me" });
    },
    loginHref,
    login(options: AppAuthNavigationOptions = {}): string {
      return navigate(loginHref(options), navigation);
    },
    qrScannerHref,
    scanQRCode(options: AppQrScannerOptions = {}): string {
      return navigate(qrScannerHref(options), navigation);
    },
    startAnonymous<Result = WireValue>(options: StartAnonymousOptions = {}): Promise<Result> {
      return http.post<Result>(
        "/auth/anonymous/start",
        appBody(options.appId),
        { reason: "app.auth.start-anonymous" },
      );
    },
    promoteAnonymous<Result = WireValue>(options: StartAnonymousOptions = {}): Promise<Result> {
      return http.post<Result>(
        "/auth/anonymous/promote",
        appBody(options.appId),
        { reason: "app.auth.promote-anonymous" },
      );
    },
    requestMagicLink<Result = WireValue>(
      email: string,
      options: RequestMagicLinkOptions = {},
    ): Promise<Result> {
      return http.post<Result>(
        "/auth/magic/request",
        {
          email: requireNonEmpty(email, "Magic-link email"),
          ...(options.redirect === undefined ? {} : { redirect: options.redirect }),
          ...(options.appId === undefined ? {} : { app: options.appId }),
        },
        { reason: "app.auth.request-magic-link" },
      );
    },
    completeMagicLink<Result = WireValue>(input: CompleteMagicLinkInput): Promise<Result> {
      return http.post<Result>(
        "/auth/magic/complete",
        normalizeMagicLinkInput(input),
        { reason: "app.auth.complete-magic-link" },
      );
    },
    logout<Result = WireValue>(): Promise<Result> {
      return http.post<Result>("/auth/logout", {}, { reason: "app.auth.logout" });
    },
  });
}

function navigate(href: string, navigation: AppNavigationService | undefined): string {
  navigation?.assign(href);
  return href;
}

function appendQuery(
  path: string,
  entries: readonly (readonly [string, string | undefined])[],
): string {
  const query = entries
    .filter((entry): entry is readonly [string, string] => entry[1] !== undefined && entry[1] !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return query === "" ? path : `${path}?${query}`;
}

function appBody(appId: string | undefined): Readonly<Record<string, string>> {
  return appId === undefined ? Object.freeze({}) : Object.freeze({ app: appId });
}

function normalizeMagicLinkInput(input: CompleteMagicLinkInput): Readonly<Record<string, string>> {
  if (typeof input === "string") {
    return Object.freeze({ token: requireNonEmpty(input, "Magic-link token") });
  }
  if ("token" in input) {
    return Object.freeze({ token: requireNonEmpty(input.token, "Magic-link token") });
  }
  return Object.freeze({
    email: requireNonEmpty(input.email, "Magic-link email"),
    key: requireNonEmpty(input.key, "Magic-link key"),
  });
}

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TypeError(`${label} must be non-empty.`);
  }
  return normalized;
}
