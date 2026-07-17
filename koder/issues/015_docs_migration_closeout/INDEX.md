---
status: open
priority: P1
created: 2026-07-13
updated: 2026-07-17
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

- [ ] A new human/agent can clone, run checks, build, vendor, and use a fixture
      from README/docs without chat history.
- [ ] Every current `packages/holm-sdk` and `packages/holm-state` public surface
      is marked migrated, redesigned, deferred, or intentionally rejected with
      evidence.
- [ ] Runtime matrix distinguishes shipped web/Node/test support from reserved
      desktop/mobile and missing Holm capabilities.
- [ ] Vanilla and React examples share one semantic resource/action contract.
- [ ] BFBB update instructions use immutable SHA/tag URLs and integrity hashes.
- [ ] Full validation suite passes from a clean checkout and generated artifacts
      match the committed build manifest.
- [ ] MIT/dependency license review passes.
- [ ] npm remains private/unpublished unless a new explicit decision says
      otherwise.
- [ ] No old Holm package is deleted; future cutover work is separately scoped.
- [ ] Issue 001 ledger and `koder/STATE.md` accurately describe completed and
      deferred work.

## Non-Goals

- npm publication.
- Holm release/deployment.
- Deleting or redirecting existing Holm packages.
- Claiming future desktop/mobile, private realtime, or CRDT server capabilities
  as live.
