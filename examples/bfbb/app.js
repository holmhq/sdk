import { createWebApp } from "../../dist/holm.js";

/**
 * Raw browser/BFBB composition using the tracked complete browser/BFBB ESM artifact.
 * Production apps vendor the pinned dist artifacts rather than importing @main.
 */
export function createBfbbApp(runtime) {
  return createWebApp({
    ...(runtime === undefined ? {} : { runtime }),
  });
}
