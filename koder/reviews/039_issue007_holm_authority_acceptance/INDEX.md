---
review: 039
issue: 007
title: Holm-authority acceptance for web/app route + auth surfaces
type: holm-authority-acceptance
verdict: accepted
p1: 0
p2: 0
p3: 0
reviewer: owner-present direct session (Claude Fable 5), read-only Holm access
sdk_commit: d8e8ea041128a0d744324026551ec04ce6a5d5af
holm_commit: 2d125730d02097bc62d6eb8a6d5134acf0acf4de
holm_version: 0.185.0
route_ledger_pin: 8deb00b7aa1cc07f39665fde6e81c1b33d3620c4
prior_authority_review: ../034_a2_holm_authority_acceptance/INDEX.md
scope: Issue 007 web-client route/auth surface conformance at a named current Holm commit
date: 2026-07-16
---

# Review 039: Issue 007 Holm-Authority Acceptance

Fresh read-only Holm-authority acceptance of the Issue `#007` web/app client
route and auth surfaces. SDK reviewed at `d8e8ea0`. Holm read-only at current
HEAD `2d125730` (v0.185.0) of `~/Projects/holmhq/holm/master`. No Holm writes;
Holm checkout clean before and after (only its own `.harnex/dispatch.jsonl`
telemetry, unrelated to SDK work).

## Verdict

**Accepted — 0 P1, 0 P2.** The web-client route/auth surface conforms to the
live Holm authority, and the mapped authority source has not drifted since the
route ledger's pinned baseline.

## Authority drift check (read-only)

`git diff --name-only 8deb00b7..2d125730` (route ledger pin → current Holm HEAD)
is **empty** for every mapped authority path:

- `packages/holm-sdk/` (incl. `app.audit.js`, `app.js`, `runtime.js`)
- `packages/holm-state/`
- `internal/auth/` (login, anonymous, magic-link, QR scanner, logout)
- `internal/runtime/` (reserved `/api/me` identity path)
- `internal/api/`
- `cmd/server/` (app blob-link registrations)
- `docs/{concepts,reference}/sdk.md`

Holm advanced only in unrelated `koder/` proposal docs (`#534`) and telemetry.

## Route ledger conformance

The SDK ledger `koder/evidence/003_issue007_app_routes/route-audit.json`
(pinned to Holm `8deb00b7`) was re-verified against the live
`packages/holm-sdk/app.audit.js` inventory at `2d125730`:

- 12 source route keys — exact match (equal sets).
- 15 expanded method/path pairs — exact match (equal sets).
- Classifications (adopted / redesigned / intentionally unsupported) unchanged;
  `GET /auth/magic/complete` remains a Holm-owned browser page with no direct
  SDK request helper.

Live registrations spot-verified read-only:

- `internal/auth/handlers.go`: `GET /auth/login`, `POST /auth/anonymous/{start,
  promote}`, `POST /auth/magic/request`, `GET|POST /auth/magic/complete`,
  `GET /auth/qr/scanner`, `POST /auth/logout`.
- `cmd/server/main.go`: `/api/apps/{id}/links`, `POST .../links/import`,
  `/api/apps/{id}/links/{idOrSlug}`.
- `internal/runtime/handler.go`: reserved `/api/me` identity path.

## Auth-containment note

The Issue `#007` web auth-containment surface (same-origin proof, cross-origin
fail-closed) is an SDK-side invariant layered above Holm's routes; it does not
alter any Holm route contract. Its correctness is covered by Reviews `#035`,
`#036`, `#037`, and `#038`. This acceptance confirms the SDK conforms to and
does not fork Holm's live route/auth registrations.

## Standing constraints verified

- `package.json` `"private": true` intact; no publish/tag/release/deploy.
- Holm checkout read-only; existing `packages/holm-{sdk,state}` unchanged and
  operational.
- Route ledger pin retained at `8deb00b7`; this acceptance records re-verified
  zero drift through `2d125730` rather than moving the audit-capture pin.
