---
status: open
priority: P1
created: 2026-08-13
updated: 2026-08-15
tags: holm, routes, registry, parity, admin, drift, generation
type: feature
issue_kind: track
slice_count: 4
slices_done: 2
source_holm_version: 0.207.0
source_holm_commit: d66628674232b01e8c95d5b86617bc660d61410f
context: Holm Issue #633 shipped a provenance-bearing offline route registry; the canonical SDK must replace its frozen Holm authority link with a generated snapshot and explicit parity workflow.
---

# Issue 019: Refresh SDK parity from Holm's route registry

## Owner decision and handoff

The owner activated this track on 2026-08-13. Work belongs in the canonical SDK
repository, not in Holm: Holm already owns and ships the authority export, while
this repository owns ingestion, SDK dispositions, generated clients, and SDK
validation.

The first execution session was authorized for **S1 only** and stopped after
its landed ingestion checkpoint. On 2026-08-15, after independent Review `#069`
approved S1, the owner explicitly activated **S2** in a fresh session. S2 is
route-policy work only and must stop after an independently reviewed disposition
checkpoint; S3 implementation remains separately gated.

## Problem

The canonical admin SDK is deterministic only after its hand-maintained ledger:

- `koder/evidence/004_issue008_admin_routes/route-audit.json` is pinned to Holm
  commit `3d229a414a0379d0a24221e975b8b4f1588f494d`;
- `scripts/check-admin-api.mjs` deterministically generates SDK descriptors from
  that ledger;
- `scripts/check-admin-holm-authority.mjs` still imports Holm's legacy
  `packages/holm-sdk/admin.audit.js` directly.

That catches ledger-to-generated drift but leaves Holm-to-ledger freshness tied
to a legacy source module and a manual snapshot. Holm `v0.207.0` now ships the
proper authority surface:

```text
holm api routes --format json
```

Its `holm.route-registry.v1` payload is offline, database-free, token-free, and
contains exact release version/commit provenance plus method, path, auth scope,
surface class, stability, lane, and source group for every compiled route.

## Verified handoff baseline

Verified from the signed local Holm `v0.207.0` installation before filing:

| Fact | Value |
| --- | --- |
| Holm version | `0.207.0` |
| Holm release commit | `d66628674232b01e8c95d5b86617bc660d61410f` |
| Registry schema | `holm.route-registry.v1` |
| Registry rows | `261` |
| Surface classes | `151` admin/operator · `93` app-facing · `17` system/public |
| Stability | `172` stable · `62` preview · `27` internal |
| `ANY` method rows | `41` |
| Current SDK admin ledger | `174` keys · `189` route/method contracts · `216` generated methods · `18` exclusions |
| Existing-contract check | all `189/189` SDK route/method contracts still match the Holm export |
| Immediate admin delta | `21` admin/operator registry rows are neither supported nor excluded by the current SDK ledger |

The local peer name `@locallh` is only `http://localhost:8080`, an alias for the
same local service. `@zyt` remains on Holm `v0.206.0` for census tracking and is
**not** an authority source or dependency for this work.

## Architecture boundary

Keep machine facts separate from human SDK decisions:

1. **Generated Holm snapshot** — exact normalized output from the signed Holm
   binary, including version and commit provenance.
2. **Curated SDK disposition** — adopted, redesigned, deferred, or excluded;
   SDK method naming; rationale; and request/result type authority.

Never generate public SDK methods merely because a route exists. The Holm
export intentionally does not define SDK naming, request/response schemas,
upload/composite behavior, or whether preview/internal routes belong in the
public package.

Normal SDK CI must remain self-contained and network-free. It validates the
checked-in snapshot. A separate explicit live-authority mode may execute a
caller-supplied `HOLM_BIN` and compare its export to the snapshot.

## Slice ledger

| Slice | Status | Scope | Stop gate |
| --- | --- | --- | --- |
| S1: registry ingestion and drift gate | complete | Captured/validated canonical Holm export; deterministic write/check/live-check tooling; CI wiring; no SDK API changes | Landed and validated; `/close` before any S2 work |
| S2: route disposition refresh | complete | Reconciled all registry rows with SDK adopted/redesigned/deferred/excluded policy; 2 S3 candidates, 19 admin deltas deferred | Review `#070` approved; stop before S3 |
| S3: approved stable parity | ready for owner activation | TDD implementation of the two owner-approved stable retention methods/types and tracked generated artifacts | Fresh owner activation after reviewed S2; stop at reviewed S3 checkpoint |
| S4: non-HTTP parity map | blocked | WebSocket frames, Sobek `holm.*` namespaces, Node capabilities, and action/schema authority that HTTP routes cannot describe | Mapping only after route parity baseline |

## S1 execution contract

### Route-row identity clarification — 2026-08-14

The signed 261-row export intentionally contains two
`POST /api/spaces/{space}/keys` rows: one `dashboard-admin` / admin-operator
row and one `member-host` / app-facing row. The owner clarified that SDK
registry ingestion must use Holm's authoritative golden-table identity:
`method + path + source_group + lane`.

