---
plan_family: 001
slice: S15
title: Mutation Resources And Optimistic Rollback
owning_issue: 006
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: [S14]
queue: 001_a2_core_foundation
---

# Plan 001 S15: Mutation Resources And Optimistic Rollback

Capability: Add mutation resources with copied optimistic updates, rollback, explicit invalidation, and payload/error inference.

## Preflight

- Build on: S14 queries plus S11 invalidation hooks.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: mutation lifecycle, optimistic copy, rollback, invalidation, canonical-data safety, and type inference tests fail. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: mutation primitives, copied optimistic values, rollback, declared invalidations, payload/result/error inference.
- Refactor: keep optimistic policy explicit; couple to queries only through invalidation hooks.

## Expected Paths And Budget

- Paths: `src/state/mutation.ts, src/state/index.ts, test/state/mutation.test.ts, test/types/state-mutation.test-d.ts, dist/**`.
- Diff budget: 550-950 LOC plus dist.

## Final Validation

- `npm run ci`; `npm run test:source -- mutation`; `npm run test:types`; `npm run test:dist`; `npm run size`

## Acceptance Criteria

- optimistic updates are rollback-safe; inference survives declarations; failures do not corrupt canonical data.

## Stop Or Split Rules

- Stop if app/admin taxonomy is needed; split if type inference dominates behavior.

## Defers And Non-Goals

- Endpoint-specific mutations, framework hooks, job cancellation, CRDT semantics.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 100m; risk medium-high; ambiguity medium; harnex-chain; 7-14 files / 550-950 LOC plus dist.
