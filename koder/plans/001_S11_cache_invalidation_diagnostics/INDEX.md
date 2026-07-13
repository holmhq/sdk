---
plan_family: 001
slice: S11
title: Cache Invalidation And Diagnostics
owning_issue: 005
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: [S10]
queue: 001_a2_core_foundation
---

# Plan 001 S11: Cache Invalidation And Diagnostics

Capability: Add immutable cache returns, tag/prefix and mutation invalidation, hooks, diagnostics, and observable background SWR errors.

## Preflight

- Build on: S10 deterministic cache core.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: cache mutation, tag/prefix invalidation, mutation invalidation, diagnostics, and background error tests fail. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: clone/freeze public cache values, explicit invalidation, secret-safe diagnostics, observable SWR errors.
- Refactor: keep invalidation typed but endpoint-agnostic; reuse S04/S09 redaction rules.

## Expected Paths And Budget

- Paths: `src/transports/cache.ts, src/core/diagnostics.ts, test/transport/cache-invalidation.test.ts, test/transport/diagnostics.test.ts, dist manifests`.
- Diff budget: 500-850 LOC.

## Final Validation

- `npm run ci`; `npm run test:source -- cache`; `npm run test:source -- diagnostics`; `npm run test:dist`

## Acceptance Criteria

- public values cannot mutate canonical cache; invalidation is deterministic; SWR failures are observed without unhandled rejection.

## Stop Or Split Rules

- Stop if endpoint taxonomy is required; split diagnostics and invalidation if both need review.

## Defers And Non-Goals

- Resource subscriptions, app/admin ledgers, durable offline storage.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 90m; risk medium; ambiguity medium; harnex-light; 6-12 files / 500-850 LOC.
