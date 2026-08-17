---
status: open
priority: P1
created: 2026-08-13
updated: 2026-08-17
tags: holm, routes, registry, parity, admin, drift, generation
type: feature
issue_kind: track
slice_count: 4
slices_done: 3
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
approved S1, the owner explicitly activated **S2** in a fresh session. S2 was
route-policy work only and stopped after independent Review `#070` approved its
disposition checkpoint. On 2026-08-16 the owner explicitly activated **S3** in
a fresh session. S3 was limited to the two approved stable retention contracts
and stopped after independent Review `#071` approved it. On 2026-08-17 the owner
explicitly activated **S4** as a mapping-only window. S4 may write SDK-side
evidence and validation, but it must stop before public API implementation,
release work, or any cross-repository write.

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
| S3: approved stable parity | complete | TDD implementation of the two owner-approved stable retention methods/types and tracked generated artifacts | Review `#071` approved; stop before S4/release work |
| S4: non-HTTP parity map | changes requested — Review `#072` | WebSocket frames, Sobek `holm.*` namespaces, Node capabilities, and action/schema authority that HTTP routes cannot describe | Remediate `P2=4 P3=1`, rerun pinned validation, and obtain fresh independent review; stop before public API implementation, release, or cross-repository writes |

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
- S2 is complete. Review `#070` did not authorize S3; the owner separately
  activated S3 on 2026-08-16.

## S3 execution contract — activated 2026-08-16

S3 promotes only the two reviewed stable retention identities. It must:

- add `system.dbRetentionStatus` and bodyless `system.dbRetentionRun` to the
  canonical admin inventory without admitting any other S2 delta route;
- expose readonly TypeScript contracts pinned to Holm
  `DBRetentionStatus`/`DBRetentionReport`, including the remote literals
  `dry_run: true` and `applied: false`;
- expose no public request body, apply, or force input and reject a low-level
  retention body before runtime invocation while retaining Holm's independent
  server-side rejection;
- update the disposition state from two candidates to two current identities,
  retaining exact authority and `sdk#019/S3` provenance;
- regenerate all affected tracked JavaScript, declarations, maps, manifests,
  bundles, package smoke, and size evidence; and
- stop after full validation and one independent SDK remediation review. S4,
  version/release/publication/deployment, Holm writes, and Medialab writes remain
  excluded.

S3 RED evidence is recorded in
[`test/evidence/issue019-s3-red.md`](../../../test/evidence/issue019-s3-red.md).

### S3 acceptance criteria

- [x] Source, type, disposition, declaration, and tracked-ESM RED failures were
      observed before implementation.
- [x] Only the two accepted stable retention methods are generated.
- [x] Exact readonly response types and bodyless dry-run semantics are covered.
- [x] Focused checks, full `npm run ci`, package smoke, size, reproducibility,
      live read-only Holm authority, and diff hygiene pass.
- [x] All affected tracked `dist/**` artifacts are regenerated and ready for
      independent review.
- [x] One independent SDK remediation review approves the exact S3 range with
      no unresolved findings.
- [x] The reviewed S3 checkpoint is committed and the session stops before S4
      or release work.

## S3 implementation checkpoint — 2026-08-17

- Strict RED covered missing source methods/types, absent disposition promotion,
  stale tracked declarations/ESM, and the initially over-broad low-level
  `admin.invoke()` input.
- The admin ledger now pins signed Holm `v0.207.0` and contains 176 keys, 191
  route/method contracts, 218 generated methods, and the same 18 exclusions.
  Only `system.dbRetentionStatus` and `system.dbRetentionRun` were added.
- `AdminDBRetentionStatus` and `AdminDBRetentionReport` mirror the pinned Holm
  JSON authority. Nested contracts are readonly; the remote report fixes
  `dry_run: true` and `applied: false`.
- Both generated methods expose only bodyless operation controls. Literal
  low-level invocation is narrowed too, and runtime descriptor enforcement
  rejects any body before adapter invocation for JavaScript/dynamic callers.
- The disposition ledger remains complete at 261 identities: 187 current, no
  S3 candidates, and 74 unimplemented; all 19 other admin-delta rows remain
  deferred.
