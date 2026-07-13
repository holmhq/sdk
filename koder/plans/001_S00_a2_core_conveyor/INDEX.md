---
plan_family: 001
slice: S00
title: A2 Core Conveyor Mapping
type: mapping
status: approved
created: 2026-07-14
updated: 2026-07-14
autonomy_level: A2
orchestration_mode: blind
issues: [003, 004, 005, 006]
implementation_slices: 16
queue: 001_a2_core_foundation
---

# Plan 001 S00: A2 Core Conveyor

## A2 Goal

Turn the approved architecture and Issues #003-#006 into thin, serial, strict-TDD implementation slices that can run unattended on `main` while stopping before Issue #007 for core API/conformance review.

A2 covers four issues and sixteen implementation slices:

- Issue #003: strict TypeScript toolchain and conformance harness.
- Issue #004: universal core, capabilities, adapters, extensions, lifecycle, and fakes.
- Issue #005: transport, auth, cache, upload, errors, diagnostics, and migration evidence.
- Issue #006: canonical `@holmhq/sdk/state` framework-neutral resources.

## Approved Constraints

- Work serially on SDK `main`; no parallel worktrees or overlapping implementation agents.
- Use strict red -> green -> refactor for every implementation slice and preserve red evidence.
- Keep Issue #003-#006 work inside A2; never start Issue #007 automatically.
- No release, publish, tag, deploy, cloud resource, credential use, destructive data action, or cross-repo edit.
- Keep `package.json` private and keep npm publication deferred.
- Preserve `/state` as canonical; do not introduce `/resources` as an alias.
- Do not invent unavailable Holm action, private realtime, presence, scope, oplog, desktop, or mobile capabilities.
- Existing Holm SDK/state packages remain live and are migration evidence, not deletion targets.
- Source and generated artifacts must both be tested once build output exists.
- Every child issue completion requires local validation, review evidence, clean commit, and push.
- The primary queue agent follows `koder/docs/BLIND_ORCHESTRATION.md`: it routes
  fresh workers and must not implement product code or ingest worker detail.

## Blind Orchestration And Context Budget

- The primary consumes only queue/process state, compact sidecars, changed
  paths, validation outcomes, commit refs, review verdict summaries, blockers,
  and Git status.
- Implementation workers read the current plan/source and perform TDD. Fresh
  review workers read the resulting diff/tests and commit a verdict. Fix workers
  consume review artifacts directly; findings are not re-digested by primary.
- Never preload future plan bodies, full source/diffs/reviews, transcripts,
  panes, generated output, or long logs into coordinator context.
- One implementation worker owns SDK `main` at a time. Monitor harnex work-level
  completion rather than pane progress.
- A coordinator routes at most four completed implementation entries, then
  commits a clean handoff and resumes in fresh context. If unattended relaunch
  is unavailable, stopping at rollover is explicitly safe.
- If isolated workers, compact summaries, and independent review cannot be
  enforced, Queue `#001` is blocked; direct mega-session execution is forbidden.

## Issue To Slice Table

| Slice | Issue | Capability | Depends on | Plan |
| --- | --- | --- | --- | --- |
| S01 | #003 | strict configs, minimal dev tools, red ambient-boundary fixture | A1 / #002 | [S01](../001_S01_toolchain_configs/INDEX.md) |
| S02 | #003 | deterministic ESM build, declarations, bundle smoke | S01 | [S02](../001_S02_build_declarations_artifact_smoke/INDEX.md) |
| S03 | #003 | reproducibility, coverage, size, license, CI, README commands | S02 | [S03](../001_S03_repro_ci_size_license/INDEX.md) |
| S04 | #004 | `WireValue` validation/copy/canonical encoding and error foundation | #003 | [S04](../001_S04_wire_value_errors/INDEX.md) |
| S05 | #004 | capability registry, immutable offers, fail-closed negotiation | S04 | [S05](../001_S05_capability_registry/INDEX.md) |
| S06 | #004 | runtime invocation envelope and caller partition hooks | S05 | [S06](../001_S06_runtime_invocation_caller/INDEX.md) |
| S07 | #004 | sealed extension graph, ordering, rollback, reverse disposal | S06 | [S07](../001_S07_extension_lifecycle/INDEX.md) |
| S08 | #004 | `createHolm`, lifecycle, cancellation, fakes, artifact proof | S07 | [S08](../001_S08_create_holm_lifecycle_fakes/INDEX.md) |
| S09 | #005 | transport contract, auth seams, abort/error normalization | S08 | [S09](../001_S09_transport_auth_errors/INDEX.md) |
| S10 | #005 | caller-partitioned deterministic GET cache | S09 | [S10](../001_S10_caller_partitioned_cache/INDEX.md) |
| S11 | #005 | cache immutability, invalidation, diagnostics, SWR errors | S10 | [S11](../001_S11_cache_invalidation_diagnostics/INDEX.md) |
| S12 | #005 | upload seam, conformance ledger, web/Node artifact proof | S11 | [S12](../001_S12_upload_conformance_ledger/INDEX.md) |
| S13 | #006 | canonical state resource lifecycle and referential stability | S12 | [S13](../001_S13_state_resource_lifecycle/INDEX.md) |
| S14 | #006 | query refresh/stale/error/cancellation/dedup and caller reset | S13 | [S14](../001_S14_query_refresh_reset/INDEX.md) |
| S15 | #006 | mutation resources, optimistic rollback, invalidation, inference | S14 | [S15](../001_S15_mutation_optimistic_invalidation/INDEX.md) |
| S16 | #006 | derived resources, diagnostics/history, reconcile hook, legacy proof | S15 | [S16](../001_S16_derived_realtime_legacy_proof/INDEX.md) |

