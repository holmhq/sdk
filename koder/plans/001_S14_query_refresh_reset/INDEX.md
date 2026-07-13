---
plan_family: 001
slice: S14
title: Query Refresh And Caller Reset
owning_issue: 006
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: [S13]
queue: 001_a2_core_foundation
---

# Plan 001 S14: Query Refresh And Caller Reset

Capability: Add query loading, refresh, stale/error/cancellation/dedup behavior and caller/auth/source reset without data leakage.

## Preflight

- Build on: S13 lifecycle plus S10-S11 cache behavior.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: load/refresh/stale error/cancel/dedup/disposal and caller/auth/source reset leakage tests fail. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: query resource loader integration, stale/refreshing/error transitions, reset cancellation/partitioning.
- Refactor: hide cache internals behind resource lifecycle; use fake time and deterministic adapters.

## Expected Paths And Budget

- Paths: `src/state/query.ts, src/state/resource.ts, test/state/query.test.ts, test/state/caller-reset.test.ts, test/types/**, dist/**`.
- Diff budget: 650-1050 LOC plus dist.

## Final Validation

- `npm run ci`; `npm run test:source -- state`; `npm run test:types`; `npm run test:dist`; `npm run size`

## Acceptance Criteria

- queries expose correct transitions; caller/source changes do not leak data; subscribers share work and cleanup.

## Stop Or Split Rules

- Stop if Holm state schema must be invented; split reset and dedup if needed.

## Defers And Non-Goals

- Mutations, derived resources, realtime channels, framework bindings.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 120m; risk high; ambiguity medium; harnex-chain; 8-16 files / 650-1050 LOC plus dist.
