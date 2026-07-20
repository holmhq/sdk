import type { CapabilityRequirement } from "../core/capabilities.js";

export const HOLM_ADMIN_HTTP_CAPABILITY = Object.freeze({
  id: "holm.http.admin",
  major: 1,
}) satisfies CapabilityRequirement;

export const ADMIN_HTTP_REQUEST_OPERATION = "request";
export const ADMIN_HTTP_INVALIDATE_OPERATION = "invalidate-cache";
export const ADMIN_HTTP_PREFLIGHT_OPERATION = "preflight";
