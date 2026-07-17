---
queue: 005
title: W4 - private v0.1-web release candidate
status: active
orchestration_mode: blind
review_granularity: entry
coordinator_entry_cap: 2
max_fix_cycles: 2
process_failure_budget: 8
dispatch_models: [pi/gpt-5.5, codex/gpt-5.3-codex]
dispatch_primary: pi/gpt-5.5
dispatch_fallback: codex/gpt-5.3-codex
implementation_ownership: serial
final_review_required: true
target_window: "authorized 2026-07-17 10:26 IST; initial owner-away target through 15:26 IST; completion authorization continues to the Queue #005 gate"
constraints:
  branch: main
  no_worktrees: true
  no_push: true
  no_tag: true
  no_release: true
  no_publish: true
  no_deploy: true
  no_credentials: true
  no_cloud_or_production_mutation: true
  package_private: true
  holm_read_only: true
  other_repositories_read_only: true
---

# Queue 005: W4 — Private v0.1-web Release Candidate

## Purpose

Deliver the private `0.1.0-rc.1` SDK code/artifact checkpoint from the eight
independently approved Issue `#017` slices: freeze the stable API, label and
isolate preview/reserved boundaries, disposition Review `#033` hardening,
produce deterministic web/BFBB artifacts, prove integrity/offline vendoring,
write bounded RC metadata/docs, and pass the integrated RC gate.

Review `#049` approved the source family at planning commit `43c294e` with
`P1=0, P2=0, P3=0`. The owner explicitly authorized Queue `#005` and an
unattended drain on 2026-07-17. The approved planning estimate remains roughly
8-14 hours plus review/authority wall time; the owner's five-hour absence is an
initial target, not permission to omit gates.

## Entries

| Order | Ref | Status | Estimate | Risk | Validation | Stop |
| ---: | --- | --- | ---: | --- | --- | --- |
| 1 | `koder/plans/004_S01_stable_api_inventory_freeze_gate/INDEX.md` | done | 90-120m | yellow | All plan commands; deterministic stable API/declaration manifest and drift gate; fresh entry review 0 P1/P2 | Support-matrix/API decision, new dependency, authority conflict, irreproducibility, or release action blocks |
| 2 | `koder/plans/004_S02_preview_reserved_boundary_enforcement/INDEX.md` | done | 60-90m | yellow | All plan commands; preview/reserved labels, stable import isolation, raw BFBB no-Node proof; fresh entry review 0 P1/P2 | Stable-to-preview coupling, expanded support promise, new dependency, authority drift, or irreproducibility blocks |
| 3 | `koder/plans/004_S03_credential_diagnostic_p3_hardening/INDEX.md` | done | 90-120m | yellow/red | All plan commands; Review `#033` advisories 1-4 disposition and credential-safe proof; fresh security review 0 P1/P2 | Sensitivity-contract/API redesign, unbounded leak, ambient/dependency need, or unauthorized credential action blocks |
| 4 | `koder/plans/004_S04_edge_contract_p3_disposition/INDEX.md` | done | 60-90m | yellow | All plan commands; Review `#033` advisories 5-9 explicit disposition; fresh edge-contract review 0 P1/P2 | Breaking API, unresolved advisory, Holm request-ID contradiction, dependency, or irreproducibility blocks |
| 5 | `koder/plans/004_S05_deterministic_web_bfbb_bundles/INDEX.md` | done | 90-120m | yellow/red | All plan commands; deterministic bundles/maps/declarations/manifests/size/license; fresh distribution review 0 P1/P2 | Issue `#014` cannot stay thin, dependency/status change, size/repro failure, authority conflict, or release action blocks |
| 6 | `koder/plans/004_S06_integrity_offline_vendoring_fixture/INDEX.md` | queued | 90-120m | yellow | All plan commands; hashes, tamper failure, copied offline BFBB and Vite fixtures; fresh integrity review 0 P1/P2 | Offline/immutable proof fails, Issue `#014` expands, dependency/release/pilot need, or authority drift blocks |
| 7 | `koder/plans/004_S07_rc_metadata_docs_upgrade_rollback/INDEX.md` | queued | 60-90m | yellow | All plan commands; private RC metadata/support/update/rollback wording; fresh docs/product review 0 P1/P2 | Public-release implication, support change, unsupported promise, broad Issue `#015` rewrite, or release action blocks |
| 8 | `koder/plans/004_S08_integrated_rc_gate_handoff/INDEX.md` | queued | 60-120m + CI/reviews | yellow/red | Four identical CI modes; API/repro/declaration/dist/example/size/license gates; integrated SDK review and fresh Holm acceptance 0 P1/P2; clean Git | Any red gate, P1/P2, large late product fix, authority drift, incomplete Issue `#014`, or pilot/release action blocks |

