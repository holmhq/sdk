---
queue: 004
title: W3 - Issue 009 runtime and surface adapters
status: active
orchestration_mode: blind
review_granularity: entry
coordinator_entry_cap: 2
max_fix_cycles: 2
process_failure_budget: 6
dispatch_models: [pi/gpt-5.5]
dispatch_fallback: none_authorized
implementation_ownership: serial
final_review_required: true
target_window: "2026-07-16 23:53 IST through 2026-07-17 07:45 IST"
constraints:
  branch: main
  no_worktrees: true
  no_push: true
  no_release: true
  no_publish: true
  no_deploy: true
  no_credentials: true
  no_cloud_or_production_mutation: true
  holm_read_only: true
  other_repositories_read_only: true
---

# Queue 004: W3 — Issue 009 Runtime and Surface Adapters

## Purpose

Close Issue `#009` by delivering common adapter conformance, deterministic
in-memory/test support, reconciled web behavior, Node/CLI services, a structural
Sobek injected-runtime adapter, and reserved desktop/mobile bridge mocks without
inventing a protocol beyond Holm's canonical GET/POST contract.

The reviewed source family is approved by Review `#040` at SDK commit
`bbf938857bdc0d5363a869e1bb4b6100ae8ac997`. Live Holm planning authority is
Issue `#534` at commit `55cd8213af9878f63432586a8a58c093b3aaa47a`
(`v0.185.0`). The Holm checkout has unrelated pre-existing dirty work and is
strictly read-only.

## Entries

| Order | Ref | Status | Estimate | Risk | Validation | Stop |
| ---: | --- | --- | ---: | --- | --- | --- |
| 1 | `koder/plans/003_S01_adapter_conformance_in_memory/INDEX.md` | done | 90-120m | yellow | Plan validation plus clean reproducible owned `dist/`; fresh entry review 0 P1/P2 | Any architecture change, unshipped Holm requirement, out-of-seam source, or irreproducible public artifact blocks |
| 2 | `koder/plans/003_S02_web_runtime_conformance/INDEX.md` | done | 90-120m | yellow | Plan validation plus `npm run test:examples`; fresh entry review 0 P1/P2 | Any weakening of Issue `#007` auth/URL containment, public-protocol invention, Holm-owned behavior, or dist drift blocks |
| 3 | `koder/plans/003_S03_node_cli_runtime_services/INDEX.md` | queued | 90-120m | yellow | Plan validation, ambient-boundary type checks, owned `dist/`; fresh entry review 0 P1/P2 | Implicit process/env/fs access, core ambient leak, local-dispatch requirement, or unapproved CLI semantics blocks |
| 4 | `koder/plans/003_S04_sobek_injected_runtime/INDEX.md` | queued | 90-120m | yellow | Plan validation, no-self-HTTP fake proof, owned `dist/`; fresh entry review 0 P1/P2 | Missing production Holm API, fake becoming server implementation, self-HTTP, or irreproducible subpath blocks |
| 5 | `koder/plans/003_S05_bridge_mocks_service_slots/INDEX.md` | queued | 90-120m | yellow | Plan validation, ambient isolation, copied mailbox proof, owned `dist/`; fresh entry review 0 P1/P2 | Any production-capability claim, shared native object, ambient contamination, or shell implementation blocks |
| 6 | `koder/plans/003_S06_exports_dist_authority_gate/INDEX.md` | queued | 90-120m + CI | yellow | Four CI modes, clean-tree reproducibility, fresh read-only Holm acceptance, integrated final review 0 P1/P2 | Any red full gate, export-boundary collapse, Holm contradiction, P1/P2, Issue `#014` scope, or exhausted fix budget blocks |

Entries run strictly in order on `main`. Every implementation and every fix is
committed, validated, and reviewed by a fresh worker before the next entry.
Missing generated JavaScript, declarations, maps, manifests, package smoke, or
size evidence is implementation-incomplete and returns to implementation; it
does not consume a semantic fix cycle.

## Completion contract

- `done_state`: Issue `#009` resolved with S01-S06 done, all acceptance boxes
  checked, four reporter/color CI modes green with identical coverage metrics,
  clean-tree build reproducibility, fresh integrated SDK review reporting zero
  P1/P2, fresh read-only Holm-authority acceptance at a named current commit,
  and a clean committed SDK tree.
- `timebox_gate`: no new implementation phase after `2026-07-17 07:00 IST`;
  reserve through `07:45 IST` for validation, final review, durable accounting,
  and handoff.
- `continuation_policy`: after S01-S06 drain, run final validation/review and
  stop. Do not file or begin Issue `#014`; no cross-issue overflow is authorized.
- `early_stop_consent`: granted only when the done state is reached or a
  fail-closed gate/process budget blocks safe continuation. A drained planning
  artifact is not an early-stop condition.

## Blind run overlay

- Root session is a process-only governor. Fresh coordinators own at most two
  entries and never launch successors. Fresh workers own implement, review,
  fix, rereview, recovery, and final-review phases.
- Coordinators may consume queue/current-row metadata, compact typed reports,
  commit identities, changed paths, validation exits, verdict/counts, blockers,
  and Git safety only. They must not read product source, diffs, transcripts,
  finding prose, or future plans.
- `pi/gpt-5.5` is the only automatic dispatch model. No fallback is authorized;
  failed adapter health blocks rather than substituting another model.
- Queue-global process failures start at `0/6`. Two no-op/boot/permission/
  report-free attempts for one phase stop retries until the brief/config changes;
  crossing `6` total process failures returns to the owner.
- Holm and every repository other than this SDK remain read-only. No credentials,
  release, publish, tag, push, deploy, cloud/production mutation, or worktree.

## Progress accounting

- Issues touched: `#009` (closure candidate: yes); umbrella `#001` advances but
  does not close.
- Slices queued: 6; expected drained: 6; expected issue closures: 1.
- First product-visible result: S01 common conformance plus deterministic
  in-memory/test adapter.
- Stop boundary: Issue `#009` only; Issue `#014` remains unstarted.

## Run Log

- 2026-07-16 planning gate: Pi preflight `q004-preflight-01` passed with a valid
  no-change report; no fallback is authorized. Process failures `0/6`.
- Planning worker committed the six-slice family at `bbf9388`; independent
  Review `#040` approved it at `079f360` with `P1=0, P2=0, P3=0`, including
  reconciliation of live Holm Issue `#534` at `55cd8213`.
- Overnight blind execution authorized by the owner and started from clean
  `main`, three expected local commits ahead of upstream (planning, review, and
  authorization); no push is authorized. First eligible entry is S01.
- Coordinator `q004-coordinator-01` completed S01 and S02. S01 implementation
  `q004-c01-e01-implement-a01` committed `53007a9`; S01 review
  `q004-c01-e01-review-a01` approved `P1=0 P2=0 P3=0`; validation was green
  for all S01 plan commands with owned `dist/test` output. S02 implementation
  `q004-c01-e02-implement-a01` committed `8ad6bb0`; S02 review
  `q004-c01-e02-review-a01` approved `P1=0 P2=0 P3=0`; validation was green
  for all S02 plan commands including examples with owned `dist/web` output.
  Process failures remain `0/6`; blocker: none. Next eligible entry is S03.
