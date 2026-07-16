import type { CapabilityRequirement } from "../core/capabilities.js";

export const HOLM_APP_HTTP_CAPABILITY = Object.freeze({
  id: "holm.http.app",
  major: 1,
}) satisfies CapabilityRequirement;

export const APP_HTTP_REQUEST_OPERATION = "request";
export const APP_HTTP_INVALIDATE_OPERATION = "invalidate-cache";
