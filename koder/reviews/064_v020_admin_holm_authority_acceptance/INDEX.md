---
status: accepted
reviewer: pi/gpt-5.5
date: 2026-07-20
sdk_commit: 189eaa6261b9c357a6a61bf813cd9fcd1eeb372a
sdk_product_target: 96485b7d2922893efb3477cd174a3017e3de10ce
holm_commit: 9a02784b5b8004ed946003cb650b1325f29763a1
ledger_commit: 3d229a414a0379d0a24221e975b8b4f1588f494d
accepted_web_checkpoint: 748cbe5e8f673d9a5a3d276e6826eecac32b8612
p1: 0
p2: 0
p3: 1
---

# Review 064: Issue #008 / `0.2.0` admin Holm-authority acceptance

## Verdict

Accepted for exact SDK candidate `189eaa6261b9c357a6a61bf813cd9fcd1eeb372a`
and product target `96485b7d2922893efb3477cd174a3017e3de10ce` against live
Holm authority `9a02784b5b8004ed946003cb650b1325f29763a1`. Counts:
**P1=0 P2=0 P3=1**. The SDK may truthfully release the preview
`@holmhq/sdk/admin` capability after the remaining exact-target release gates,
provided release notes do not claim the full Holm package test is green.

## P3 advisory

- **P3-1: Holm `packages/holm-sdk/test.js` has one unrelated stale generated
  inventory failure.** The required full zero-dependency test ran read-only and
  exited `1` with `209 passed, 1 failed`; the lone failure was
  `developer surface inventory matches generated audit output`, reporting stale
  `koder/issues/181_developer_surface_audit/inventory.md`. The relevant admin
  route audit tests in that run passed (`route audit classifies every live
  admin/auth registration`, `route audit points at real SDK methods`, `agent
  admin route inventory covers every supported main.go route`, and related
  package checks). Because clearing the failure would require a Holm write and
  the narrower authority inventory below passes, this is a disclosed Holm
  documentation/audit-artifact advisory, not an SDK admin release blocker.

## Source and route assessment

- `koder/evidence/004_issue008_admin_routes/route-audit.json` exactly matches
  live `packages/holm-sdk/admin.audit.js` at Holm HEAD. `npm run
  test:holm-admin-authority` passed with **174 keys**, **189 route/method
  contracts**, **216 unique methods**, and **18 exclusions**; it also reported
  relevant paths unchanged since ledger commit `3d229a4...`.
- The ledger remains structured as schema `holm.sdk.admin-route-audit/1` with
  `166` adopted entries, `8` redesigned entries, `2` helper entries, and `2`
  note-bearing entries. I found no stale/missing admin route and no unsupported
  convenience claim in the normalized inventory.
- Live Holm registrations agree with the audit source: dashboard/admin routes
  are registered in `cmd/server/main.go:5216-5386`, auth/member/provider routes
  in `internal/auth/handlers.go:169-191`, and Space admin/member routes in
  `internal/handlers/spaces.go:29-46`. The main host dispatcher keeps deploy
  behind `APIAuthMiddleware`, most `/api/*` behind `AdminMiddleware`, and
  special public/internal ingress out of the admin claim at
  `cmd/server/main.go:3482-3524`.
## SDK descriptor and protocol assessment

- `src/admin/generated.ts` preserves live method/path authority rather than
  inventing backend capability: upload descriptors keep `/api/deploy`,
  `/api/apps/{id}/links/import`, and `/auth/members/uploads`; binary receipt
  attachment keeps `GET /api/email/receipts/{id}/attachment` with
  `responseMode: "binary"`; `members.list` keeps both `GET /auth/members` and
  `/api/apps/{id}/members`; command helpers keep `POST /api/cmd` plus generated
  command prefixes.
- `scripts/check-admin-api.mjs` passed and proves generated descriptors are
  deterministic from the ledger without adding extra server operations.
- `src/admin/client.ts` routes request, URL, upload, composite-upload, command,
  and binary behaviors through descriptor metadata. It serializes `/api/cmd` as
  Holm command envelopes, parses receipt attachments from raw response metadata,
  and rejects route/path mismatches locally before transport invocation.

## Auth, upload, and authority assessment

- The SDK's explicit operator caller is correctly described as non-proof:
  `docs/admin.md:15-22` says caller context is non-secret isolation metadata,
  adapter auth proof remains private, and Holm authenticates/authorizes every
  route. `docs/admin.md:145-168` explicitly states upload preflight is a client
  fail-closed check and that possessing the SDK or bundle does not grant
  operator authorization.
