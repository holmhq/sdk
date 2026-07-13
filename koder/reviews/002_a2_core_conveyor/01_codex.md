---
plan: 001_S00
issues: [003, 004, 005, 006]
type: plan-review
verdict: needs fixes
reviewer: codex
created: 2026-07-14
reviewed_commit: eb459e4336d0978cc939877a29e5cd305ba1d7c8
---

# Review: A2 Core Queue Conveyor

## Summary

I reviewed the full A2 conveyor at commit
`eb459e4336d0978cc939877a29e5cd305ba1d7c8`: the S00 map, S01-S16 slice
plans, Queue `#001`, Issues `#003`-`#006`, and the A2 architecture/decision
context. The slice dependency graph is coherent, scoped to A2, and broadly
executable with strict TDD and per-slice validation.

Verdict is `NEEDS_FIXES` because one queue arithmetic claim is materially wrong:
the 16 queue row estimates sum to 1,700 minutes, or 28h20m, while both S00 and
Queue `#001` declare an 18-24h nominal queued target. That is not a product
design flaw, but it is a launch-safety artifact flaw because the away-window
contract explicitly depends on estimate accounting.

## Findings

### P2-1: Queue effort target does not match the actual row estimates

Locations:

- [S00 Progress Accounting](../../plans/001_S00_a2_core_conveyor/INDEX.md)
- [Queue Progress Accounting](../../queue/001_a2_core_foundation/INDEX.md)
- [Queue Entries](../../queue/001_a2_core_foundation/INDEX.md)

The queue declares `queued_effort_target: 18-24h` and says nominal queued effort
is 18-24h. The actual queue row estimates are:

```text
90 + 105 + 90 + 100 + 90 + 110 + 120 + 120
+ 115 + 105 + 90 + 120 + 105 + 120 + 100 + 120
= 1,700 minutes = 28h20m
```

This fails the review gate that the sum of entry estimates supports the declared
18-24h target and at least 2x packing. The queue still has more than 2x packing
for an 8h window, but the stated target is inaccurate by 4h20m over its upper
bound. Required fix: either update S00 and Queue `#001` to a supported target
that includes 28h20m, or revise/split/tighten row estimates so the mechanically
summed entries land inside 18-24h.

## Coverage and Dependency Check

Reviewed artifacts: [Issues `#003`](../../issues/003_typescript_toolchain/INDEX.md),
[`#004`](../../issues/004_universal_core/INDEX.md),
[`#005`](../../issues/005_transport_cache_auth/INDEX.md), and
[`#006`](../../issues/006_reactive_resources/INDEX.md); [S00](../../plans/001_S00_a2_core_conveyor/INDEX.md);
all S01-S16 implementation plans; [Queue `#001`](../../queue/001_a2_core_foundation/INDEX.md);
[ARCHITECTURE.md](../../docs/ARCHITECTURE.md); and
[DECISIONS.md](../../docs/DECISIONS.md).

Coverage result:

- Issue `#003` acceptance is covered by S01-S03: strict configs, ambient core
  boundary, runtime opt-in configs, source/type tests, generated ESM,
  declarations, declaration consumer, bundle smoke, reproducibility, coverage,
  size, license, CI, private package, and README commands.
- Issue `#004` acceptance is covered by S04-S08: wire values and typed errors,
  capability registry, runtime invocation and caller boundary, sealed
  extensions, lifecycle, cancellation, fakes, `createHolm`, generated
  ESM/declaration proof, and size reporting.
- Issue `#005` acceptance is covered by S09-S12: transport request/response
  modes, web/Node auth seams, abort/error normalization, deterministic
  caller-partitioned cache, invalidation, diagnostics, SWR errors, immutable
  cache returns, upload/progress seam, source-pinned migration ledger, and
  generated web/Node artifact proof.
- Issue `#006` acceptance is covered by S13-S16: canonical `@holmhq/sdk/state`,
  resource snapshots/subscriptions/disposal, query refresh/stale/error/cancel,
  caller reset, mutation resources, optimistic rollback, derived resources,
  realtime reconcile hook boundary, legacy `holm-state` disposition, type
  inference, generated artifacts, and size evidence.

Dependency result:

- The order is acyclic: S01 -> S02 -> S03 -> S04 -> S05 -> S06 -> S07 -> S08
  -> S09 -> S10 -> S11 -> S12 -> S13 -> S14 -> S15 -> S16.
- No Issue `#005` transport/cache/auth slice begins before the Issue `#004`
  core seams are established in S04-S08.
- No Issue `#006` state/resource slice begins before transport/cache/upload
  foundations complete in S09-S12.
- `/state` is preserved as canonical in S00, Queue `#001`, and S13. I found no
  `/resources` alias or legacy API preservation requirement in the reviewed
  plan/queue artifacts.
- Issue `#007+` work is consistently deferred or forbidden.

## Slice Thinness and TDD Check

All 16 executable slices were reviewed, not sampled.

- S01 is thin and executable: one toolchain/config capability, explicit red
  ambient-boundary fixture, source/type validation, and no real capability code.
- S02 correctly waits for S01 scripts and proves generated ESM/declarations
  before downstream slices rely on generated artifacts.