Entries run strictly in order on `main`. Every implementation and every fix is
committed, validated, and independently reviewed by a fresh worker before the
next row. Missing generated JavaScript, declarations, maps, manifests, package
smokes, integrity metadata, or size/license evidence is implementation
incomplete and returns to implementation rather than consuming a semantic fix
cycle.

## Completion contract

- `done_state`: private `0.1.0-rc.1` code/artifacts ready at an immutable local
  commit; S01-S08 and Issue `#017` accepted; Issue `#014` closed through S05/S06;
  four CI modes have identical required metrics; API drift, clean rebuild/repro,
  declarations, dist, examples, package smokes, size, license, integrity and
  offline fixtures are green; independent integrated SDK review and fresh
  read-only Holm acceptance report zero P1/P2; Git is clean and committed.
- `timebox_gate`: the initial owner-away target ends about `2026-07-17 15:26
  IST`, but explicit completion authorization continues. Start no new product
  phase after `2026-07-18 00:30 IST`; reserve through `01:15 IST` for safe
  validation/accounting/handoff. A clock boundary never waives a quality gate.
- `continuation_policy`: after S01-S08 drain, run required integrated SDK review,
  fresh Holm acceptance, final validation/accounting, and `/close`; do not enter
  pilot, promotion, Issue `#015`, or any next queue.
- `early_stop_consent`: granted only when the done state is reached or a
  fail-closed authorization, architecture, authority, validation, model,
  process-budget, or safety gate blocks continuation.

## Blind run overlay

- The root session is a process-only governor. Fresh coordinators own at most
  two entries and never launch successors. Fresh workers own implementation,
  review, fix, rereview, recovery, integrated review, and authority acceptance.
- Coordinators may consume queue/current-row metadata, compact typed reports,
  commit identities, changed paths, command exits, verdict/counts, blockers,
  and Git safety only. They must not read product source, diffs, worker
  transcripts, finding prose, or future plans.
- Primary automatic dispatch is `pi/gpt-5.5`; the only fallback is
  `codex/gpt-5.3-codex`. Both passed typed no-change preflight before launch.
  No Claude-family or other model/adapter substitution is authorized.
- Queue-global process failures start at `0/8`. Two no-op/boot/permission/
  report-free attempts for one phase stop retries until the brief/config
  changes; crossing `8` total process failures returns to the owner.
- Governor fences are at most five minutes, followed every time by Harnex
  status, typed-report, and Git reconciliation; completed sessions are stopped
  promptly.
- Holm and every repository other than this SDK remain read-only. No credentials,
  push, tag, publish, release, deploy, cloud/production mutation, or worktree.

## Progress accounting

- Issues touched: `#017` (closure candidate: yes), `#014` (closure candidate
  through S05/S06); umbrella `#001` advances but does not close; `#015` remains
  open.
- Slices queued: 8; expected drained: 8; expected issue closures: 2.
- First product-visible result: deterministic stable API inventory and drift
  gate (S01).
- Stop boundary: private `0.1.0-rc.1` readiness only; pilot/promotion/release and
  all next-issue work remain unauthorized.

## Run Log

- 2026-07-17 launch gate: owner explicitly authorized Queue `#005` for an
  unattended complete drain and requested final `/close`. Review `#049`
  approved Plans `004_S01`-`004_S08` at `43c294e`, `P1=0 P2=0 P3=0`.
- Preflight `q005-preflight-pi-a01` proved `pi/gpt-5.5`; preflight
  `q005-preflight-codex-a01` proved fallback `codex/gpt-5.3-codex`. Both returned
  accepted no-change typed reports; Git remained clean and synchronized.
