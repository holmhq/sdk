---
status: ready
target_window: 8h
queued_effort_target: 28h20m
autonomy_level: A2
orchestration_mode: blind
created: 2026-07-14
updated: 2026-07-14
issues: [003, 004, 005, 006]
slice_count: 16
---

# Queue 001: A2 Core Foundation

## Scope

Run the A2 implementation conveyor serially through Issues #003-#006, using the approved plans in dependency order and stopping before Issue #007 for independent core API/conformance review.

## Constraints

- No release, publish, tag, deploy, cloud resource, credential use, destructive data action, or cross-repo edit.
- Work serially on SDK `main`; no parallel worktrees unless the owner changes the window.
- Strict red -> green -> refactor is mandatory for every implementation entry.
- Independent review is required per completed slice and again at the A2 gate.
- `koder/docs/BLIND_ORCHESTRATION.md` is a hard launch gate: the primary
  orchestrates fresh workers and must not implement or ingest worker detail.
- Preserve `@holmhq/sdk/state` as canonical; do not create `@holmhq/sdk/resources`.
- Stop before Issue #007 even if all entries drain early.

## Blind Orchestrator Contract

- The primary loads only this queue, the current row summary, compact worker
  sidecars, changed paths, validation outcomes, commit refs, review verdict
  summaries, blockers, and Git/process state.
- It never preloads all plans or reads product source, tests, generated output,
  full diffs, review bodies, worker transcripts, routine panes, or long logs.
- Each row uses a fresh implementation worker followed by a fresh independent
  reviewer. Fix workers read committed review findings directly; the primary
  sees only verdict/count/path summaries.
- One implementation worker may own SDK `main` at a time. Every worker gets a
  bounded task file and work-level harnex completion fence.
- After at most four completed implementation rows, the primary must commit a
  clean handoff and resume in a fresh coordinator context. If unattended
  relaunch is unavailable, stop cleanly at that rollover.
- No harnex/equivalent isolation, compact summary sidecar, or independent
  reviewer means **do not launch**; direct mega-session execution is forbidden.

## Progress Accounting

- Issues touched: 4 (`#003`, `#004`, `#005`, `#006`).
- Slices queued: 16.
- Likely child issues closed: up to 4.
- Release/live gate: none.
- Nominal queued effort: 28h20m, which is at least 2x the 8h target window.

## Done State

Issues #003-#006 are green/resolved with source, type, declaration, and generated-artifact evidence; A2 is `REVIEW_READY` for core API/conformance review; Issue #007 has not started.

## Timebox Gate

For an overnight run, stop starting implementation after 7h15m and reserve 45m for validation, queue/state handoff, clean commit, and push. If the A2 review gate is reached sooner, stop there.

## Continuation Policy

Drain entries serially through S16. If an entry blocks, record the blocker and continue only to a dependency-independent eligible entry, normally none across issue boundaries. After four completed implementation entries, hand off to a fresh blind coordinator and resume at the next eligible row. If all entries drain early, run final independent review and stop; never enter Issue #007.

Early-stop consent is allowed only for a recorded blocker, no eligible dependency-safe entry, validation failure requiring owner judgment, reaching the A2 review gate, or a mandatory four-entry context rollover when no unattended fresh coordinator can relaunch. Primary-entry drain alone is not a reason to skip final review/closeout.

## Entries

