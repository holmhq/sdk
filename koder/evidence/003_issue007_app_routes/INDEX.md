---
title: Issue 007 app route disposition ledger
status: implemented
issue: 007
source_commit: 8deb00b7aa1cc07f39665fde6e81c1b33d3620c4
updated: 2026-07-16
---

# Issue 007 App Route Disposition Ledger

The executable ledger is [`route-audit.json`](route-audit.json). It classifies
every route key and method listed by Holm's live
`packages/holm-sdk/app.audit.js` at commit
`8deb00b7aa1cc07f39665fde6e81c1b33d3620c4` (`v0.185.0`). Holm remains
read-only; this evidence does not change or supersede its routes.

## Verified authority paths

- `packages/holm-sdk/app.audit.js` — source inventory and existing SDK method
  mapping.
- `packages/holm-sdk/app.js` — current auth, links, upload, pagination, and
  navigation behavior being selectively migrated.
- `internal/auth/handlers.go` — live login, anonymous, magic-link, QR scanner,
  and logout registrations.
- `cmd/server/main.go` — live app blob-link route registrations.
- `internal/runtime/handler.go` — app-runtime handling evidence for reserved
  identity paths including `/api/me`.

## Disposition summary

- **Adopted:** HTTP auth operations, `/api/me`, and blob-link CRUD retain their
  Holm route semantics behind the shared transport/resource contracts.
- **Redesigned:** login/QR navigation becomes an injected optional web service;
  blob-link import uses the resumable upload seam with an isolated fallback.
- **Intentionally unsupported:** `GET /auth/magic/complete` remains a Holm-owned
  browser page reached from email and receives no direct SDK request helper.
- **Deferred:** none of the routes in the current audit are silently deferred.

`test/source/web/app-route-audit.test.ts` verifies the exact 12 source keys, all
15 expanded method/path pairs, the named Holm commit, and a non-empty rationale
for every classification. Changing a disposition requires updating the JSON
ledger and its test together.

## Implementation proof

- `src/app/` owns runtime-neutral HTTP, auth, links, pagination, surfaces, and
  upload-service composition under `@holmhq/sdk/app`.
- `src/web/` owns Fetch, cookie/token proof, caller, navigation, bootstrap,
  lifecycle, resumable upload, multipart fallback, and `createWebApp()`.
- `test/source/app/client.test.ts` and `test/source/web/` exercise the route
  dispositions against deterministic Holm-shaped response envelopes.
- `examples/bfbb/` imports tracked ESM directly; `examples/vite/` builds through
  package exports. `npm run test:examples` passes both modes.
- A read-only local Holm `v0.185.0` health smoke passed at
  `http://127.0.0.1:8080/.holm/status`; the selected bare host had no app
  `/api/me` route, which was reported as an app-route skip rather than treated
  as conformance evidence.
- Refresh from Holm `858224c` to `8deb00b` changed none of
  `packages/holm-sdk/{app.audit.js,app.js,runtime.js}`; the only mapped-authority
  diff was an unrelated system-stats registration in `cmd/server/main.go`.