- S03 completes Issue `#003` with reproducibility, CI, coverage, license, size,
  and README command proof before core implementation begins.
- S04 is a valid first core slice because wire-value copying/canonical encoding
  and error serialization are prerequisites for adapter boundaries.
- S05 builds directly on S04 and keeps capability IDs/version negotiation
  fail-closed without requiring canonical Holm runtime IDs.
- S06 builds on S05 and correctly separates caller context from adapter-private
  auth proof; production web/Node transports remain deferred.
- S07 is high-risk but bounded at 120m with explicit split guidance for plugin
  typing; it covers namespace ownership, dependency graph, rollback, and
  disposal.
- S08 integrates core lifecycle/fakes and explicitly defers HTTP and `/state`.
- S09 starts Issue `#005` only after the reviewed core and keeps endpoint
  payload/domain namespaces out of scope.
- S10 keeps transport cache separate from resource state and uses fake-clock
  deterministic tests for TTL/SWR/dedup/LRU behavior.
- S11 closes cache invalidation and diagnostics without inventing endpoint
  taxonomy.
- S12 completes Issue `#005` with upload seams plus migration/conformance
  ledger evidence and generated web/Node proof.
- S13 starts Issue `#006` at the canonical `@holmhq/sdk/state` subpath and
  explicitly avoids `/resources` and legacy public names.
- S14 waits for both state lifecycle and cache behavior before query
  refresh/reset work.
- S15 keeps optimistic mutation behavior explicit and coupled to queries only
  through invalidation hooks.
- S16 closes Issue `#006` while keeping realtime as invalidate/reconcile hooks,
  not a private/presence/collaboration capability claim.

TDD result: every slice has red -> green -> refactor language, red evidence in
review/queue evidence, final validation commands, path/LOC budget,
defers/non-goals, and stop/split rules. Generated ESM/declarations and source
behavior are validated once generated artifacts exist.

## Away-window Queue Check

Passing queue properties: 16 rows reference real S01-S16 plans in dependency
order; every row is queued and includes estimate, risk, ambiguity, mode,
validation, and stop rule; every row estimate is <=120m; scope and constraints
forbid release/publish/tag/deploy/cloud/credentials/destructive/cross-repo work,
parallel worktrees, and Issue `#007+`; the queue declares an 8h timebox with a
45m closeout reserve; independent review is required per completed slice and at
the A2 gate; blocker continuation is dependency-safe; done state preserves the
A2 stop; and progress accounting reports 4 issues and 16 slices.

Failing queue property:

- The summed row estimates are 28h20m, not the declared 18-24h nominal queued
  target. See P2-1.

## Passing Checks

- No P1 unsafe launch issue found in scope, boundaries, dependency ordering,
  TDD posture, auth/caller separation, `/state` naming, Issue `#007+` stop, or
  release/publish/deploy constraints.
- The S00 map and queue are consistent about serial `main` execution, per-slice
  reviews, clean pushed checkpoints, generated artifact validation, and final
  A2 review before owner decision.
- The plans do not redesign approved decisions `D001`-`D015`; they implement
  the approved contracts in a conservative order.
- No plan claims unavailable Holm action, private realtime, presence, scope,
  oplog, desktop, mobile, release, or publication capability.
- The dependency DAG is suitable for an unattended queue once the estimate
  accounting defect is fixed.

## Verification

Commands and checks run:

```text
pwd
git branch --show-current
git status --short --branch
git rev-parse --abbrev-ref --symbolic-full-name @{u}
git rev-parse HEAD
git fetch --quiet origin
git rev-parse origin/main
git diff-tree --no-commit-id --name-only -r HEAD
git diff-tree --no-commit-id --stat -r HEAD
awk -F'|' '/^\| [0-9][0-9] \|/ { ... }' koder/queue/001_a2_core_foundation/INDEX.md
```

Preflight results:

- Working directory: `/home/glasscube/Projects/holmhq/sdk`
- Branch: `main`
- Upstream: `origin/main`
- Status: clean before review write
- `HEAD == origin/main == eb459e4336d0978cc939877a29e5cd305ba1d7c8`
- Pinned commit changes exactly the 17 `koder/plans/001_S*/INDEX.md` files plus
  `koder/queue/001_a2_core_foundation/INDEX.md`
- Queue arithmetic: `rows=16 sum_minutes=1700 hours=28.33`

I did not run implementation tests, install dependencies, run the queue, edit
plans/issues/queue/state, or read outside the 27-file SDK review budget.

## Verdict

`NEEDS_FIXES`: 0 P1, 1 P2, 0 P3.

Queue `#001` is not safe to launch as written because the away-window effort
contract is mechanically inconsistent. Apart from P2-1, the conveyor is
dependency-safe, bounded to A2, TDD-first, and aligned with Issues `#003`-`#006`.

## Next Action

Fix P2-1 by making the S00 and Queue `#001` nominal effort target match the
actual row estimates, or by revising row estimates so the sum supports 18-24h.
Then rerun this queue review. Preserve the A2 stop before Issue `#007`; do not
start Queue `#001` until the estimate-accounting fix is reviewed.
