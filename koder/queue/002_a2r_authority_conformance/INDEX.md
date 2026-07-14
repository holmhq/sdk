---
title: Queue 002 - A2R authority conformance (Issue 016)
status: ready
queue: 002
issue: 016
plan_family: 002
execution_authorized: false
owner_launch_gate: plan_approval_plus_separate_owner_authorization_required
serial_branch: main
independent_review_required: true
final_integrated_review_required: true
max_fix_cycles_per_row: 2
coordinator_entry_cap: 3
updated: 2026-07-14
plan_review_verdict: approve
plan_review_ref: koder/reviews/026_a2r_remediation_plan_rereview/INDEX.md
---

# Queue 002 - A2R authority conformance

## Scope

This queue maps Issue `#016` remediation slices to executable plan refs under a
blind-orchestrator workflow. Queue `#002` is planning-approved only after fresh
independent re-review. Implementation remains blocked until separate owner
authorization.

## Ordering and gates

- Serial execution on `main`.
- One current row at a time.
- Independent review required per row.
- Max two fix cycles per row before block/escalation.
- S06 is final integration gate and requires all prior rows done.

## Queue rows

| Row | Slice | Capability | Plan Ref | Depends on | Status | Est (min) | Completion gate |
| --- | --- | --- | --- | --- | --- | ---: | --- |
| 1 | S01 | Holm envelope semantics and `/api/cmd` conformance | `koder/plans/002_S01_holm_envelope_semantics/INDEX.md` | none | in_review | 90 | Envelope/meta/error/header + `/api/cmd` tests pass with source-pinned evidence and Issue `#005` ledger update |
| 2 | S02 | Caller transition safety and partition fencing | `koder/plans/002_S02_caller_transition_safety/INDEX.md` | S01 | in_review | 105 | Caller transition tests prove no old-principal cache/query/mutation survival and in-flight fencing |
| 3 | S03 | Capability ownership and extension invocation seam | `koder/plans/002_S03_capability_extension_ownership/INDEX.md` | S01 | in_review | 110 | Public `holm.*` forging blocked; runtime-only updater and narrow `sdk.*` extension seam validated |
| 4 | S04 | Credential-safe diagnostics and cache identity | `koder/plans/002_S04_credential_safe_diagnostics_cache_identity/INDEX.md` | S01 | in_review | 120 | Secret leakage tests pass for diagnostics/cache keys/hooks with structural redaction |
| 5 | S05 | Response correlation and provenance safeguards | `koder/plans/002_S05_response_correlation_provenance/INDEX.md` | S01,S02 | in_review | 95 | Mismatched request/response IDs fail; duplicate/late responses ignored and diagnosed |
| 6 | S06 | Integrated authority return and final gate | `koder/plans/002_S06_integrated_authority_return/INDEX.md` | S01,S02,S03,S04,S05 | in_review | 120 | Full validation stack green; independent SDK review (0 P1/P2); fresh Holm authority acceptance at named current Holm commit; clean/synced git; return before Issue #007 |

## Validation routing

Row-level validation commands are defined in each canonical slice plan and must
use live scripts/paths from `package.json` and existing source/test trees.

## Done-state requirements

Queue `#002` may be marked done only when all are true:

- rows S01-S06 are done with independent reviews and no open P1/P2 blockers;
- full repository validation passes from clean checkout;
- fresh independent SDK remediation review reports zero P1/P2 findings;
- fresh read-only Holm authority review accepts A2 at named current Holm commit;
- `main` is clean/synced;
- workflow stops before any Issue `#007` implementation.

## Review #025 disposition ledger

| Finding | Disposition | Canonical section |
| --- | --- | --- |
| P1-1 placeholder plan bodies | Resolved | Rows 1-6 now reference authored S01-S06 plans with executable strict-TDD instructions. |
| P2-1 invalid validation command names | Resolved | Referenced plans use actual `package.json` scripts; queue remains thin and points to those canonical plans. |
| P2-2 non-existent write ownership paths | Resolved | Referenced plans now bind ownership to existing `src/*` and `test/source/*` seams from Review `#024`. |
| P3-1 slice ledger mismatch | Dispositioned | Issue `#016` metadata corrected to six slices; queue row count already six and unchanged. |
| P3-2 `/api/cmd` omission | Resolved | S01 row points to plan explicitly covering `/api/cmd` command-envelope handling. |

## Run log

- 2026-07-14: Review `#026` approved at commit `fc5c678` (`P1/P2/P3=0/0/0`); queue moved to `ready` with `execution_authorized: false`; next action: return for owner authorization.

## Safety constraints

- No release/publish/tag/deploy/cloud operations.
- No Holm repo edits.
- No Queue `#001` mutation.
- No automatic continuation into A3.