Rows sharing method + path remain distinct when source group or lane differs.
`auth_scope`, `surface_class`, and `stability` are attributes, not identity
fields. Validation rejects an exact duplicate composite identity, while
normalization and live-drift added/removed/changed/order diagnostics use that
same composite identity throughout. No Holm change is required.

### Goal

Land a trustworthy, deterministic SDK-side ingestion seam for Holm's released
route registry without changing any public SDK method, type, package artifact,
or capability claim.

### Expected files

Names may be adjusted if tests expose a better local convention, but ownership
must remain narrow:

- `koder/evidence/007_holm_v0207_route_registry/INDEX.md`
- `koder/evidence/007_holm_v0207_route_registry/route-registry.json`
- `scripts/refresh-holm-route-registry.mjs`
- a focused Node test for the refresh/validation behavior
- `package.json` script/CI wiring
- this issue and `koder/STATE.md`

Do not modify `src/admin/generated.ts`, public `src/**`, tracked `dist/**`, the
existing route disposition ledger, package version, or changelog in S1.

### Required command contract

The implementation should provide equivalent explicit modes:

```text
node scripts/refresh-holm-route-registry.mjs --write [--holm-bin <path>]
node scripts/refresh-holm-route-registry.mjs --check
node scripts/refresh-holm-route-registry.mjs --check-live [--holm-bin <path>]
```

`HOLM_BIN` may be supported as the non-argv override; explicit argv wins. Never
shell-join a command. Invoke the binary with an argv array.

- `--write` executes the chosen Holm binary, validates its JSON, and writes one
  canonical checked-in snapshot.
- `--check` validates the checked-in snapshot and canonical serialization only;
  it must not require Holm, Git, network, credentials, SQLite, or a server.
- `--check-live` validates the checked-in snapshot, executes the chosen Holm
  binary, and fails with an attributable drift report if registry content or
  provenance differs.

### RED behavior matrix

Write focused tests first and record the expected failures before production
implementation. At minimum pin:

| Behavior | Intended RED reason |
| --- | --- |
| Valid `holm.route-registry.v1` envelope normalizes deterministically | parser/normalizer absent |
| Wrong schema, failed envelope, missing provenance, malformed commit, empty routes, unknown surface/stability, and duplicate `method + path + source_group + lane` identity fail closed; valid shared method+path rows across distinct lanes are preserved | validation absent |
| Registry row order is preserved while object serialization is canonical and newline-terminated | canonical writer absent |
| `--write` uses an argv-safe fake Holm executable and produces the expected snapshot | command absent |
| `--check` succeeds without a Holm binary and rejects stale/noncanonical fixture bytes | offline check absent |
| `--check-live` passes exact data and fails changed route/provenance with useful diagnostics | live drift gate absent |
| Checked-in evidence pins `0.207.0`, commit `d6662867…`, and `261` rows | evidence absent |
| Normal SDK CI invokes the offline check, never live Holm | CI wiring absent |

Tests must use temporary fixtures/fake executables. They must not mutate the
real checked-in evidence during negative cases.

### S1 acceptance criteria

- [x] Strict RED evidence exists before implementation.
- [x] The checked-in snapshot is generated from local signed Holm `v0.207.0`
      and pins full commit `d66628674232b01e8c95d5b86617bc660d61410f`.
- [x] Snapshot validation covers schema, success envelope, provenance, route
      vocabulary, required fields, and duplicate
      `method + path + source_group + lane` identities while preserving valid
      shared method+path rows across distinct source groups or lanes.
- [x] Canonical output is deterministic and preserves Holm registry row order.
- [x] Offline `--check` has no Holm/network/server/database dependency.
- [x] Explicit live check passes against local `holm v0.207.0` and detects a
      changed fake registry/provenance.
- [x] SDK CI includes the offline check.
- [x] Focused tests, `npm run test:source`, `npm run ci`, and diff hygiene pass.
- [x] No public SDK source, generated API, `dist/`, package version, release,
      publication, deployment, Holm source, or `@zyt` state changes.
- [x] Issue/STATE are updated, S1 is committed, and the session closes before S2.

## S1 outcome — 2026-08-14

- Strict RED and the owner-approved composite-identity refinement RED are
  recorded in `test/evidence/issue019-s1-red.md`.
- `route-registry.json` preserves all 261 signed release rows at exact commit
  `d66628674232b01e8c95d5b86617bc660d61410f`; its SHA-256 is
  `4cd21d8e6f288e2c0d9cfe6ec17a96b71072bf152e52407435c3d0f1c25cdba1`.
- The fail-closed tool provides argv-safe write, offline canonical check, and
  explicit live drift modes. Validation and every drift diagnostic use Holm's
  `method + path + source_group + lane` identity.
- Focused tests pass 18/18, source tests pass 230/230, the explicit live check
  matches signed Holm `v0.207.0`, and full `npm run ci` plus diff hygiene pass.
- S1 changed no public SDK source, generated API, `dist/`, route dispositions,
  version, release state, Holm source, or Medialab state.
