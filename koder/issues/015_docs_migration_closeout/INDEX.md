---
status: resolved
priority: P1
created: 2026-07-13
updated: 2026-07-18
tags: docs, migration, conformance, examples, closeout
parent: 001
depends_on: [002, 003, 004, 005, 006, 007, 009, 014]
type: docs
issue_kind: slice
context: Close the foundation track with honest docs, source ownership, migration evidence, and runnable examples rather than deleting old packages.
---

# Issue 015: Documentation, Migration Ledger, and End-to-end Closeout

## Problem

A new SDK can be technically sound and still fail if app builders discover raw
fetch first, generated bundles drift, future capabilities look shipped, or two
repositories silently claim ownership. The foundation track needs an explicit
closeout rather than an npm release or old-code deletion.

## Scope (trimmed 2026-07-17, owner decision)

- final README: clone → check → build → vendor → use, without chat history;
- source-linked migration ledger for every existing Holm SDK/state namespace;
- supported/deferred/future capability matrix by runtime/surface;
- operator guide for vendoring/updating/verifying artifacts with immutable
  SHA/tag URLs and integrity hashes;
- one vanilla and one React example sharing one semantic resource/action
  contract (the sokoban pilot app may serve as the vanilla evidence);
- dependency/license and bundle-size report refresh from W4 outputs;
- Issue `001` ledger and `koder/STATE.md` reconciliation and handoff.

### Deferred out of this issue (2026-07-17 owner decision)

Angular/Svelte/Vue examples; CLI/action, realtime, and collaboration extension
examples; contribution/security/release-workflow docs; Holm template/docs
migration notes; conformance refresh (already pinned to Holm `748cbe5` in W4 —
refresh only when Holm moves). These follow demand, not the roadmap.

## Acceptance Criteria

- [x] A new human/agent can clone, run checks, build, vendor, and use a fixture
      from README/docs without chat history.
- [x] Every current `packages/holm-sdk` and `packages/holm-state` public surface
      is marked migrated, redesigned, deferred, or intentionally rejected with
      evidence.
- [x] Runtime matrix distinguishes shipped web/Node/test support from reserved
      desktop/mobile and missing Holm capabilities.
- [x] Vanilla and React examples share one semantic resource/action contract.
- [x] BFBB update instructions use immutable SHA/tag URLs and integrity hashes.
- [x] Full validation suite passes and generated artifacts match the committed
      build manifest.
- [x] MIT/dependency license review passes.
- [x] npm remained private/unpublished until the owner's explicit 2026-07-18
      promotion decision; public `@holmhq/sdk@0.1.0` is now published.
- [x] No old Holm package is deleted; future cutover work is separately scoped.
- [x] Issue 001 ledger and `koder/STATE.md` reconcile completed and deferred work.

## Closure evidence — 2026-07-18

- Product commit `396f991`; publish dry-run fix `9d855c5`.
- `README.md`, `docs/{v0.1,capabilities,migration,vendoring,agent-guide}.md`,
  vanilla/React examples, and tested package allowlist/install smoke are complete.
- Full `npm run ci` and `npm publish --dry-run --access public` pass;
  `@holmhq/sdk@0.1.0`, tag `v0.1.0`, and the GitHub release are live.
- Independent Review `#060` and narrow publish-gate Review `#061`: APPROVE,
  `P1=0 P2=0 P3=0`.
- Live Holm source `afe4057` has no `packages/holm-sdk` or
  `packages/holm-state` drift from accepted authority checkpoint `748cbe5`.

## Non-Goals

- Holm release/deployment.
- Deleting or redirecting existing Holm packages.
- Claiming future desktop/mobile, private realtime, or CRDT server capabilities
  as live.
