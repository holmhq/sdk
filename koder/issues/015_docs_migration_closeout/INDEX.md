---
status: open
priority: P1
created: 2026-07-13
updated: 2026-07-13
tags: docs, migration, conformance, examples, closeout
parent: 001
depends_on: [002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 014]
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

## Scope

- final README and architecture/API/runtime/framework guides;
- source-linked migration ledger for every existing Holm SDK/state namespace;
- supported/deferred/future capability matrix by runtime/surface;
- BFBB, vanilla, React, Angular, Svelte, and Vue examples;
- CLI/action, realtime, and collaboration extension examples with honest
  capability gates;
- conformance refresh against a named current Holm commit;
- dependency/license and bundle-size report;
- operator guide for vendoring/updating/verifying jsDelivr GitHub artifacts;
- contribution, security, release-readiness, and cross-repo issue workflow;
- proposed (not automatically applied) Holm template/docs migration notes;
- umbrella slice reconciliation and handoff.

## Acceptance Criteria

- [ ] A new human/agent can clone, run checks, build, vendor, and use a fixture
      from README/docs without chat history.
- [ ] Every current `packages/holm-sdk` and `packages/holm-state` public surface
      is marked migrated, redesigned, deferred, or intentionally rejected with
      evidence.
- [ ] Runtime matrix distinguishes shipped web/Node/test support from reserved
      desktop/mobile and missing Holm capabilities.
- [ ] Framework examples share one semantic resource/action contract.
- [ ] Realtime docs distinguish ephemeral delivery from authoritative reconcile;
      collaboration docs distinguish oplog/CRDT models.
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
