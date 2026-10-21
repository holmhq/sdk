---
title: Holm v0.207.0 SDK route disposition ledger
status: accepted
review: "#070 S2; #071 S3"
issue: 019
slice: S2-S3
schema: holm.sdk.route-dispositions/1
holm_version: 0.207.0
holm_reference: the release tested (internal verification kept privately)
route_count: 261
updated: 2026-08-17
---

# Holm v0.207.0 SDK Route Dispositions

The historical policy layer classified all 261 reviewed route contexts without
assuming route existence permitted a public SDK method. The original internal
routing dump (`route-dispositions.json`) was removed in the public-tree privacy
cleanup. Maintainers retain internal evidence privately; this summary and the
public app/admin route ledgers preserve the product decisions.

## Composition

The historical composition kept route facts separate from SDK adoption policy,
inherited the reviewed app/admin decisions, and explicitly distinguished auth
and host contexts. Its internal-only validator and regression tests were removed
with the dump; they are no longer public CI gates.

## Full disposition summary

| Classification | Route identities | Meaning at this checkpoint |
| --- | ---: | --- |
| adopted | 172 | All current; 170 pre-S3 identities plus 2 stable retention additions implemented in S3 |
| redesigned | 15 | Current behavior behind SDK-owned runtime/surface boundaries |
| deferred | 36 | No public API claim; reconsider only through an explicit later slice |
| excluded | 38 | Browser/resource ingress, compatibility, internal, debug, or non-operation routes |
| **Total** | **261** | Every signed registry identity resolves exactly once |

Implementation status is 187 current identities, no remaining S3 candidates,
and 74 with no SDK implementation. Counts describe registry rows, not generated method count:
`ANY` rows may cover a narrower audited method set, and one SDK operation can
cite multiple authority rows.

## The 21-row admin/operator delta

| Family | Rows | S2 disposition | Rationale |
| --- | ---: | --- | --- |
| DB retention status/run | 2 | **adopted; current in S3** | The canonical admin SDK now exposes both stable contracts. Status is read-only; remote run is bodyless and server-enforced dry-run only, with apply/force rejected before SDK invocation and by Holm. |
| DB usage/candidates | 2 | deferred | Stable read-only routes, but signed Holm `v0.207.0` explicitly defers first-class SDK wrappers; route stability does not prove product demand. |
| Policy registry/keys | 6 | deferred | CLI/API support exists, but first-class SDK wrappers are explicitly deferred and write/reset types need a separate demand review. |
| Host reserve/split/swap | 3 | deferred | Holm Plan 397 defers public behavior helpers; these are topology mutations, not automatic SDK parity. |
| Census status/enable/disable | 3 | deferred | Preview operational diagnostics remain CLI-owned. |
| Scan-shield status/rules/events | 5 | deferred | Preview inspection and mutation remain available through `holm shield`, not stabilized through the SDK. |
| **Total** | **21** | **2 current additions · 19 deferred** | No route was adopted merely because it exists. |

The two S3 promotions are:

- `GET /api/system/db/retention/status` → `admin:system.dbRetentionStatus`:
  authenticated read-only status, no request body.
- `POST /api/system/db/retention/run` → `admin:system.dbRetentionRun`:
  authenticated, bodyless, server-enforced dry-run.

These public Holm `0.207.0` contracts map to readonly
`AdminDBRetentionStatus` and `AdminDBRetentionReport` declarations. The remote
report narrows `dry_run` to `true` and `applied` to `false`; both generated
methods expose only bodyless operation controls.

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
[`../../../test/evidence/issue019-s2-red.md`](../../../test/evidence/issue019-s2-red.md)
and
[`../../../test/evidence/issue019-s3-red.md`](../../../test/evidence/issue019-s3-red.md).
Current CI checks public-tree privacy, the supported admin route ledger,
source/generated behaviour and package integrity:

```text
npm run check:public-privacy
npm run test:admin-api
npm run test:source
npm run ci
```

Historical S2 validation passed 6/6 disposition tests, 18/18 registry tests,
230/230 source tests, full CI and diff hygiene. A maintainer check against Holm
`0.208.0` reported unchanged route behaviour. Internal routing provenance is no
longer kept in this public tree.

S2 changed no public package surface. Independent Review
[`#070`](../../reviews/070_issue019_s2_route_dispositions/INDEX.md) approved
exact product range `82145ce..091e268` with `P1=0 P2=0 P3=0`, including fresh
read-only `v0.208.0` route-array and source-drift verification.

The owner activated S3 on 2026-08-16. The implementation changes only the two
approved retention methods/types, their route-ledger status, and affected
tracked package artifacts. Focused checks, 231 source tests, full `npm run ci`,
267-artifact reproducibility, package install smoke, licenses, coverage, size,
and diff hygiene pass. Fresh read-only Holm admin authority matches 176 keys,
191 route/method contracts, 218 methods, and 18 exclusions; relevant source is
unchanged from `the Holm release tested…`, and the signed `v0.208.0` registry drift remains
provenance-only.

S3 does not change the package version, publish, release, deploy, write Holm or
Medialab, or begin S4. Independent Review
[`#071`](../../reviews/071_issue019_s3_retention_parity/INDEX.md) approved exact
product range `914a1e2..c7e589b` with `P1=0 P2=0 P3=0`; S3 is accepted and
stops before S4.
