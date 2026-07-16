import { createWebApp } from "../../dist/web/index.js";

/**
 * Raw browser/BFBB composition using the tracked generated ESM module tree.
 * Production apps vendor the pinned dist tree rather than importing @main.
 */
export function createBfbbApp(runtime) {
  return createWebApp({
    ...(runtime === undefined ? {} : { runtime }),
  });
}