## Dependency DAG

```text
A1 approved
  -> S01 -> S02 -> S03
  -> S04 -> S05 -> S06 -> S07 -> S08
  -> S09 -> S10 -> S11 -> S12
  -> S13 -> S14 -> S15 -> S16
  -> A2 REVIEW_READY / stop before #007
```

No issue boundary is parallel-safe for this queue because each later issue consumes exported contracts, generated artifacts, and review evidence from the previous issue.

## Gate Analysis

Each row is sized to pass the queue gate: <=120 minutes nominal, single-purpose, test-first, and reviewable without ordinary product questions.

| Slice | Effort gate | Risk gate | Ambiguity gate |
| --- | --- | --- | --- |
| S01 | 90m config/test baseline | Medium: tool selection and lockfile | Low: Issue #003 defines boundary |
| S02 | 105m build/declaration harness | Medium: generated output determinism | Medium: exact build shape still first implementation |
| S03 | 90m validation/CI layer | Medium: reproducibility and license tooling | Low: script contract is explicit |
| S04 | 100m serialization/error kernel | Medium: copy and canonical encoding edge cases | Low: D006/D011 are approved |
| S05 | 90m capability registry | Medium: subscription and version semantics | Low: D004 is approved |
| S06 | 110m runtime/caller envelope | Medium-high: caller partitioning and copies | Medium: auth proof stays adapter-private |
| S07 | 120m extension graph | High: topology, rollback, type surface | Medium: namespacing rule is approved |
| S08 | 120m lifecycle/fakes/export proof | High: integrates all core pieces | Medium: no transport/resource work allowed |
| S09 | 115m transport/auth/error contract | High: web/Node seams and redaction | Medium: endpoint payloads deferred |
| S10 | 105m deterministic cache core | Medium-high: TTL/SWR/LRU interaction | Medium: default policies may stay conservative |
| S11 | 90m invalidation/diagnostics | Medium: background error observability | Medium: no endpoint taxonomy invented |
| S12 | 120m upload and ledger closeout | High: runtime seams plus evidence | Medium: source baseline is already pinned |
| S13 | 105m base resource lifecycle | Medium-high: stable immutable snapshots | Low: D007/D013 are approved |
| S14 | 120m query refresh/reset | High: dedup plus caller reset | Medium: no Holm state schema invented |
| S15 | 100m mutation/optimistic layer | Medium-high: rollback and inference | Medium: domain invalidation stays explicit |
| S16 | 120m derived/reconcile/legacy proof | High: closeout evidence and boundaries | Medium: realtime remains a hook only |

## File Ownership And Overlap Sequence

1. S01-S03 own toolchain, scripts, CI, README command surface, generated-artifact mechanics, and validation names.
2. S04-S08 own `src/core`, root exports, test fakes, and core generated artifacts.
3. S09-S12 own `src/transports`, `src/web`, `src/node`, transport conformance, cache/upload diagnostics, and Issue #005 ledger evidence.
4. S13-S16 own `src/state`, package subpath export for `@holmhq/sdk/state`, resource tests, and Issue #006 legacy disposition evidence.
5. Generated `dist/` files and size manifests are touched only by slices whose validation requires them; reproducibility checks gate every change after S03.
6. Reviews, queue run logs, and issue evidence may grow with implementation, but state/window edits are reserved for closeout or explicit owner instructions.

