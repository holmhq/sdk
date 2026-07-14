---
title: Queue 002 - A2R authority conformance (Issue 016)
status: active
queue: 002
issue: 016
plan_family: 002
execution_authorized: true
owner_launch_gate: satisfied_2026_07_14
target_window: "8h unattended from launch with 45m closeout reserve"
window_deadline: "2026-07-15T06:59:49+05:30"
no_new_work_after: "2026-07-15T06:14:49+05:30"
done_state: "All S01-S06 approved; full validation green; independent SDK review has zero P1/P2; fresh read-only Holm authority review accepts A2"
timebox_gate: "Stop at queue completion, a real blocker, or eight hours from launch"
continuation_policy: "Stop after Queue #002; never begin Issue #007"
early_stop_consent: "Allowed only on queue drain, real blocker, or timebox closeout"
orchestration_mode: blind
assurance_profile: strict
review_granularity: entry
clean_row_review_artifact: optional
finding_and_final_review_artifact: required
planning_mode: direct
metadata_owner: coordinator
max_noop_attempts_per_phase: 2
initial_monitor_fence: "10m review; 20m implementation"
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
blind-orchestrator workflow. Queue `#002` is planning-approved after fresh
independent re-review, and the owner authorized bounded unattended implementation
on 14 Jul 2026.

## Ordering and gates

- Planning is complete. Do not dispatch more mapping, plan, plan-review, or
  metadata-finalizer workers.
- Serial execution on `main`; one current row at a time.
- When implementation is separately authorized, use blind-strict isolation with
  independent review per row because the seams are protocol/auth/security
  sensitive. Clean approvals use typed compact proof; findings and final gates
  use canonical review artifacts.
- For owner-present execution, the interactive primary is the bounded
  coordinator; no governor layer is required.
- The coordinator batches queue/run-log/Issue metadata at resumable checkpoints;
  `STATE.md` moves only at the real owner stop gate.
- Max two fix cycles per row and two no-op/boot/permission attempts per phase
  before block/escalation.
- Row estimates are caps, not time to consume deliberately. Use short first
  monitor fences and reconcile durable proof before extension.
- S06 is the final integration gate and requires all prior rows done.

## Queue rows

| Row | Slice | Capability | Plan Ref | Depends on | Status | Est (min) | Completion gate |
| --- | --- | --- | --- | --- | --- | ---: | --- |
| 1 | S01 | Holm envelope semantics and `/api/cmd` conformance | `koder/plans/002_S01_holm_envelope_semantics/INDEX.md` | none | blocked | 90 | Envelope/meta/error/header + `/api/cmd` tests pass with source-pinned evidence and Issue `#005` ledger update |
| 2 | S02 | Caller transition safety and partition fencing | `koder/plans/002_S02_caller_transition_safety/INDEX.md` | S01 | queued | 105 | Caller transition tests prove no old-principal cache/query/mutation survival and in-flight fencing |
| 3 | S03 | Capability ownership and extension invocation seam | `koder/plans/002_S03_capability_extension_ownership/INDEX.md` | S01 | queued | 110 | Public `holm.*` forging blocked; runtime-only updater and narrow `sdk.*` extension seam validated |
| 4 | S04 | Credential-safe diagnostics and cache identity | `koder/plans/002_S04_credential_safe_diagnostics_cache_identity/INDEX.md` | S01 | queued | 120 | Secret leakage tests pass for diagnostics/cache keys/hooks with structural redaction |
| 5 | S05 | Response correlation and provenance safeguards | `koder/plans/002_S05_response_correlation_provenance/INDEX.md` | S01,S02 | queued | 95 | Mismatched request/response IDs fail; duplicate/late responses ignored and diagnosed |
| 6 | S06 | Integrated authority return and final gate | `koder/plans/002_S06_integrated_authority_return/INDEX.md` | S01,S02,S03,S04,S05 | queued | 120 | Full validation stack green; independent SDK review (0 P1/P2); fresh Holm authority acceptance at named current Holm commit; clean/synced git; return before Issue #007 |

## Validation routing

Row-level validation commands are defined in each canonical slice plan and must
use live scripts/paths from `package.json` and existing source/test trees.
Harnex semantic reports carry commands/exits and canonical refs; terminal
telemetry plus live Git—not model-written SHA prose—carry commit/path/clean-state
proof.

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

- 2026-07-14 23:24 IST: S01 fix attempts `1` and `2` were receipt-free
  no-op/model-refusal attempts with no commits, opening the phase circuit
  breaker. Row is blocked at `fix` pending adapter/config/brief change; findings
  remain canonical only in `koder/reviews/027_a2r_s01_envelope_implementation/INDEX.md`.
- 2026-07-14 23:22 IST: S01 review attempt `1` returned `needs_fixes`
  (`P1/P2/P3=1/0/0`) at review commit `aa56435` with canonical findings in
  `koder/reviews/027_a2r_s01_envelope_implementation/INDEX.md`; coordinator
  dispatched fix attempt `1` without ingesting finding prose.
- 2026-07-14 23:17 IST: S01 implementation attempt `1` completed at `a15b3df`
  with required validation exits `0`; changed paths recorded in Harnex proof;
  coordinator dispatched independent review attempt `1`.
- 2026-07-14 23:08 IST: coordinator `01` opened S01 implementation attempt `1`
  (`sdk-q002-S01-implement-a1`) from `ca368d6`; active process state only, no
  phase-only metadata commit.
- 2026-07-14 22:59 IST: owner authorized Queue `#002` for an unattended bounded
  eight-hour blind-strict implementation window; stop at complete A2R acceptance,
  timebox closeout, or a real blocker, and never begin Issue `#007`.
- 2026-07-14: Review `#026` approved at commit `fc5c678` (`P1/P2/P3=0/0/0`); queue moved to `ready` with `execution_authorized: false`; next action: return for owner authorization.
- 2026-07-14: owner requested delivery-first orchestration. Planning/metadata
  moved to direct mode; Queue `#002` remains blind-strict only for separately
  authorized implementation, with batched coordinator metadata, compact clean
  review proof, no internal close commits, short monitor fences, and a
  two-attempt circuit breaker.

## Safety constraints

- No release/publish/tag/deploy/cloud operations.
- No Holm repo edits.
- No Queue `#001` mutation.
- No automatic continuation into A3.
