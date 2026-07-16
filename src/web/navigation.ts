import type { AppNavigationService } from "../app/auth.js";

export interface WebLocationLike {
  href: string;
  assign?(href: string): void;
}

export function createWebNavigation(
  location: WebLocationLike | null | undefined = defaultWebLocation(),
): AppNavigationService {
  if (location === null || location === undefined) {
    throw new TypeError("Web navigation requires a location service.");
  }
  return Object.freeze({
    assign(href: string): void {
      if (typeof location.assign === "function") {
        location.assign(href);
      } else {
        location.href = href;
      }
    },
  });
}

function defaultWebLocation(): WebLocationLike | undefined {
  const webGlobal = globalThis as unknown as { readonly location?: WebLocationLike };
  if (typeof webGlobal.location !== "object" || webGlobal.location === null) {
    return undefined;
  }
  return webGlobal.location;
}
