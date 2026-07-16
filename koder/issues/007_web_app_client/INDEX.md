---
status: open
priority: P1
created: 2026-07-13
updated: 2026-07-16
tags: web, app-client, auth, browser, migration
parent: 001
depends_on: [005, 006]
source_paths:
  - packages/holm-sdk/app.js
  - packages/holm-sdk/app.audit.js
  - packages/holm-sdk/runtime.js
type: feature
issue_kind: slice
context: Make ordinary browser/BFBB app development the first complete consumer of the new core.
---

# Issue 007: Web and App Client Migration

## Problem

Browser apps need same-origin custom API transport, member auth, uploads, links,
platform surfaces, and reactive resources through one discoverable client. The
existing `createAppClient()` behavior is useful but should be migrated
selectively into the new runtime/resource contracts rather than copied blindly.

## Scope

- web runtime adapter using standards-based fetch, URL, headers, blobs, forms,
  and explicit optional browser navigation;
- app/member caller resolution through cookies or explicit tokens;
- custom app `/api/*` transport through the shared cache/resource layer;
- current auth helpers: `me`, login/logout navigation/URLs, anonymous identity,
  magic links, and QR scanner helpers where supported;
- blob-link methods, uploads, pagination, and injected app surface URLs;
- browser lifecycle/visibility hooks without contaminating core;
- BFBB source import and built-tooling import examples;
- route audit mapping from current app client.

## Acceptance Criteria

- [x] Browser tests run against a deterministic Holm-shaped HTTP fixture and at
      least one real/local Holm smoke when available.
- [x] Custom app routes receive the same cache/dedup/error behavior as wrapped
      platform routes.
- [x] Cookie and explicit-token auth do not leak across client instances.
- [x] Redirect/navigation helpers are optional browser services, not core
      `window` references.
- [x] Upload progress has a standards path and a clearly isolated fallback.
- [x] `__HOLM_SURFACES__` compatibility is mapped behind an adapter/bootstrap
      boundary.
- [x] Every current `app.audit.js` route is classified adopted, redesigned,
      deferred, or intentionally unsupported.
- [x] Raw BFBB and Vite-built examples both pass.
- [x] No npm publication is needed; generated ESM can be imported locally.

## Implementation Evidence

- Route classification and current Holm authority pin:
  `koder/evidence/003_issue007_app_routes/` at Holm
  `8deb00b7aa1cc07f39665fde6e81c1b33d3620c4` (`v0.185.0`).
- Runtime-neutral app namespace: `src/app/`; browser adapters and convenience
  composition: `src/web/`.
- Deterministic source tests: `test/source/app/` and `test/source/web/`;
  declaration and generated ESM consumers cover both `/app` and `/web`.
- Raw BFBB and Vite production builds pass via `npm run test:examples`.
- Full local `npm run ci` passed with reproducible tracked `dist/`, measured
  coverage, license allowlist, and per-module size budgets. Independent review
  and final read-only Holm-authority acceptance remain the issue close gates.

## Non-Goals

- Framework hooks (Issue 013).
- Admin/operator namespaces.
- Changing Holm auth routes from this repository.
