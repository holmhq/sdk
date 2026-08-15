---
title: Holm v0.207.0 SDK route disposition ledger
status: review_ready
issue: 019
slice: S2
schema: holm.sdk.route-dispositions/1
holm_version: 0.207.0
holm_commit: d66628674232b01e8c95d5b86617bc660d61410f
route_count: 261
updated: 2026-08-15
---

# Holm v0.207.0 SDK Route Dispositions

[`route-dispositions.json`](route-dispositions.json) is the curated SDK policy
layer over the signed machine snapshot in
[`../007_holm_v0207_route_registry/route-registry.json`](../007_holm_v0207_route_registry/route-registry.json).
It classifies every composite route identity without treating route existence as
permission to generate a public method.

## Composition

The executable ledger keeps machine facts and human decisions separate:

1. the signed snapshot supplies exact `method + path + source_group + lane`
   identities and route attributes;
2. the reviewed Issue `#007` app and Issue `#008` admin ledgers supply existing
   adopted, redesigned, and excluded decisions;
3. 65 exact-identity overrides classify newly visible routes, preserve deliberate
   cross-ledger choices, and prevent a method/path match from collapsing distinct
   lanes.

`node scripts/check-holm-route-dispositions.mjs` resolves that composition and
fails closed on missing, duplicate, stale, or conflicting decisions; provenance
or summary drift; noncanonical JSON; unsupported classification/implementation
pairs; preview S3 admission; or an S3 candidate without request and result
authority.

## Full disposition summary

| Classification | Route identities | Meaning at this checkpoint |
| --- | ---: | --- |
| adopted | 172 | 170 current identities plus 2 stable S3 candidates |
| redesigned | 15 | Current behavior behind SDK-owned runtime/surface boundaries |
| deferred | 36 | No public API claim; reconsider only through an explicit later slice |
| excluded | 38 | Browser/resource ingress, compatibility, internal, debug, or non-operation routes |
| **Total** | **261** | Every signed registry identity resolves exactly once |

Implementation status is 185 current identities, 2 S3 candidates, and 74 with no
SDK implementation. Counts describe registry rows, not generated method count:
`ANY` rows may cover a narrower audited method set, and one SDK operation can
cite multiple authority rows.

## The 21-row admin/operator delta

| Family | Rows | S2 disposition | Rationale |
| --- | ---: | --- | --- |
| DB retention status/run | 2 | **adopted; S3 candidate** | Holm's legacy admin SDK already exposes both stable contracts. Status is read-only; remote run is server-enforced dry-run only and rejects apply/force. |
| DB usage/candidates | 2 | deferred | Stable read-only routes, but signed Holm `v0.207.0` explicitly defers first-class SDK wrappers; route stability does not prove product demand. |
| Policy registry/keys | 6 | deferred | CLI/API support exists, but first-class SDK wrappers are explicitly deferred and write/reset types need a separate demand review. |
| Host reserve/split/swap | 3 | deferred | Holm Plan 397 defers public behavior helpers; these are topology mutations, not automatic SDK parity. |
| Census status/enable/disable | 3 | deferred | Preview operational diagnostics remain CLI-owned. |
| Scan-shield status/rules/events | 5 | deferred | Preview inspection and mutation remain available through `holm shield`, not stabilized through the SDK. |
| **Total** | **21** | **2 candidates · 19 deferred** | No route was adopted merely because it exists. |

The two S3 candidates are:

- `GET /api/system/db/retention/status` → proposed
  `admin:system.dbRetentionStatus`; request authority is
  `internal/handlers/system.go#SystemDBRetentionStatusHandler`, and result
  authority is `internal/database/db_retention.go#DBRetentionStatus`.
- `POST /api/system/db/retention/run` → proposed
  `admin:system.dbRetentionRun`; request and dry-run enforcement authority is
  `internal/handlers/system.go#SystemDBRetentionRunHandler`, and result authority
  is `internal/database/db_retention.go#DBRetentionReport`.

Both references are pinned by this evidence to Holm commit
`d66628674232b01e8c95d5b86617bc660d61410f`. S2 does not implement either
method or freeze TypeScript request/result declarations.

## Identity-sensitive and cross-surface decisions

- The `dashboard-admin` `POST /api/spaces/{space}/keys` identity inherits current
  `admin:spaces.keys.create` coverage. The separate `member-host` identity is
  deferred until an app-facing caller/capability and namespace contract is
  approved.
- Login GET behavior remains redesigned/current through app URL/navigation
  helpers while remaining excluded from the admin namespace; exact overrides
  resolve that intentional inherited-ledger conflict.
- Resumable upload create/status/chunk/complete rows remain redesigned/current
  behind `web:createWebUploadService`. Remote upload-session deletion is
  deferred because current cancellation aborts local work without claiming that
  server operation.
- QR and member-session flows are deferred for a cohesive app/web auth resource;
  host dispatch catch-alls, profiling endpoints, browser completion pages, and
  public resource-delivery URLs are excluded as direct SDK operations.

## Validation and boundary

Focused RED evidence is in
[`../../../test/evidence/issue019-s2-red.md`](../../../test/evidence/issue019-s2-red.md).
Normal CI runs the offline-only disposition gate after validating the signed
route snapshot:

```text
npm run test:holm-route-dispositions
npm run test:holm-route-registry
npm run test:source
npm run test:ci-workflow
npm run ci
```

Observed at the implementation checkpoint: focused disposition tests pass 6/6,
registry tests pass 18/18, source tests pass 230/230, full CI and diff hygiene
pass. The installed signed Holm binary is now `v0.208.0` at `93606188…`; its
261-route array is byte-equivalent to this snapshot and the S2-relevant Holm
source paths have no `d6662867..93606188` diff. The explicit live checker
correctly fails on version/commit provenance only, and S2 does not rewrite the
accepted S1 snapshot.

S2 changes no public `src/**`, generated admin API, tracked `dist/**`, package
version, release, publication, deployment, Holm source, Medialab state, or
`@zyt` state. S3 remains separately owner-gated after this checkpoint is
independently reviewed.
