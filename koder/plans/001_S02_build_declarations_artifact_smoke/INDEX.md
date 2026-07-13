---
plan_family: 001
slice: S02
title: Build Declarations And Artifact Smoke
owning_issue: 003
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: [S01]
queue: 001_a2_core_foundation
---

# Plan 001 S02: Build Declarations And Artifact Smoke

Capability: Add deterministic ESM/declaration output and prove declaration consumers plus generated bundles execute against the S01 fixture.

## Preflight

- Build on: S01 green commit and source/type scripts.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: declaration-consumer and generated-bundle smoke fixtures fail before emitted output exists. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: deterministic ESM build, declarations, source maps, source tests, declaration consumer, dist smoke harness.
- Refactor: factor reusable fixtures; remove timestamps and host-specific paths.

## Expected Paths And Budget

- Paths: `build config, src/index.ts, dist/**, test/declarations/**, test/dist/**, package exports`.
- Diff budget: 400-800 LOC plus dist.

## Final Validation

- `npm run build`; `npm run test:declarations`; `npm run test:dist`; `npm run typecheck:core`

## Acceptance Criteria

- ESM/declarations/source maps emit deterministically; consumer imports declarations only; dist smoke runs from generated files.

## Stop Or Split Rules

- Stop on non-MIT/heavy build dependency; split if multiple runtime artifacts are needed first.

## Defers And Non-Goals

- Repro diff checks, CI, size budgets, real capabilities.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 105m; risk medium; ambiguity medium; harnex-chain; 10-20 files / 400-800 LOC plus dist.
