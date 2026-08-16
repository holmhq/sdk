import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  HOLM_ADMIN_HTTP_CAPABILITY,
  createAdminExtension,
  type AdminDBRetentionReport,
  type AdminDBRetentionStatus,
} from "../../../src/admin/index.js";
import {
  createHolm,
  createStaticCallerProvider,
  type WireValue,
} from "../../../src/core/index.js";
import { createFakeClock, createInMemoryRuntimeAdapter } from "../../../src/test/index.js";

const statusFixture: AdminDBRetentionStatus = {
  automatic: true,
  last_status: "ok",
  backup_marker: "verified:fixture",
  families: [{
    family: "analytics_raw",
    last_status: "ok",
    last_run_ms: 1_700_000_000_000,
    updated_at: 1_700_000_000_100,
  }],
};

const reportFixture: AdminDBRetentionReport = {
  dry_run: true,
  applied: false,
  rows: 12,
  bytes: 4096,
  deleted: 0,
  rewritten: 2,
  has_more: false,
  families: [{
    family: "upload_orphans",
    rows: 1,
    bytes: 512,
    cutoff_ms: 1_699_000_000_000,
    oldest_age_ms: 86_400_000,
    bytes_source: "declared_size",
    candidates: [{
      upload_id: "upl_fixture",
      reason: "expired",
      size_bytes: 512,
      age_ms: 86_400_000,
    }],
  }],
};

test("admin retention methods expose typed status and a bodyless dry-run request", async () => {
  const fake = createFakeClock(40);
  const runtime = createInMemoryRuntimeAdapter({
    clock: fake.clock,
    scheduler: fake.scheduler,
    offers: [{
      id: HOLM_ADMIN_HTTP_CAPABILITY.id,
      origin: "runtime",
      version: { major: 1, minor: 0 },
    }],
  });
  runtime.setHandler("holm.http.admin:request", (request) => {
    const input = request.payload as { readonly url?: string };
    return {
      requestId: request.requestId,
      payload: (input.url?.endsWith("/status") ? statusFixture : reportFixture) as unknown as WireValue,
    };
  });
  const holm = createHolm({
    runtime,
    caller: createStaticCallerProvider({ surface: "cli", principal: { kind: "operator" } }),
    extensions: [createAdminExtension()] as const,
  });

  const status: AdminDBRetentionStatus = await holm.admin.system.dbRetentionStatus();
  const report: AdminDBRetentionReport = await holm.admin.system.dbRetentionRun({ timeoutMs: 25 });

  assert.deepEqual(status, statusFixture);
  assert.deepEqual(report, reportFixture);
  assert.equal(report.dry_run, true);
  assert.equal(report.applied, false);
  assert.deepEqual(
    runtime.requests.map((request) => {
      const input = request.payload as {
        readonly method: string;
        readonly url: string;
        readonly body?: unknown;
      };
      return {
        method: input.method,
        url: input.url,
        hasBody: Object.hasOwn(input, "body"),
      };
    }),
    [
      { method: "GET", url: "/api/system/db/retention/status", hasBody: false },
      { method: "POST", url: "/api/system/db/retention/run", hasBody: false },
    ],
  );

  await assert.rejects(
    async () => holm.admin.invoke("system.dbRetentionRun", { body: { apply: true } } as never),
    /does not accept a request body.*dry-run only/i,
  );
  await assert.rejects(
    async () => holm.admin.invoke("system.dbRetentionRun", { body: { force: true } } as never),
    /does not accept a request body.*dry-run only/i,
  );
  assert.equal(runtime.requests.length, 2, "unsafe retention intent must fail before runtime invocation");
  await holm.dispose();
});