- Focused admin/disposition/type/declaration/dist checks pass; source tests pass
  231/231; `npm run build`, full `npm run ci`, 267-artifact reproducibility,
  package install smoke (290 files), licenses, coverage, and size
  (297,073 raw / 226,805 minified / 58,616 gzip bytes) are green.
- Fresh read-only Holm authority passed at `97ed1f29…`: 176/191/218/18 matches
  the ledger and relevant files are unchanged from `d6662867…`. Installed
  signed Holm `v0.208.0` still differs from the snapshot by provenance only.
- No package version, release, publication, deployment, Holm source, Medialab,
  or `@zyt` change was made. Independent S3 review remained the stop gate.

## S3 outcome — 2026-08-17

- Independent Review
  [`#071`](../../reviews/071_issue019_s3_retention_parity/INDEX.md) approved
  exact product range `914a1e2..c7e589b` with `P1=0 P2=0 P3=0`.
- The reviewer independently verified the two-method scope, exact readonly Holm
  contracts, bodyless pre-runtime rejection, complete route disposition,
  generated package artifacts, and pinned read-only Holm authority.
- Focused validation and full `npm run ci` passed in the fresh review session.
  S3 is accepted and stops here; S4, release, publication, deployment, and
  cross-repository writes remain separately owner-gated.

## S4 execution contract — activated 2026-08-17

S4 is a source-conformance and disposition slice, not a product implementation
slice. It must:

- pin one exact clean live Holm commit and cite source paths for every claim;
- map authenticated WebSocket handshake/frame behavior, injected Sobek
  `holm.*` namespaces, node/runtime capability truth, and action/schema
  authority that the HTTP route registry cannot encode;
- distinguish runtime authority from docs/design intent and distinguish current
  SDK behavior from candidate, deferred, excluded, or unsupported behavior;
- record auth/caller, wire, lifecycle, and availability limits wherever source
  proves them, without inferring support from a route or platform version;
- keep the evidence deterministic and fail closed on missing source identity,
  duplicate map identity, unknown vocabulary, or incomplete required lanes; and
- change no public `src/**`, tracked `dist/**`, package version, release,
  publication, deployment, Holm source, Medialab, or `@zyt` state.

The S4 stop gate is a validated, committed mapping checkpoint. Any resulting
public SDK API or capability implementation requires a separately activated
slice and fresh RED evidence.

### S4 acceptance criteria

- [x] Focused RED evidence exists before the validator implementation.
- [x] One exact clean Holm source commit and every relied-on source byte are
      pinned independently of the moving peer checkout.
- [x] WebSocket, Sobek, node/capability, and action/schema lanes are all present
      with unique deterministic identities and explicit auth, wire, lifecycle,
      availability, disposition, and SDK status.
- [x] The map distinguishes implementation, SDK implementation, offline
      fixture, converged design, and negative evidence authority.
- [x] Current Holm manifest strings are not misrepresented as versioned SDK
      capability offers.
- [x] Holm Issue `#534` supersession of the standalone CLI action-registry model
      is reflected without inventing production discovery support.
- [x] Focused tests, source tests, full `npm run ci`, pinned read-only Holm
      verification, and diff hygiene pass.
- [x] No public `src/**`, tracked `dist/**`, version, release, publication,
      deployment, Holm, Medialab, or `@zyt` change was made.
- [ ] One independent SDK mapping review with fresh read-only Holm-authority
      verification approves the S4 checkpoint with no unresolved findings.

## S4 mapping checkpoint — 2026-08-17

- Evidence
  [`#009`](../../evidence/009_holm_non_http_parity/INDEX.md) resolves 47 exact
  identities: 9 WebSocket, 21 Sobek, 10 node/capability, and 7 action/schema.
  Disposition is 2 adopted, 12 redesigned, 31 deferred, and 2 excluded; SDK
  status is 4 current, 1 partial, 9 candidate, 26 none, and 7 unsupported.
