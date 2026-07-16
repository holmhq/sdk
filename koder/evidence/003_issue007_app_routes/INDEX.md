---
title: Issue 007 app route disposition ledger
status: in-progress
issue: 007
source_commit: 858224c81098eb6fd254aa214924ccbbf4e8a69e
updated: 2026-07-16
---

# Issue 007 App Route Disposition Ledger

The executable ledger is [`route-audit.json`](route-audit.json). It classifies
every route key and method listed by Holm's live
`packages/holm-sdk/app.audit.js` at commit
`858224c81098eb6fd254aa214924ccbbf4e8a69e` (`v0.184.0`). Holm remains
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
for every classification. Later `#007` slices may add implementation proof to
this index, but changing a disposition requires updating the JSON ledger and its
test together.
