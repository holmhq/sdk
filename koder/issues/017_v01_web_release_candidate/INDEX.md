---
status: open
priority: P1
created: 2026-07-17
updated: 2026-07-17
tags: release-candidate, v0.1-web, bfbb, api-freeze, distribution
parent: 001
depends_on: [007, 009, 014]
type: feature
issue_kind: track
slice_count: 8
slices_done: 0
planning_status: approved
plan_review: ../../reviews/049_w4_v01_web_plan_review/INDEX.md
context: Prepare a private v0.1-web release-candidate code/artifact state without publishing, tagging, deploying, or claiming production pilot proof.
---

# Issue 017: v0.1-web Release Candidate Track

## Problem

The SDK now has completed web/app and runtime-adapter foundations, but it does
not yet have a narrow, frozen, distribution-ready v0.1-web release-candidate
state. The next window must turn the completed foundation into a private
`0.1.0-rc.1` code/artifact checkpoint that BFBB consumers can vendor from an
immutable commit while preserving honest support labels, API compatibility
rules, credential-safe diagnostics, reproducible artifacts, and external review
gates.

## Locked owner decisions

- Target state is private `0.1.0-rc.1`: a release-candidate code/artifact
  checkpoint, not npm publication, production proof, a tag, or a deployment.
- A separately authorized real-app pilot follows the queue; owner-present
  promotion to `0.1.0` is later and out of scope here.
- No push, tag, npm publish, release, deploy, credential use, cloud/production
  mutation, worktree, or cross-repository write is authorized.
- Node `>=20` remains the package build/tooling floor. Raw vendored BFBB has no
  Node runtime dependency.
- Distribution remains immutable commit-pinned/vendored ESM; `package.json`
  remains private.
- Real browser/vendor soak is a post-RC pilot gate and cannot be claimed by this
  track.

## Support matrix and status labels

Stable/frozen throughout `0.1.x`:

| Entry point | Status | Compatibility rule |
| --- | --- | --- |
| `@holmhq/sdk` | stable | No breaking removal, rename, or behavioral contract change in `0.1.x`; additive changes only. |
| `@holmhq/sdk/core` | stable | Same stable rule; no DOM/Node ambient type leakage. |
| `@holmhq/sdk/transports` | stable | Same stable rule; credentials remain adapter/private and redacted by contract. |
| `@holmhq/sdk/app` | stable | Same stable rule for adopted app/auth/link/upload/surface contracts. |
| `@holmhq/sdk/web` | stable | Same stable rule for browser/BFBB web runtime and convenience composition. |
| `@holmhq/sdk/state` | stable | Same stable rule for framework-neutral resource/query/mutation contracts. |
| `@holmhq/sdk/test` | stable | Same stable rule for deterministic conformance/test seams. |

Preview, shipped/tested but not frozen: `@holmhq/sdk/node` and
`@holmhq/sdk/sobek`. They must be labelled preview in declarations, docs,
examples, and package smokes. `/node` remains preview because Node 20/22/24
compatibility and higher-level CLI ergonomics are not frozen.

Reserved, not production: `@holmhq/sdk/bridge`. It may expose mailbox/mock
contracts and service slots only; desktop/mobile production runtimes remain
unavailable.

Unavailable in v0.1-web: admin, actions/generated CLI, realtime,
collaboration, framework bindings, production desktop/mobile, and arbitrary
SSR.

## Capability-based web baseline

The v0.1-web baseline is capability-based rather than browser-brand-based:
modern ESM loading from vendored files; Fetch-compatible request/response
services for web runtime use; URL/headers/body primitives required by adopted
web/app helpers; optional upload primitives only when upload helpers are used;
and static-file serving for raw BFBB fixtures. The baseline does not promise
framework SSR, future native shells, realtime, collaboration, admin, generated
CLI, or vendor-specific browser soak. Pilot soak records real app/browser
results after this track stops.

## Context

- Builds on resolved Issue `#007` web/app client and resolved Issue `#009`
  runtime/surface adapters.
- Depends on open Issue `#014` for BFBB distribution. Plans `004_S05` and
  `004_S06` are the intended thin implementation slices that satisfy Issue
  `#014`'s bundle, manifest, integrity, offline vendoring, and compatibility
  fixture acceptance gates without duplicating `#014` as a separate source of
  truth.
- Broad Issue `#015` remains future documentation/migration closeout. This
  track writes only the scoped v0.1-web RC metadata and handoff needed for the
  narrow release candidate.
- Review `#033` left nine non-blocking P3 advisories; production-relevant
  credential/diagnostic advisories are promoted into this RC hardening track.
- Reviews `#046` and `#048` accepted Issue `#009` with zero P1/P2/P3 at SDK
  commit `f06d1c0` and Holm `fb34d6b768f15f9bc596e0b82430e5c678fd2088`
  (`v0.185.0`). Fresh RC review and Holm-authority acceptance are still
  required.
- Architecture decisions `D013`/`D014` remain the export/distribution authority:
  explicit subpaths, reproducible SHA-addressed ESM artifacts, no framework/CRDT
  runtimes in bundles, no mutable `@main`, npm private.

