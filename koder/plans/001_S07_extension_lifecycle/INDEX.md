---
plan_family: 001
slice: S07
title: Extension Graph And Lifecycle
owning_issue: 004
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: [S06]
queue: 001_a2_core_foundation
---

# Plan 001 S07: Extension Graph And Lifecycle

Capability: Seal extension IDs/namespaces with versioned dependencies, conflicts, deterministic ordering, rollback, and reverse disposal.

## Preflight

- Build on: S05 capability requirements and S06 runtime types.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: duplicate IDs/namespaces, incompatible deps, cycles, conflicts, ordering, rollback, disposal, and readonly namespace fixtures fail. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: extension validation, stable topological order, setup/start, rollback, aggregate disposal, frozen APIs.
- Refactor: separate graph validation from lifecycle; avoid global registry and last-wins merge.

## Expected Paths And Budget

- Paths: `src/core/extensions.ts, src/core/lifecycle.ts, test/core/extensions.test.ts, test/types/**, dist manifests`.
- Diff budget: 650-1000 LOC.

## Final Validation

- `npm run ci`; `npm run test:source -- extensions`; `npm run test:types`; `npm run test:dist`

## Acceptance Criteria

- one owner per namespace; dependency failures happen before side effects; start/dispose order is deterministic.

## Stop Or Split Rules

- Stop if generic plugin typing exceeds 120m; split framework/CRDT provider work out.

## Defers And Non-Goals

- Concrete extensions, framework bindings, collaboration providers, actions.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 120m; risk high; ambiguity medium; harnex-chain; 7-15 files / 650-1000 LOC.