- Upload remediation does not masquerade as a Holm server operation. The SDK
  adds `ADMIN_HTTP_PREFLIGHT_OPERATION = "preflight"` under capability
  `holm.http.admin` (`src/admin/protocol.ts:4-10`) and invokes it with `payload:
  null` (`src/admin/http.ts:65-75`) before any injected upload service call
  (`src/admin/client.ts:119-128`).
- Web and Node runtimes gate that preflight through the same admin capability and
  explicit operator caller checks (`src/web/runtime.ts:352-390`,
  `src/node/runtime.ts:398-436`) before fetch/auth application. Holm remains the
  durable authorization boundary, including deploy, upload, member, and app-link
  handlers.

## Migration and drift assessment

- Existing Holm `packages/holm-sdk` and `packages/holm-state` were not touched.
  Scoped relevant status was empty before and after review, and no relevant diff
  exists from ledger `3d229a414a0379d0a24221e975b8b4f1588f494d` to live HEAD for
  `packages/holm-sdk`, `packages/holm-state`, `cmd/server/main.go`,
  `internal/auth/handlers.go`, `internal/handlers/spaces.go`, or
  `internal/middleware/auth.go`.
- There is also no relevant diff from the accepted web checkpoint
  `748cbe5e8f673d9a5a3d276e6826eecac32b8612` to live HEAD for those paths. Holm
  HEAD has moved to `v0.185.2` (`9a02784...`) but the admin/package authority
  reviewed here is unchanged from the ledger content.
- SDK migration/cutover language is honest: `docs/admin.md` calls the entry
  point preview, keeps the legacy Holm admin client live, and does not claim a
  Holm package deletion, redirect, or authorization transfer.

## Read-only fingerprint and dirty-state evidence

- Holm relevant pre-status: empty for `packages/holm-sdk`, `packages/holm-state`,
  `cmd/server/main.go`, `internal/auth/handlers.go`, `internal/handlers/spaces.go`,
  and `internal/middleware/auth.go`.
- Holm relevant post-status: empty for the same paths.
- Relevant Git index fingerprint before and after:
  `9c634dc39355232e3b6d4c2c4d15b8f4113aa2b0e9a17e581a78959854164433`.
- Relevant blob-content fingerprint before and after:
  `219de2473a063bebebac27b7ef64061c1eb6740988b3003c97ecf6fbc22900db`.

## Commands and exit codes

- `git rev-parse HEAD` in SDK — exit `0`;
  `189eaa6261b9c357a6a61bf813cd9fcd1eeb372a`.
- `git -C /home/glasscube/Projects/holmhq/holm/master rev-parse HEAD` — exit
  `0`; `9a02784b5b8004ed946003cb650b1325f29763a1`.
- `git -C <holm> status --short --untracked-files=all -- <relevant paths>` —
  exit `0`; no output before or after review.
- `npm run test:holm-admin-authority` — exit `0`; normalized live Holm admin
  inventory matches the SDK ledger at current Holm HEAD.
- `npm run test:admin-api` — exit `0`; generated SDK admin descriptors match
  the pinned ledger.
- `node packages/holm-sdk/test.js` from Holm — exit `1`; `209 passed, 1 failed`,
  with only stale `koder/issues/181_developer_surface_audit/inventory.md`; no
  source mutation and relevant route/package tests passed.
- Narrow read-only Holm SDK authority script over live audits/registrations and
  package SDK methods — exit `0`; 174/189/216/18 counts passed.
- Scoped `git diff --name-status 3d229a414a0379d0a24221e975b8b4f1588f494d..HEAD
  -- <relevant paths>` — exit `0`; no output.
- Scoped `git diff --name-status 748cbe5e8f673d9a5a3d276e6826eecac32b8612..HEAD
  -- <relevant paths>` — exit `0`; no output.

## Exact-target gate recommendation

Accept SDK candidate `189eaa6261b9c357a6a61bf813cd9fcd1eeb372a` / product target
`96485b7d2922893efb3477cd174a3017e3de10ce` for the Holm-authority gate. Continue
only with the final four-mode/release/package/audit/dry-run gates from this exact
target, and disclose the Holm P3 if someone asks whether the live Holm
`packages/holm-sdk/test.js` suite is fully green.
