---
plan_family: 001
slice: S04
title: Wire Value And Error Foundation
owning_issue: 004
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: [S03]
queue: 001_a2_core_foundation
---

# Plan 001 S04: Wire Value And Error Foundation

Capability: Implement JSON/byte `WireValue` validation, copying, canonical encoding, and serializable error foundations.

## Preflight

- Build on: Issue #003 complete and reviewed.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: invalid values, mutable bytes, cycles/shared graphs, and unsafe serialized errors fail before implementation. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: `WireValue`, `ReadonlyBytes`, canonical key-sorted encoding, `$holm` bytes, `HolmError` serialization.
- Refactor: share helpers without exposing mutable internals; keep bytes dependency-free.

## Expected Paths And Budget

- Paths: `src/core/wire-value.ts, src/core/errors.ts, src/core/index.ts, test/core/**, test/types/**`.
- Diff budget: 500-900 LOC.

## Final Validation

- `npm run ci`; `npm run test:source -- wire-value`; `npm run test:types`; `npm run test:dist`

## Acceptance Criteria

- boundaries validate/copy; canonical encoding is stable; serialized errors are safe and redacted.

## Stop Or Split Rules

- Stop if D006/D011 need revision; split if binary framing beyond canonical JSON appears.

## Defers And Non-Goals

- HTTP payloads, CRDT codecs, capabilities, lifecycle, resources.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 100m; risk medium; ambiguity low; harnex-chain; 6-12 files / 500-900 LOC.