## Test And Review Posture

- Each implementation slice begins by adding a failing source, type, declaration, generated-artifact, or conformance test that names the contract it protects.
- Red evidence is captured as the failing command and the shortest useful failure excerpt in the slice review or queue run log before production code lands.
- Green commits must run the exact validation commands listed in the slice plan; later slices rely on canonical scripts established by S01-S03.
- Refactor is limited to the touched boundary after tests are green; unrelated cleanup waits for another issue.
- Review occurs after every implementation slice before the next dependent slice starts.
- A2 final review must cover public API coherence, security boundaries, generated artifacts, size evidence, and migration ledgers before returning `REVIEW_READY`.

## Progress Accounting

- Implementation slices queued: 16.
- Issues touched: 4 (`#003`, `#004`, `#005`, `#006`).
- Likely child issues closed if all entries drain: 4.
- Release/live gates touched: 0.
- Nominal queue work: 28h20m, intentionally more than 2x the 8-hour away window.
- Timebox: stop starting new implementation work after 7h15m and reserve 45m for validation, queue/state handoff, clean commit, and push.

## A2 Stop

After S16, stop at the A2 review gate. Do not start Issue #007, app/admin migration, runtime-surface rollout, actions, realtime extension, collaboration, framework bindings, BFBB final distribution, release, tag, deploy, or npm publication without a new owner decision.

## Conveyor Pointers

- S01: [koder/plans/001_S01_toolchain_configs/INDEX.md](../001_S01_toolchain_configs/INDEX.md)
- S02: [koder/plans/001_S02_build_declarations_artifact_smoke/INDEX.md](../001_S02_build_declarations_artifact_smoke/INDEX.md)
- S03: [koder/plans/001_S03_repro_ci_size_license/INDEX.md](../001_S03_repro_ci_size_license/INDEX.md)
- S04: [koder/plans/001_S04_wire_value_errors/INDEX.md](../001_S04_wire_value_errors/INDEX.md)
- S05: [koder/plans/001_S05_capability_registry/INDEX.md](../001_S05_capability_registry/INDEX.md)
- S06: [koder/plans/001_S06_runtime_invocation_caller/INDEX.md](../001_S06_runtime_invocation_caller/INDEX.md)
- S07: [koder/plans/001_S07_extension_lifecycle/INDEX.md](../001_S07_extension_lifecycle/INDEX.md)
- S08: [koder/plans/001_S08_create_holm_lifecycle_fakes/INDEX.md](../001_S08_create_holm_lifecycle_fakes/INDEX.md)
- S09: [koder/plans/001_S09_transport_auth_errors/INDEX.md](../001_S09_transport_auth_errors/INDEX.md)
- S10: [koder/plans/001_S10_caller_partitioned_cache/INDEX.md](../001_S10_caller_partitioned_cache/INDEX.md)
- S11: [koder/plans/001_S11_cache_invalidation_diagnostics/INDEX.md](../001_S11_cache_invalidation_diagnostics/INDEX.md)
- S12: [koder/plans/001_S12_upload_conformance_ledger/INDEX.md](../001_S12_upload_conformance_ledger/INDEX.md)
- S13: [koder/plans/001_S13_state_resource_lifecycle/INDEX.md](../001_S13_state_resource_lifecycle/INDEX.md)
- S14: [koder/plans/001_S14_query_refresh_reset/INDEX.md](../001_S14_query_refresh_reset/INDEX.md)
- S15: [koder/plans/001_S15_mutation_optimistic_invalidation/INDEX.md](../001_S15_mutation_optimistic_invalidation/INDEX.md)
- S16: [koder/plans/001_S16_derived_realtime_legacy_proof/INDEX.md](../001_S16_derived_realtime_legacy_proof/INDEX.md)
- Queue: [koder/queue/001_a2_core_foundation/INDEX.md](../../queue/001_a2_core_foundation/INDEX.md)

## Override Rules

Stop and record `BLOCKED` instead of broadening scope if any slice cannot fit <=120 minutes, needs a product decision, contradicts D001-D015, requires Issue #007+ work, needs credentials/cloud/release permissions, or cannot validate generated artifacts cleanly.