## Execution direction

The owner authorized blind Queue `#005` on 2026-07-17. Execute the eight thin
plans in family `004` serially on `main`. Each product slice follows strict red
-> green -> refactor, owns generated artifacts when public source changes, and
stops rather than changing support status, adding dependencies, claiming
browser/pilot proof, or taking release actions.

## Slice ledger

| Slice | Status | Ref | Queue | Closure gate |
| --- | --- | --- | --- | --- |
| Stable API inventory and freeze gate | queued | [`004_S01`](../../plans/004_S01_stable_api_inventory_freeze_gate/INDEX.md) | `005` | Deterministic stable export/declaration manifest and drift test pass. |
| Preview/reserved boundary enforcement | queued | [`004_S02`](../../plans/004_S02_preview_reserved_boundary_enforcement/INDEX.md) | `005` | Preview/reserved labels and import-isolation smokes pass. |
| Credential/diagnostic P3 hardening | queued | [`004_S03`](../../plans/004_S03_credential_diagnostic_p3_hardening/INDEX.md) | `005` | Review `#033` advisories 1-4 fixed/tested or explicitly bounded by approved contract. |
| Remaining edge-contract P3 disposition | queued | [`004_S04`](../../plans/004_S04_edge_contract_p3_disposition/INDEX.md) | `005` | Review `#033` advisories 5-9 fixed, tested, documented, or accepted with rationale. |
| Deterministic v0.1 web/BFBB bundles | queued | [`004_S05`](../../plans/004_S05_deterministic_web_bfbb_bundles/INDEX.md) | `005` | Issue `#014` bundle composition, maps/declarations/license/size/manifest gates pass. |
| Integrity, offline vendoring, and compatibility fixture | queued | [`004_S06`](../../plans/004_S06_integrity_offline_vendoring_fixture/INDEX.md) | `005` | Artifact hashes/tamper failure/offline vendored BFBB and Vite compatibility fixtures pass. |
| RC metadata, docs, upgrade/rollback contract | queued | [`004_S07`](../../plans/004_S07_rc_metadata_docs_upgrade_rollback/INDEX.md) | `005` | Private `0.1.0-rc.1` docs/metadata/support/rollback notes are accurate and non-release. |
| Integrated RC gate and owner handoff | queued | [`004_S08`](../../plans/004_S08_integrated_rc_gate_handoff/INDEX.md) | `005` | Four CI modes, reproducibility, review, fresh Holm acceptance, clean Git, and stop-before-pilot handoff pass. |

## Acceptance criteria

- [ ] Stable entry points have an exact public export/declaration inventory and
      deterministic drift gate; implementation-detail exports are blocked.
- [ ] Preview `/node` and `/sobek` plus reserved `/bridge` boundaries are
      labelled, typed, documented, and isolated from stable entry points.
- [ ] All nine Review `#033` P3 advisories are fixed, tested, documented, or
      explicitly accepted with bounded rationale.
- [ ] Issue `#014` is closed through the S05/S06 bundle and vendoring gates, not
      by redefining its acceptance criteria.
- [ ] `0.1.0-rc.1` metadata and docs clearly state private RC status, support
      matrix, compatibility policy, update/rollback workflow, and non-goals.
- [ ] Stable API compatibility policy is enforced for `0.1.x`: no breaking
      removal/rename/behavioral contract changes; additive changes only;
      deprecate before any future removal. Preview/reserved surfaces are
      explicitly exempt.
- [ ] Capability-based web baseline is documented; real browser/vendor soak is
      left to a separately authorized pilot.
- [ ] Full validation is green in normal, FORCE_COLOR, TAP, and TAP+color modes
      with identical required metrics; build reproducibility, declarations,
      dist, examples, size, license, API drift, and package smokes pass.
- [ ] Independent integrated SDK review reports zero P1/P2 findings and fresh
      read-only Holm authority acceptance reports zero P1/P2 at a named Holm
      commit.
- [ ] Git is clean after tracked artifacts and reports are committed; no push,
      tag, publish, release, deploy, credential, cloud/production, worktree, or
      Holm write occurred.

## Non-goals

- npm publication, package public release, tags, GitHub releases, push, deploy,
  production/cloud mutation, credential use, or release automation.
- Real-app pilot soak, promotion to `0.1.0`, browser/vendor compatibility claim,
  or production support declaration.
- Admin, actions/generated CLI, realtime, collaboration, framework bindings,
  production desktop/mobile, arbitrary SSR, or broad Issue `#015` closeout.
- Changing the stable/preview/reserved support matrix without owner approval.
- Editing Holm or any repository outside this SDK.

## Stop gates

Stop and return to the owner if the support matrix must change, a new dependency
or runtime/product/browser promise appears necessary, `0.1.0-rc.1` would require
any release action, Issue `#014` cannot be closed by thin S05/S06 slices, Holm
Issue `#534` authority drifts materially, full reproducibility cannot be proven,
or Git is dirty outside the owning issue/plan/product paths for the authorized
future implementation window.
