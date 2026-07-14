---
title: A2R S06 - Integrated authority return and final gate
status: approved
issue: 016
plan: 002
slice: S06
finding: integrated
review: 025
approval_review: 026
owner: sdk-core
depends_on: [S01, S02, S03, S04, S05]
---

## Capability

Run the integrated remediation return path after S01-S05 are independently reviewed and merged: verify complete source/generated artifact quality gates, provenance consistency, and readiness for fresh independent SDK review and fresh Holm authority acceptance.

## Authority and build-on evidence

- Build-on source: accepted implementation/reviews for S01-S05.
- Required final acceptance references: `koder/reviews/024_a2_holm_authority_conformance/INDEX.md`, `koder/issues/016_a2_authority_conformance_remediation/INDEX.md`, queue `#002` done-state requirements.
- Provenance requirement includes dist/source commit alignment and Issue `#005` migration evidence completeness.

## Prerequisites

- S01-S05 all status `done` with independent implementation reviews showing zero unresolved P1/P2.
- Queue row dependencies satisfied and owner launch gate explicitly authorized separately.

## Write ownership (bounded)

- `koder/reviews/` new independent SDK remediation review artifact (next available number)
- `koder/reviews/` fresh Holm authority acceptance review artifact (next available number)
- `koder/issues/016_a2_authority_conformance_remediation/INDEX.md` (status/slices_done/acceptance checklist updates)
- `koder/queue/002_a2r_authority_conformance/INDEX.md` (row status transitions and done-state notes)
- Product/test source edits are not owned by this integration slice; those belong to S01-S05.

## Strict TDD plan (red -> green -> refactor)

For this integration slice, strict TDD means validation-first with no new feature code:

1. Red: run full gates expecting failures if any prior slice left regressions.
2. Green: only integrate already-reviewed fixes from prior slices until gates pass.
3. Refactor: reduce incidental complexity/documentation drift discovered during integrated run, without altering accepted behavior.

## First failing assertion/check (must fail first if defects remain)

- Run complete CI gate from clean checkout and capture first failing command.
- If all gates pass immediately, record that red phase was satisfied earlier by slice-level work and attach prior failing evidence links.

## Integrated validation commands (real scripts only)

- `npm run test:source`
- `npm run test:types`
- `npm run test:declarations`
- `npm run test:dist`
- `npm run test:coverage`
- `npm run check:repro`
- `npm run check:licenses`
- `npm run size`
- `npm run ci`

## Diff budget

- Integration metadata/docs updates <= 180 changed lines.
- No new product logic unless independently reviewed and explicitly attributed to unresolved S01-S05 remediation.

## Acceptance criteria

- Full validation suite passes from clean, synced checkout.
- Dist/source provenance contract is reconciled and evidenced.
- Independent SDK remediation review returns no P1/P2 findings.
- Fresh Holm authority acceptance at named current Holm commit confirms A2 accepted.
- Queue `#002` done-state gates are met; Issue `#007` remains blocked until explicit owner authorization.

## Verification evidence to attach in implementation review

- Exact command log with exits for full gate list.
- Clean/synced git proof before/after integration.
- Links to independent SDK review and Holm authority acceptance artifacts.
- Updated Issue `#016` checklist showing closure evidence by slice.

## Deferred / non-goals

- Starting Issue `#007+` planning/implementation.
- Any release/publish/tag/deploy action.
- Altering Queue `#001` historical records.

## Stop rules

Stop and escalate if:

- Any full-gate failure requires new scope outside S01-S05 authorized remediation.
- Independent review or Holm authority acceptance is unavailable.
- Owner launch gate/authorization is missing or ambiguous.
