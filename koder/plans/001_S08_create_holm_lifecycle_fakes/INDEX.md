---
plan_family: 001
slice: S08
title: CreateHolm Lifecycle And Fakes
owning_issue: 004
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: [S07]
queue: 001_a2_core_foundation
---

# Plan 001 S08: CreateHolm Lifecycle And Fakes

Capability: Complete universal core with `createHolm`, lifecycle, cancellation/timeout, deterministic fakes, isolation, and artifact proof.

## Preflight

- Build on: S04-S07 core foundations.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: lifecycle transitions, idempotent start/dispose, rollback, cancellation, timeout, two-instance isolation, and export fixtures fail. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: `createHolm`, fake clock/scheduler, in-memory adapter, cancellation signals, timeouts, root/test exports.
- Refactor: tighten transitions after green; keep fake utilities in test subpath only.

## Expected Paths And Budget

- Paths: `src/core/create-holm.ts, src/core/lifecycle.ts, src/core/cancellation.ts, src/test/**, test/core/**, dist/**`.
- Diff budget: 700-1100 LOC plus dist.

## Final Validation

- `npm run ci`; `npm run test:source -- lifecycle`; `npm run test:declarations`; `npm run test:dist`; `npm run size`

## Acceptance Criteria

- instances isolate state; cancellation/timeout use injected services; Issue #004 ESM/declaration evidence passes.

## Stop Or Split Rules

- Stop if HTTP or `/state` behavior is needed; split lifecycle or fakes if either exceeds 120m.

## Defers And Non-Goals

- Transport/cache/auth, resources, actions, app/admin, release.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 120m; risk high; ambiguity medium; harnex-chain; 10-20 files / 700-1100 LOC plus dist.
