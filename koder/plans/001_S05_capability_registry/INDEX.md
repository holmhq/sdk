---
plan_family: 001
slice: S05
title: Capability Registry And Negotiation
owning_issue: 004
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: [S04]
queue: 001_a2_core_foundation
---

# Plan 001 S05: Capability Registry And Negotiation

Capability: Add immutable offers/subscriptions and fail-closed namespaced major/minor capability negotiation with typed errors.

## Preflight

- Build on: S04 error and serialization foundation.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: missing ID, major mismatch, minor too low, duplicate offers, immutability, and subscription tests fail. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: capability IDs, offer snapshots, requirement matching, highest minor selection, typed errors, subscriptions.
- Refactor: route errors through S04; avoid Holm-version sniffing and mutable globals.

## Expected Paths And Budget

- Paths: `src/core/capabilities.ts, src/core/errors.ts, test/core/capabilities.test.ts, test/types/**, dist manifests`.
- Diff budget: 450-800 LOC.

## Final Validation

- `npm run ci`; `npm run test:source -- capabilities`; `npm run test:types`; `npm run test:dist`

## Acceptance Criteria

- same-major/min-minor matching works; failures happen before invocation; snapshots are immutable/subscription-safe.

## Stop Or Split Rules

- Stop if canonical Holm IDs are required; split runtime discovery protocol work.

## Defers And Non-Goals

- Runtime invocation, transport manifests, actions, realtime/private support.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 90m; risk medium; ambiguity low; harnex-light; 5-10 files / 450-800 LOC.
