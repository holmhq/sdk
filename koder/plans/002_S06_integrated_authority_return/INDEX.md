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

Run the integrated remediation return path after S01-S05 implementation is complete: verify source/generated artifact quality gates and provenance, obtain one fresh integrated SDK review, then obtain fresh Holm-authority acceptance.

## Authority and build-on evidence

- Build-on source: accepted implementation/reviews for S01-S05.
- Required final acceptance references: `koder/reviews/024_a2_holm_authority_conformance/INDEX.md` and `koder/issues/016_a2_authority_conformance_remediation/INDEX.md`.
- Provenance requirement includes dist/source commit alignment and Issue `#005` migration evidence completeness.

## Prerequisites

- S01-S05 behavior and generated artifacts are complete with their declared validation green.
- No unresolved architecture or Holm-authority question remains.

## Write ownership (bounded)

- `koder/reviews/` new independent SDK remediation review artifact (next available number)
- `koder/reviews/` fresh Holm authority acceptance review artifact (next available number)
- `koder/issues/016_a2_authority_conformance_remediation/INDEX.md` (status/slices_done/acceptance checklist updates)
- Product/test/generated fixes discovered by integration return to their owning S01-S05 work; Queue `#002` is historical and is not updated as an execution controller.

## Validation approach

This is an integration and authority gate, not a separate feature phase. Run the
full checks from a clean tree. Any defect returns directly to its owning slice
with normal TDD; do not create a metadata-only fix/review chain.

## Integrated validation commands (real scripts only)

- `npm run build`
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
- Issue `#016` acceptance criteria are met; Issue `#007` remains blocked until A2 acceptance and explicit owner direction.

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

- A full-gate failure requires scope outside S01-S05 remediation.
- Independent review or Holm authority acceptance is unavailable.
- Authority evidence contradicts approved decisions or requires another repository to change.