| Order | Status | Plan | Estimate | Risk | Ambiguity | Mode | Validation | Stop Rule |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | approved | [koder/plans/001_S01_toolchain_configs/INDEX.md](../../plans/001_S01_toolchain_configs/INDEX.md) | 90m | medium | low | harnex-light | `npm run typecheck:core`; `npm run test:source`; `npm run test:types` | stop on non-MIT tool or >120m split |
| 02 | approved | [koder/plans/001_S02_build_declarations_artifact_smoke/INDEX.md](../../plans/001_S02_build_declarations_artifact_smoke/INDEX.md) | 105m | medium | medium | harnex-chain | `npm run build`; `npm run test:declarations`; `npm run test:dist` | stop if build output cannot be deterministic |
| 03 | approved | [koder/plans/001_S03_repro_ci_size_license/INDEX.md](../../plans/001_S03_repro_ci_size_license/INDEX.md) | 90m | medium | low | harnex-light | `npm run ci`; `npm run check:repro`; `npm run check:licenses`; `npm run size` | stop on credential/release/cloud requirement |
| 04 | queued | [koder/plans/001_S04_wire_value_errors/INDEX.md](../../plans/001_S04_wire_value_errors/INDEX.md) | 100m | medium | low | harnex-chain | `npm run ci`; targeted wire/error tests; dist smoke | stop if D006/D011 need revision |
| 05 | queued | [koder/plans/001_S05_capability_registry/INDEX.md](../../plans/001_S05_capability_registry/INDEX.md) | 90m | medium | low | harnex-light | `npm run ci`; targeted capability tests; type tests | stop if canonical Holm IDs are required |
| 06 | queued | [koder/plans/001_S06_runtime_invocation_caller/INDEX.md](../../plans/001_S06_runtime_invocation_caller/INDEX.md) | 110m | medium-high | medium | harnex-chain | `npm run ci`; targeted runtime/caller tests; dist smoke | stop if auth semantics would be invented |
| 07 | queued | [koder/plans/001_S07_extension_lifecycle/INDEX.md](../../plans/001_S07_extension_lifecycle/INDEX.md) | 120m | high | medium | harnex-chain | `npm run ci`; extension tests; type tests | stop if graph/type work exceeds 120m |
| 08 | queued | [koder/plans/001_S08_create_holm_lifecycle_fakes/INDEX.md](../../plans/001_S08_create_holm_lifecycle_fakes/INDEX.md) | 120m | high | medium | harnex-chain | `npm run ci`; lifecycle tests; declarations/dist/size | stop if HTTP or state behavior is needed |
| 09 | queued | [koder/plans/001_S09_transport_auth_errors/INDEX.md](../../plans/001_S09_transport_auth_errors/INDEX.md) | 115m | high | medium | harnex-chain | `npm run ci`; transport conformance; declarations/dist/size | stop if endpoint payloads are required |
| 10 | queued | [koder/plans/001_S10_caller_partitioned_cache/INDEX.md](../../plans/001_S10_caller_partitioned_cache/INDEX.md) | 105m | medium-high | medium | harnex-chain | `npm run ci`; cache tests; type/dist tests | stop if cache defaults need owner decision |
| 11 | queued | [koder/plans/001_S11_cache_invalidation_diagnostics/INDEX.md](../../plans/001_S11_cache_invalidation_diagnostics/INDEX.md) | 90m | medium | medium | harnex-light | `npm run ci`; cache and diagnostics tests; dist smoke | stop if endpoint taxonomy is required |
| 12 | queued | [koder/plans/001_S12_upload_conformance_ledger/INDEX.md](../../plans/001_S12_upload_conformance_ledger/INDEX.md) | 120m | high | medium | harnex-chain | `npm run ci`; upload tests; declarations/dist/size | stop if source evidence contradicts architecture |
| 13 | queued | [koder/plans/001_S13_state_resource_lifecycle/INDEX.md](../../plans/001_S13_state_resource_lifecycle/INDEX.md) | 105m | medium-high | low | harnex-chain | `npm run ci`; state tests; declarations/dist/size | stop if `/resources` or legacy exports are requested |
| 14 | queued | [koder/plans/001_S14_query_refresh_reset/INDEX.md](../../plans/001_S14_query_refresh_reset/INDEX.md) | 120m | high | medium | harnex-chain | `npm run ci`; state query/reset tests; dist smoke | stop if Holm state schema must be invented |
| 15 | queued | [koder/plans/001_S15_mutation_optimistic_invalidation/INDEX.md](../../plans/001_S15_mutation_optimistic_invalidation/INDEX.md) | 100m | medium-high | medium | harnex-chain | `npm run ci`; mutation tests; type/dist tests | stop if domain invalidation taxonomy is needed |
| 16 | queued | [koder/plans/001_S16_derived_realtime_legacy_proof/INDEX.md](../../plans/001_S16_derived_realtime_legacy_proof/INDEX.md) | 120m | high | medium | harnex-chain | `npm run ci`; state tests; declarations/dist/size | stop at A2 review gate before #007 |

## Run Log

- 2026-07-14: arithmetic reconciled; 16 rows sum to 1,700m (28h20m), 3.54x the 8h target window.
- 2026-07-14: blind-orchestrator/context-rollover contract added and independently approved at `95ebc69` with no findings.
- 2026-07-14: `S01` implemented at `1c450cf` and independently approved at `48a772e`; required validation passed.
- 2026-07-14: `S02` implemented at `c1504a9` and independently approved at `a3e4296`; required validation passed.
- 2026-07-14: `S03` implemented at `f48ea37` and independently approved at `c2ef6e0`; required validation passed, Issue `#003` is resolved, and the next eligible row is `S04`.
- pending: `S04` has not started.