- Holm now has authenticated private/presence subscriptions, policy gates, and
  sender-excluded whispers, but the exact source also proves legacy bare public
  channels, lossy queues, newline-coalesced text envelopes, source-specific
  presence fanout, and no binary/replay/general-client-publish contract. The SDK
  still has no production realtime transport.
- Twenty grouped injected Holm host surfaces are distinct from the current
  two-operation, not-production SDK Sobek preview seam. They remain deferred;
  no broad Sobek support claim or generated API was created.
- The SDK Node adapter still offers only `holm.http.app@1.0` and
  `holm.http.admin@1.0`. Holm manifest grants remain unversioned internal inputs
  to compound runtime authorization and are not SDK offers.
- Issue `#534` makes schema-described GET/POST canonical and supersedes a
  separate CLI-owned action transport. Holm's offline Default Projection
  fixture is a future conformance candidate; live registry/discovery, generic
  CLI, generated actions, and an independent state/query registry remain
  unsupported.
- The deterministic checker rejects provenance, source, vocabulary, identity,
  ordering, summary, expected-absence, and SDK drift. Optional pinned/live modes
  verify Holm Git/source authority without requiring Holm in normal CI.
- Focused tests pass 4/4, source tests pass 231/231, full `npm run ci`, package
  smoke, coverage, licenses, size, pinned Holm verification, and diff hygiene
  are green. A later live check correctly detected unrelated concurrent Holm
  route-registry work; S4 retained the previously observed clean `44d51d0f…`
  snapshot and did not ingest dirty peer state.
- The mapping reached its first review checkpoint. Public implementation,
  release, deployment, and cross-repository writes remain outside S4.

## S4 independent review — changes requested 2026-08-17

- Independent Review
  [`#072`](../../reviews/072_issue019_s4_non_http_parity/INDEX.md) assessed exact
  product range `c06f98f..d941db5` and returned `NEEDS_FIXES` with
  `P1=0 P2=4 P3=1`.
- Material findings are: overstated authorization across grouped
  `holm.admin.roles.*` operations; omitted typed-channel
  `realtime.max_channels_per_socket` behavior; false all-context availability
  for logged-out member media methods; and incomplete fail-closed provenance /
  authority-status validation. Direct Default Projection payload verification
  is a P3 hardening item.
- Focused tests, 231 source tests, full `npm run ci`, diff hygiene, and fresh
  pinned Holm verification all pass. Those green mechanical gates do not resolve
  the source-truth findings.
- S4 and Issue `#019` remain open. Remediation stays mapping/tooling-only and
  requires a fresh independent review before acceptance or resolution.

## Validation commands

```bash
npm run test:holm-route-dispositions
npm run test:holm-route-registry
npm run test:holm-non-http-parity
npm run test:source
npm run ci
node scripts/check-holm-non-http-parity.mjs --check-pinned --holm-root ~/Projects/holmhq/holm/master
node scripts/refresh-holm-route-registry.mjs --check-live --holm-bin "$(command -v holm)"
git diff --check
```

The live command is expected to report only `v0.208.0` provenance drift while
that newer installed release remains active; direct read-only comparison proves
its route array equals the pinned 261 rows.

## Boundaries

- Review `#072` requested S4 remediation; SDK-side evidence/tooling remains the
  only write scope.
- Holm remains read-only authority; S4 must pin the exact clean source commit it
  verifies rather than silently treating the HTTP registry as non-HTTP truth.
- Do not contact, upgrade, restart, or inspect `@zyt` for SDK refresh work.
- Do not change public SDK source, generated API, `dist/`, package version,
  publish npm, tag, release, deploy, or write another repository in S4.
- Work serially on SDK `main`; preserve unrelated work if any appears.

## Sources

- Holm `koder/issues/633_route_registry_export/INDEX.md`
- Holm `knowledge-base/workflows/holm-binary/cli-api-design.md`
- Holm `koder/analysis/826_sdk_parity_and_html_over_ws/INDEX.md`
- SDK `koder/evidence/004_issue008_admin_routes/route-audit.json`
- SDK `scripts/check-admin-api.mjs`
- SDK `scripts/check-admin-holm-authority.mjs`
- SDK `koder/docs/HOLM_SOURCE_MAP.md`
