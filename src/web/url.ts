import { ProtocolError } from "../core/errors.js";
import type { TransportParams } from "../transports/index.js";

export function resolveWebRequestUrl(
  value: string,
  baseUrl: URL | undefined,
  params: TransportParams = {},
): string {
  const ambientBase = baseUrl ?? readAmbientBaseUrl();
  if (baseUrl !== undefined || isAbsoluteOrAuthorityUrl(value)) {
    if (ambientBase === undefined) {
      throw crossOriginRequest(undefined, absoluteOrigin(value));
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
  return appendRelativeSearchParams(value, params);
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

function isAbsoluteOrAuthorityUrl(value: string): boolean {
  return /^[A-Za-z][A-Za-z\d+.-]*:/.test(value) || value.startsWith("//") || value.startsWith("\\\\");
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
