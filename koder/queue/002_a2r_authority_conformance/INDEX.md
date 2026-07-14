---
queue: 002_a2r_authority_conformance
issue: 016
plan_family: 002
status: in_review
execution_authorized: false
orchestration_mode: blind
coordinator_entry_cap: 3
max_fix_cycles_per_row: 2
serial_branch: main
independent_review_required: true
final_integrated_review_required: true
created: 2026-07-14
updated: 2026-07-14
owner_launch_gate: plan_approval_plus_separate_owner_authorization_required
---

# Queue 002: A2R Authority Conformance (Issue 016)

## Window and gate

This queue is planning-packed only for the A2R planning window. It is **not execution-authorized**. Launch requires two independent gates in order:

1. all referenced Plan `002` slices are independently approved;
2. owner provides separate explicit queue-run authorization after approval.

No planning-window actor may launch implementation from this queue.

## Orchestration contract

- Mode: blind orchestrator only per `koder/docs/BLIND_ORCHESTRATION.md`.
- Coordinator cap: maximum `3` active coordinators.
- Row handling: one current row at a time, serial `main` ownership.
- Fix cycles: max `2` review-fix loops per row; unresolved P1/P2 after cycle 2 blocks the row.
- Every row requires independent review by a worker other than implementer.
- Final integrated independent review is mandatory after `S06`.

## Ordered plan rows (mapping DAG locked)

| Row | Plan ref | Status | Depends on | Estimate (min) | Risk | Ambiguity | Harnex mode | Exact validation | Row stop rule |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| 1 | [koder/plans/002_S01_holm_envelope_semantics/INDEX.md](../../plans/002_S01_holm_envelope_semantics/INDEX.md) | in_review | none | 90 | medium | low | harnex-chain | `npm run test:source -- test/source/transport/transport-contract.test.ts`; `npm run typecheck:core`; `npm run ci` | stop if canonical envelope semantics are missing/contradictory in authority evidence |
| 2 | [koder/plans/002_S02_caller_transition_safety/INDEX.md](../../plans/002_S02_caller_transition_safety/INDEX.md) | in_review | S01 | 105 | medium-high | medium | harnex-chain | `npm run test:source -- test/source/state/caller-reset.test.ts`; `npm run test:source -- test/source/state/query.test.ts`; `npm run test:source -- test/source/state/mutation.test.ts`; `npm run typecheck:core`; `npm run ci` | stop if caller transition contract requires decisions outside `D001-D015` |
| 3 | [koder/plans/002_S03_capability_extension_ownership/INDEX.md](../../plans/002_S03_capability_extension_ownership/INDEX.md) | in_review | S01 | 110 | high | medium | harnex-chain | `npm run test:source -- test/source/core/capabilities.test.ts`; `npm run test:source -- test/source/core/extensions.test.ts`; `npm run test:source -- test/source/core/runtime-invocation.test.ts`; `npm run typecheck:core`; `npm run ci` | stop if ownership remediation crosses runtime-layer boundaries not modeled in architecture |
| 4 | [koder/plans/002_S04_credential_safe_diagnostics_cache_identity/INDEX.md](../../plans/002_S04_credential_safe_diagnostics_cache_identity/INDEX.md) | in_review | S01 | 120 | high | medium | harnex-chain | `npm run test:source -- test/source/core/diagnostics.test.ts`; `npm run test:source -- test/source/transport/cache.test.ts`; `npm run test:source -- test/source/transport/cache-invalidation.test.ts`; `npm run typecheck:core`; `npm run ci` | stop if fix requires secret policy/storage redesign or non-authoritative assumptions |
| 5 | [koder/plans/002_S05_response_correlation_provenance/INDEX.md](../../plans/002_S05_response_correlation_provenance/INDEX.md) | in_review | S01,S02 | 95 | medium-high | low | harnex-chain | `npm run test:source -- test/source/transport/transport-contract.test.ts`; `npm run test:source -- test/source/transport/upload.test.ts`; `npm run typecheck:core`; `npm run ci` | stop if required provenance fields are absent in pinned authority evidence |
| 6 | [koder/plans/002_S06_integrated_authority_return/INDEX.md](../../plans/002_S06_integrated_authority_return/INDEX.md) | in_review | S01,S02,S03,S04,S05 | 115 | high | medium | harnex-chain | `npm run test:source`; `npm run test:types`; `npm run test:declarations`; `npm run test:dist`; `npm run test:coverage`; `npm run check:repro`; `npm run check:licenses`; `npm run size`; `npm run ci` | stop if integrated conformance needs architecture/API redesign or cross-repo protocol edits |

## Completion and accounting contract

- Progress ledger for Issue `#016` must track each slice through `planned -> in_progress -> review -> fix(optional) -> approved -> done` with commit refs and validation exits.
- Queue accounting remains row-thin; implementation detail stays in per-slice plans and worker sidecars.
- Closeout reserve: keep final operator window for integrated review, full-repo validation, clean/synced proof, and authority-acceptance handoff notes.

## Done state requirements

Queue `#002` can be marked done only when all are true:

- all six Issue `#016` slices are done with independent review verdicts and no open blockers;
- full repository validation passes from clean checkout;
- independent SDK remediation review reports zero P1/P2 findings;
- fresh read-only Holm authority acceptance approves A2 at a named current Holm commit;
- Git is clean/synced on `main`;
- workflow returns before any Issue `#007` implementation.

## Constraints and continuation policy

- No release, publish, cloud, credentials, or cross-repo mutation operations.
- Queue `#001` remains historical and untouched.
- Continuation must stop at the A2R gate and never roll into A3 automatically.