- Independent checkpoint Review [`#069`](../../reviews/069_issue019_s1_route_registry_ingestion/INDEX.md)
  approved exact product range `263bce8..de5530a` with
  `P1=0 P2=0 P3=0`. Its fresh read-only live check matched signed Holm
  `v0.207.0`; S2 is technically unblocked but remains inactive until explicit
  owner activation in a fresh session.

## S2 execution contract — activated 2026-08-15

S2 consumes the landed snapshot and classifies parity; it does not redesign S1
or generate methods from route existence. Its executable policy layer must:

- resolve all 261 `method + path + source_group + lane` identities exactly once;
- inherit current reviewed app/admin decisions without flattening their surface
  meaning;
- classify additions as adopted, redesigned, deferred, or excluded with a
  rationale and pinned source basis;
- distinguish current implementation from a stable, separately gated S3
  candidate;
- name request/result authority for every S3 candidate;
- fail closed on missing, duplicate, stale, conflicting, or provenance-drifted
  decisions in normal offline CI;
- preserve both `POST /api/spaces/{space}/keys` lane identities; and
- change no public `src/**`, generated API, `dist/**`, version, release, Holm,
  Medialab, or `@zyt` state.

The currently visible 21-row admin/operator delta includes:

- stable DB usage, reclaim-candidate, and retention routes;
- stable policy registry/key routes;
- stable host reserve/split/swap routes;
- preview census controls;
- preview scan-shield routes.

S2 adopts only the two stable retention contracts as separately gated S3
candidates: `system.dbRetentionStatus` is read-only, and
`system.dbRetentionRun` is server-enforced dry-run only. The other 19 delta rows
remain deferred exactly as signed Holm `v0.207.0` documents for SDK coverage.

The route registry cannot specify authenticated WebSocket frames, presence,
whispers, injected Sobek namespaces, or action input/output schemas. Those
remain S4 parity requirements rather than invented HTTP claims.

## S2 outcome — 2026-08-15

- `koder/evidence/008_holm_v0207_route_dispositions/route-dispositions.json`
  composes the signed snapshot with the reviewed app/admin ledgers and 65 exact
  identity overrides. All 261 rows resolve once: 172 adopted, 15 redesigned,
  36 deferred, and 38 excluded.
- The 21-row admin delta resolves to 2 stable S3 candidates and 19 deferred
  routes. Each candidate names exact request and result authority at Holm
  commit `d6662867…`.
- The dashboard-admin space-key row remains current while the distinct
  member-host row is explicitly deferred; no lane is collapsed.
- The fail-closed offline checker rejects missing, duplicate, stale, conflicting,
  reordered, malformed, provenance-drifted, preview-admitted, and
  contract-authority-free policy.
- Focused tests pass 6/6, source tests pass 230/230, `npm run ci` passes, and
  diff hygiene is clean.
- The installed signed Holm binary advanced to `v0.208.0` at `93606188…` during
  S2. Its 261 route rows are byte-equivalent to the pinned route array and all
  S2-relevant source paths are unchanged from `v0.207.0`; the explicit live
  checker correctly reports provenance-only drift, so S2 did not rewrite S1.
- No public SDK source, generated API, `dist/`, version, release, Holm,
  Medialab, or `@zyt` state changed.
- Independent Review
  [`#070`](../../reviews/070_issue019_s2_route_dispositions/INDEX.md) approved
  exact product range `82145ce..091e268` with `P1=0 P2=0 P3=0`. It repeated
  focused validation, accepted the complete policy, and independently verified
  the `v0.208.0` route-array equality and provenance-only live drift.
- S2 is complete. The session stops here; S3 requires fresh explicit owner
  activation and is not authorized by Review `#070`.

## Validation commands

```bash
npm run test:holm-route-dispositions
npm run test:holm-route-registry
npm run test:source
npm run ci
node scripts/refresh-holm-route-registry.mjs --check-live --holm-bin "$(command -v holm)"
git diff --check
```

The live command is expected to report only `v0.208.0` provenance drift while
that newer installed release remains active; direct read-only comparison proves
its route array equals the pinned 261 rows.

## Boundaries

- SDK repository is the sole write target for S2.
- Holm remains read-only authority; exact S2 decisions pin released commit
  `d6662867…`, with read-only `v0.208.0` drift evidence recorded above.
- Do not contact, upgrade, restart, or inspect `@zyt` for SDK refresh work.
- Do not implement S3 methods, publish npm, tag, release, deploy, or change the
  package version.
- Work serially on SDK `main`; preserve unrelated work if any appears.

## Sources

- Holm `koder/issues/633_route_registry_export/INDEX.md`
- Holm `knowledge-base/workflows/holm-binary/cli-api-design.md`
- Holm `koder/analysis/826_sdk_parity_and_html_over_ws/INDEX.md`
- SDK `koder/evidence/004_issue008_admin_routes/route-audit.json`
- SDK `scripts/check-admin-api.mjs`
- SDK `scripts/check-admin-holm-authority.mjs`
- SDK `koder/docs/HOLM_SOURCE_MAP.md`
