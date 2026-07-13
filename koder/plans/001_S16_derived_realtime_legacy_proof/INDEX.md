---
plan_family: 001
slice: S16
title: Derived Resources Reconcile And Legacy Disposition
owning_issue: 006
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: [S15]
queue: 001_a2_core_foundation
---

# Plan 001 S16: Derived Resources Reconcile And Legacy Disposition

Capability: Complete Issue #006 with derived resources, diagnostics/history seam, realtime reconcile hook boundary, legacy disposition, and artifact/type/size proof.

## Preflight

- Build on: S13-S15 state resources plus all A2 core/transport foundations.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: derived dependencies/disposal, diagnostics/history, realtime invalidate/reconcile hooks, and legacy disposition checks fail. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: derived resources, diagnostics/history seam, realtime reconcile boundary, legacy `holm-state` ledger, artifact proof.
- Refactor: keep realtime hooks capability-gated and non-durable; prepare A2 review evidence only.

## Expected Paths And Budget

- Paths: `src/state/derived.ts, src/state/diagnostics.ts, src/state/reconcile.ts, test/state/derived.test.ts, koder evidence ledger, dist/**`.
- Diff budget: 650-1050 LOC plus dist/ledger.

## Final Validation

- `npm run ci`; `npm run test:source -- state`; `npm run test:declarations`; `npm run test:dist`; `npm run size`

## Acceptance Criteria

- derived resources dispose correctly; realtime hook does not claim private/presence/collaboration; legacy ledger and artifact evidence are complete.

## Stop Or Split Rules

- Stop at A2 review gate before #007; split derived/diagnostics/ledger if >120m.

## Defers And Non-Goals

- Framework bindings, realtime extension, collaboration, app/admin migration, BFBB final distribution, npm release.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 120m; risk high; ambiguity medium; harnex-chain; 10-22 files / 650-1050 LOC plus dist.
