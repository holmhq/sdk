import { createWebApp } from "./vendor/holm-sdk/holm.js";

/**
 * Raw copied BFBB fixture using local vendored SDK artifacts only.
 * The validation script populates ./vendor/holm-sdk from tracked dist output
 * and verifies every byte against dist/manifest.json before this module runs.
 */
export function createVendoredBfbbApp(runtime) {
  return createWebApp({
    ...(runtime === undefined ? {} : { runtime }),
  });
}

if (typeof document !== "undefined") {
  const status = document.querySelector("#status");
  const app = createVendoredBfbbApp();
  void app.app.auth.me()
    .then((member) => {
      if (status) status.textContent = JSON.stringify(member, null, 2);
    })
    .catch((error) => {
      if (status) status.textContent = error instanceof Error ? error.message : "Unknown error";
    });
}
