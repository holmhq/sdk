---
plan_family: 001
slice: S03
title: Reproducibility CI Size And License
owning_issue: 003
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: [S02]
queue: 001_a2_core_foundation
---

# Plan 001 S03: Reproducibility CI Size And License

Capability: Complete Issue #003 with reproducibility, coverage, size, license, CI, and README command proof.

## Preflight

- Build on: S02 generated artifacts and smoke harness.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: repro/diff, license, size, and coverage expectations fail before scripts/reports exist. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: clean rebuild/diff validation, coverage, raw/minified/gzip size, MIT license check, CI, README commands.
- Refactor: collapse validations into canonical `npm run ci`; keep reports deterministic and policy-compliant.

## Expected Paths And Budget

- Paths: `package scripts, README.md, .github/workflows/ci.yml, scripts/**, dist manifests/reports, coverage config`.
- Diff budget: 350-700 LOC plus reports.

## Final Validation

- `npm run ci`; `npm run check:repro`; `npm run check:licenses`; `npm run size`

## Acceptance Criteria

- generated drift is detected; CI covers all Issue #003 checks; README matches scripts; package remains private.

## Stop Or Split Rules

- Stop on credential/release/cloud need; split license or repro tooling if either approaches 120m.

## Defers And Non-Goals

- Core capabilities, transports, resources, release, npm publish, Issue #007+.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 90m; risk medium; ambiguity low; harnex-light; 8-18 files / 350-700 LOC plus reports.
