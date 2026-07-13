---
plan_family: 001
slice: S13
title: State Resource Lifecycle
owning_issue: 006
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: [S12]
queue: 001_a2_core_foundation
---

# Plan 001 S13: State Resource Lifecycle

Capability: Start canonical `@holmhq/sdk/state` with resource snapshot, subscription, disposal lifecycle, and referential stability.

## Preflight

- Build on: Reviewed Issue #005; `/state` remains the only public resource entry point.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: snapshot phase, referential stability, notification, unsubscribe/dispose, listener diagnostics, and declaration import tests fail. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: framework-neutral resource primitive, immutable revisioned snapshots, state subpath exports, copied values.
- Refactor: separate base lifecycle from queries/mutations; avoid `/resources` alias and legacy names.

## Expected Paths And Budget

- Paths: `src/state/resource.ts, src/state/index.ts, test/state/resource.test.ts, test/types/state.test-d.ts, package exports, dist/**`.
- Diff budget: 550-900 LOC plus dist.

## Final Validation

- `npm run ci`; `npm run test:source -- state`; `npm run test:declarations`; `npm run test:dist`; `npm run size`

## Acceptance Criteria

- `@holmhq/sdk/state` is canonical; snapshots are immutable/stable; lifecycle is deterministic and framework-neutral.

## Stop Or Split Rules

- Stop if `/resources` or legacy exports are requested; split lifecycle from query loading.

## Defers And Non-Goals

- Query cache integration, mutations, derived resources, realtime, framework bindings.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 105m; risk medium-high; ambiguity low; harnex-chain; 7-14 files / 550-900 LOC plus dist.
