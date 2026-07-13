import type { OperationResponse } from "../../src/core/index.js";
import { createFakeClock } from "../../src/test/index.js";
import {
  createTransportCache,
  createTransportCacheKey,
  createTransportRequest,
  type TransportCachePartition,
  type TransportCachePolicy,
} from "../../src/transports/index.js";

const fake = createFakeClock();
const partition: TransportCachePartition = {
  source: { id: "runtime-a", surface: "test" },
  callerFingerprint: "caller:v1:type-fixture",
};
const policy: TransportCachePolicy = { ttlMs: 100, swrMs: 25, mode: "default" };
const request = createTransportRequest({ method: "GET", url: "/api/types" });
const cache = createTransportCache({ clock: fake.clock, scheduler: fake.scheduler, maxEntries: 1 });
const key: string = createTransportCacheKey({ partition, request });
const loaded: Promise<OperationResponse> = cache.getOrLoad(
  { partition, request, policy },
  () => ({ requestId: "req-types", payload: { ok: true } }),
);

// @ts-expect-error transport cache modes are closed and per-request.
const invalidPolicy: TransportCachePolicy = { ttlMs: 1, mode: "cache-all" };

void key;
void loaded;
void invalidPolicy;
