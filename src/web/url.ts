import { ProtocolError } from "../core/errors.js";
import type { TransportParams } from "../transports/index.js";

export function resolveWebRequestUrl(
  value: string,
  baseUrl: URL | undefined,
  params: TransportParams = {},
): string {
  const ambientBase = baseUrl ?? readAmbientBaseUrl();
  if (ambientBase === undefined) {
    const classified = stripUrlControlAndSpace(value);
    if (isAbsoluteOrAuthorityUrl(classified)) {
      throw crossOriginRequest(undefined, absoluteOrigin(classified));
    }
    return appendRelativeSearchParams(value, params);
  }

  let resolved: URL;
  try {
    resolved = new URL(value, ambientBase);
  } catch (cause) {
    throw new ProtocolError({
      code: "invalid_web_request_url",
      message: "Web app request URL is invalid.",
      cause,
    });
  }
  if (resolved.origin !== ambientBase.origin) {
    throw crossOriginRequest(ambientBase.origin, resolved.origin);
  }
  if (resolved.username !== "" || resolved.password !== "") {
    throw new ProtocolError({
      code: "web_credentialed_request_url",
      message: "Web app request URLs cannot contain embedded credentials.",
    });
  }
  appendSearchParams(resolved.searchParams, params);
  return resolved.href;
}

function readAmbientBaseUrl(): URL | undefined {
  const browser = globalThis as unknown as { readonly location?: { readonly href?: unknown } };
  if (typeof browser.location?.href !== "string" || browser.location.href.trim() === "") {
    return undefined;
  }
  try {
    return new URL(browser.location.href);
  } catch {
    return undefined;
  }
}

function stripUrlControlAndSpace(value: string): string {
  // Mirror the WHATWG URL parser's pre-parse cleanup so no-ambient authority
  // classification sees exactly what Fetch/URL will resolve: remove all ASCII
  // tab/newline/CR, then strip leading and trailing C0 controls or space.
  return value
    .replace(/[\u0009\u000a\u000d]/g, "")
    .replace(/^[\u0000-\u0020]+/, "")
    .replace(/[\u0000-\u0020]+$/, "");
}

function isAbsoluteOrAuthorityUrl(value: string): boolean {
  return /^[A-Za-z][A-Za-z\d+.-]*:/.test(value) || (isAuthoritySeparator(value[0]) && isAuthoritySeparator(value[1]));
}

function isAuthoritySeparator(value: string | undefined): boolean {
  return value === "/" || value === "\\";
}

function absoluteOrigin(value: string): string | undefined {
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function crossOriginRequest(allowedOrigin: string | undefined, targetOrigin: string | undefined): ProtocolError {
  return new ProtocolError({
    code: "web_cross_origin_request",
    message: "Web app requests cannot send app auth proof across origins.",
    details: {
      ...(allowedOrigin === undefined ? {} : { allowedOrigin }),
      ...(targetOrigin === undefined ? {} : { targetOrigin }),
    },
  });
}

function appendRelativeSearchParams(value: string, params: TransportParams): string {
  const query = createSearchParams(params).toString();
  if (query === "") {
    return value;
  }
  const hashIndex = value.indexOf("#");
  const beforeHash = hashIndex === -1 ? value : value.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : value.slice(hashIndex);
  return `${beforeHash}${beforeHash.includes("?") ? "&" : "?"}${query}${hash}`;
}

function createSearchParams(params: TransportParams): URLSearchParams {
  const search = new URLSearchParams();
  appendSearchParams(search, params);
  return search;
}

function appendSearchParams(search: URLSearchParams, params: TransportParams): void {
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value !== null && value !== undefined) {
      search.append(key, String(value));
    }
  }
  search.sort();
}