- Coordinator `q005-coordinator-01` completed S01: implement
  `q005-c01-e01-implement-a01` committed
  `f723a95749e9626ce4bbf6e54934dcf5e4ad4973` (parent
  `3049b5410e01000a3f20234d6f5d268ab64cf758`) with red
  `npm run test:stable-api` exit 1, green exit 0, and all S01 plan validation
  commands exit 0; review `q005-c01-e01-review-a01` approved
  `P1=0 P2=0 P3=0`; generated artifacts reproducible/unchanged; process
  failures used `0/8`.
- Coordinator `q005-coordinator-01` completed S02: implement
  `q005-c01-e02-implement-a01` committed
  `6f3944b8ff006e8b6821990a05518422810248e5` (parent
  `f723a95749e9626ce4bbf6e54934dcf5e4ad4973`) with red
  `npm run test:types` exit 2 and `npm run test:examples` exit 1, green targeted
  gates plus all S02 plan validation commands exit 0; review
  `q005-c01-e02-review-a01` approved `P1=0 P2=0 P3=0`; generated artifacts
  owned and reproducible; process failures used `0/8`.
- Coordinator `q005-coordinator-02` completed S03: implement
  `q005-c02-e03-implement-a01` committed
  `525d48c7dbe28d6603d8131540d5664995fd9b6e` (parent
  `2e07d71b0de66ccfa8d25d45fc66b06d003b51bd`) with red
  `npm run test:source -- "low-entropy|URL-borne|background HolmError"` exit 1,
  green exit 0, and all S03 plan validation commands exit 0; review
  `q005-c02-e03-review-a01` approved `P1=0 P2=0 P3=0`; generated artifacts
  owned and reproducible; no S03 fix cycles.
- Coordinator `q005-coordinator-02` blocked S04 before product delta after five
  process failures: `q005-c02-e04-implement-a01`, `a03`, and `a04` were Pi
  provider boot/report failures with no Git delta; `a02` was Codex fallback
  no-commit/no-final-report despite a completion claim; `a05` was Codex
  legacy-PTY report failure with no Git delta. Process failures used `5/8`;
  next safe phase remains S04 implementation with a changed brief/config or
  owner/operator recovery decision.
- Recovery coordinator `q005-coordinator-03r` completed S04 after the prior five
  process failures: implement `q005-c03r-e04-implement-a06` committed
  `7d3afec795e24580323e50a65074c6d639cb10dc` (parent
  `11d2084cd275e04eb3b957407181a80cacfee2f5`) with targeted red
  `npm run test:source -- "invalid descriptors"` exit 1, green exit 0, and all
  S04 plan validation commands exit 0; review `q005-c03r-e04-review-a01`
  approved `P1=0 P2=0 P3=0`; generated artifacts were updated/reproducible;
  no fallback or fix cycle was used; process failures remain `5/8`.
- Coordinator `q005-coordinator-04` blocked S05 before product delta after two
  implementation process failures from clean base
  `17bac60a0d17b81a02ff44ea23845a30b8316db3`: primary
  `q005-c04-e05-implement-a01` failed with provider/report-invalid telemetry and
  no Git delta; in-policy fallback `q005-c04-e05-implement-a02` failed with an
  acknowledgement/no-final-report outcome and no Git delta. No S05 commit,
  review, fix, generated-artifact, or Issue `#014` proof exists. Process
  failures used `7/8`; next safe phase is S05 implementation only after an
  owner/operator recovery decision or materially changed dispatch capability.
- Governor recovery changed the dispatch shape and completed S05 directly:
  `q005-gov-e05-recovery-a03` committed
  `c7fb6c067634712e50788bca8ae5325cb14263cc` (parent
  `6523370fd875172ce77ee962a302b1d4545f8e80`) with a deterministic red bundle
  gate followed by all S05 plan commands green, complete tracked bundles/maps/
  declarations/manifest/size/license output, and clean reproducibility. Fresh
  independent review `q005-gov-e05-review-a01` approved `P1=0 P2=0 P3=0` with
  no findings artifact. No additional process failure or fix cycle was used;
  process failures remain `7/8`. Next eligible phase is S06 implementation.
