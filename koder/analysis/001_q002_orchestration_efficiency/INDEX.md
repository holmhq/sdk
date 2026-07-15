---
status: complete
priority: P1
issue: 016
type: analysis
tags: koder-pattern, queue, blind-orchestration, harnex, models, telemetry, efficiency
created: 2026-07-15
updated: 2026-07-15
sdk_baseline: d381613c65a6307adae56515f08ef650fb22dcb0
koder_pattern_repo: /home/glasscube/Projects/pi
koder_pattern_baseline: c4d3c877b686980aef526e37d4cf32dab61f7792
---

# Analysis 001: Queue 002 Orchestration Efficiency and Koder-Pattern Feedback

## Purpose

Provide a self-contained evidence package for an independent model to assess:

1. whether Queue `#002` time, token, and known cost were justified by the product
   and quality delta;
2. whether model/adapter selection was appropriate;
3. which inefficiencies came from the reusable koder-pattern skill versus this
   SDK repository's queue/plan overlay;
4. what should change before Queue `#002` recovery or a future unattended run.

This is analysis, not authorization or an implementation plan. Queue `#002`
remains blocked and no recovery window is active.

## Repositories and immutable context

### SDK evidence repository

- Repository: `/home/glasscube/Projects/holmhq/sdk`
- Branch: `main`
- Pre-analysis close checkpoint:
  `d381613c65a6307adae56515f08ef650fb22dcb0`
- Active issue: `koder/issues/016_a2_authority_conformance_remediation/INDEX.md`
- Queue: `koder/queue/002_a2r_authority_conformance/INDEX.md`
- Execution boundary: `koder/docs/EXECUTION.md`
- Repo blind overlay: `koder/docs/BLIND_ORCHESTRATION.md`

### Koder-pattern source repository

Koder-pattern resides in the separate Pi configuration repository:

- Repository: `/home/glasscube/Projects/pi` (`~/Projects/pi`)
- Branch observed: `master`
- Commit observed: `c4d3c877b686980aef526e37d4cf32dab61f7792`
- Skill source: `/home/glasscube/Projects/pi/.pi/skills/koder-pattern/`
- Global skill path: `/home/glasscube/.pi/agent/skills/koder-pattern`
- The global path is a symlink to the Pi repository skill path.
- Last commit touching the skill path observed during this analysis:
  `4e53da1` (`fix: make koder-pattern delivery-first`).
- The Pi repository was observational only; this analysis does not modify it.

Likely reusable skill references for an independent reviewer:

- `~/Projects/pi/.pi/skills/koder-pattern/references/queues/mode-selection.md`
- `~/Projects/pi/.pi/skills/koder-pattern/references/queues/queue-run.md`
- `~/Projects/pi/.pi/skills/koder-pattern/references/queues/blind-orchestration.md`
- `~/Projects/pi/.pi/skills/koder-pattern/references/queues/blind-briefs.md`
- `~/Projects/pi/.pi/skills/koder-pattern/references/queues/blind-recovery.md`
- `~/Projects/pi/.pi/skills/koder-pattern/references/harnex/dispatch.md`
- `~/Projects/pi/.pi/skills/koder-pattern/references/harnex/monitoring.md`
- `~/Projects/pi/.pi/skills/koder-pattern/references/shared/state-commit-protocol.md`

## Scope and safety

Inspected:

- canonical Queue `#002`, Issue `#016`, plans S01/S03/S06, and Reviews
  `#028`-`#030`;
- Git commit/path/numstat evidence from authorization through close;
- compact Harnex dispatch telemetry and typed artifact reports;
- recorded validation exits and bounded failure facts.

Not inspected or retained here:

- full prompts, worker transcripts, private payloads, credentials, long logs, or
  generated bundle contents;
- model chain-of-thought or hidden provider billing;
- source implementation detail beyond canonical review/plan references.

Cost and token totals below are incomplete where the active adapter did not emit
telemetry. They must not be represented as complete billing truth.

## Promised run

Owner authorization requested an unattended drain of Queue `#002`, followed by
session close, statistics, and machine suspension. The declared queue contained
six serial blind-strict rows with per-entry independent review and a complete
A2R authority stop gate.

Queue estimates:

| Row | Estimate | Result at close |
| --- | ---: | --- |
| S01 | 90m | done and independently approved |
| S02 | 105m | done and independently approved |
| S03 | 110m | blocked after two fix cycles; Review `#030` has one P2 |
| S04 | 120m | queued |
| S05 | 95m | queued |
| S06 | 120m | queued |

The first three row estimates total `305m` (`5h05m`). The run reached the S03
blocker after approximately `3h36m`, but did not complete S03.

## Timeline observations

| Time (IST) | Event | Durable evidence |
| --- | --- | --- |
| 14 Jul 22:59:49 | Owner window recorded; base `efee699` | `ca368d6` |
| 23:07-23:25 | Coordinator 01 implemented/reviewed S01; fix dispatches refused | `a15b3df`, `aa56435`, `f096626` |
| 23:36-23:39 | Two Codex app-server coordinator boots ended without receipts due sandbox/path constraints | Harnex terminal telemetry |
| 23:44-23:49 | Coordinator 03; writable Codex legacy workers failed registration | `acc4709` |
| 23:51-00:17 | Coordinator 04; Codex legacy workers stalled/disconnected without phase proof | `f1d7acf` |
| 15 Jul 00:21-02:36 | Coordinator 05 used Claude Sonnet for implementation/fix and Pi/GPT-5.5 for review | S01-S03 commits and Reviews `#028`-`#030` |
| 00:50 | S01 approved | `da7cd8d`, queue checkpoint `eccb1f2` |
| 01:14 | S02 approved | `5d0df5d`, queue checkpoint `ebf057b` |
| 01:45-02:35 | S03 implementation plus two fix/review cycles | `206b0e8`, `4c2bff3`, `5596d0b`, Reviews `#028`-`#030` |
| 02:36 | Coordinator 05 stopped at max-fix-cycle blocker | `93af67a` |
| 06:18 | Owner-facing close resumed; `npm run ci` exposed size failure | Queue/Issue closeout entries |
| 06:20:31 | Clean blocked close pushed | `d381613` |

Authorization-to-close wall time was `7h20m42s`. The interval from the S03
blocker to close was approximately `3h44m`; no further product phase launched.
The interactive root did not autonomously finalize immediately when the
background coordinator stopped.

## Product and quality delta

From `efee699` through close `d381613`:

| Metric | Observed |
| --- | ---: |
| Commits | 20 |
| Changed paths | 26 |
| Total line delta | `+1134 / -120` |
| Product source/test line delta | `+722 / -56` |
| Koder/review/operator line delta | `+412 / -64` |
| Implementation/fix commits | 6 |
| Review commits | 4 |
| Authorization/checkpoint/close commits | 10 |

Quality state:

- S01 and S02 have clean independent approval proof.
- S03 source-level findings were reduced to zero P1 and one P2.
- Review `#030` says the remaining P2 is stale tracked `dist/` output: source
  exposes the corrected read-only capability/extension contract, while package
  artifacts still expose the pre-S03 mutable contract.
- Closeout `npm run ci` passed `133/133` source tests and license checks, then
  failed `npm run size` because `dist/transports/index.js` was `19342` bytes
  against a `16384`-byte budget.
- Failed generated output was not committed because repository policy requires
  source, declarations, dist smoke, reproducibility, license, and size gates to
  pass before tracked `dist/` is committed.

Canonical evidence:

- `koder/reviews/027_a2r_s01_envelope_implementation/INDEX.md`
- `koder/reviews/028_a2r_s03_capability_extension_ownership/INDEX.md`
- `koder/reviews/029_a2r_s03_capability_extension_ownership_rereview/INDEX.md`
- `koder/reviews/030_a2r_s03_capability_extension_ownership_rereview_2/INDEX.md`

## Telemetry observations

### Aggregate

| Metric | Observed |
| --- | ---: |
| Harnex dispatches | 25 |
| Coordinator dispatches | 6 |
| Phase-worker dispatches | 19 |
| Failed/no-proof phase-worker dispatches | 7 |
| Harnex-accounted tokens | 21,862,660 |
| Accounted input tokens | 1,346,624 |
| Accounted cached tokens | 20,381,824 |
| Accounted output tokens | 151,236 |
| Cached share of accounted total | approximately 93% |
| Recorded Pi cost | `$21.17814` |
| Dispatches missing cost telemetry | 12 |
| Dispatches missing token telemetry | 10 |

The recorded cost is a lower bound, not the all-in cost. Claude legacy-PTY
implementation/fix workers and several Codex attempts did not expose complete
usage/cost data. Root interactive-session usage is also unavailable.

### Coordinator versus phase workers

| Class | Dispatches | Accounted tokens | Recorded cost |
| --- | ---: | ---: | ---: |
| Coordinators | 6 | 10,710,186 | `$10.272902` |
| Phase workers | 19 | 11,152,474 | `$10.905238` |

Approximately half the accounted token volume and known cost was spent in
coordinator sessions. Coordinator duration and worker duration overlap, so
summed active seconds must not be treated as wall time.

### By adapter/model family

| Adapter family | Dispatches | Accounted tokens | Recorded cost | Durable result pattern |
| --- | ---: | ---: | ---: | --- |
| Pi / GPT-5.5 | 13 | 21,809,543 | `$21.17814` | native reports; productive implementation/reviews; two zero-token fix refusals |
| Codex / GPT-5.3 Codex | 6 | 53,117 | unavailable | no product commits; app-server sandbox and legacy-PTY boot/registration failures |
| Claude / Sonnet | 6 | unavailable | unavailable | five product commits; reports often existed despite disconnected terminal state |

### Phase shape

| Phase | Dispatches | Accounted tokens | Recorded cost | Notes |
| --- | ---: | ---: | ---: | --- |
| coordinate | 6 | 10,710,186 | `$10.272902` | four extra recovery/configuration coordinators beyond a healthy 1-2 segment shape |
| implement | 3 | 2,491,499 | `$2.080259` | Claude implementation usage absent |
| review | 3 | 5,026,737 | `$4.890688` | substantive findings and one clean approval |
| fix | 10 | unavailable/partial | unavailable | seven no-proof/no-commit attempts and three durable fix commits |
| rereview | 3 | 3,634,238 | `$3.934291` | progressively reduced S03 findings |

## Adapter and recovery sequence

1. Pi/GPT-5.5 implementation and review produced valid S01 proof.
2. Two Pi/GPT-5.5 fix sessions completed with zero tokens, no report, and no
   commit; the phase circuit breaker opened.
3. A Codex app-server coordinator could not read `/tmp` under its sandbox.
4. Moving runtime controls under ignored `.harnex/` allowed reading, but the
   Codex app-server workspace remained read-only.
5. Codex legacy PTY with write bypass first failed Harnex registration within
   the default timeout; extending registration still led to trust-prompt boot
   and disconnect/no-receipt outcomes.
6. Switching implementation/fix to Claude Sonnet produced commits and typed
   artifact reports. Harnex terminal state commonly reported `disconnected`, so
   coordinators reconciled canonical reports, commits, validation, and Git.
7. Pi/GPT-5.5 remained the independent reviewer and produced the canonical
   finding progression.

Observation: circuit breakers prevented infinite retries, but each adapter,
configuration, or brief change reset the local retry opportunity. There was no
queue-global orchestration-failure budget, so multiple two-attempt circuits
could accumulate before a proven adapter was selected.

## Plan and review observations

### S01 omitted generated artifact and size gates

`koder/plans/002_S01_holm_envelope_semantics/INDEX.md` owned source/tests/ledger
only and validated targeted source tests plus `typecheck:core`. It did not require:

- build/regeneration of tracked `dist/`;
- declaration or package-surface tests;
- dist smoke tests;
- the transport size budget.

S01's initial implementation exceeded its target changed-line budget (`244`
telemetry-observed changed lines versus target `<=220`) and closeout later found
the transport artifact size regression.

### S03 ownership and validation were narrower than the actual change

`koder/plans/002_S03_capability_extension_ownership/INDEX.md` bounded ownership
to three core source files and three source tests. The eventual change needed
additional public barrels, invocation/state consumers, and tracked package
artifacts. The plan validated source tests and `typecheck:core`, but not build,
declarations, dist, package exports, or size.

The initial S03 implementation recorded `331` changed lines versus the plan's
`<=260` target, before two subsequent fixes.

Reviews progressed as follows:

- Review `#028`: two P2 source/API findings (public updater exposure and
  non-atomic registration).
- Review `#029`: one remaining P2 source/API finding (mutable registry still on
  public seams).
- Review `#030`: source findings resolved; one P2 because tracked `dist/` still
  exposed the old contract.

Observation: generated/public package parity was not included in the first
review contract, so a mechanical artifact-completion finding appeared only after
the two semantic fix cycles were exhausted.

### S06 defers full gates but does not own product fixes

`koder/plans/002_S06_integrated_authority_return/INDEX.md` is the first plan that
requires build/dist/declaration/repro/license/size/CI integration, while also
stating that product/test edits belong to S01-S05. This can discover a final
gate failure without giving S06 ownership to resolve it.

### Plan approval did not catch the cross-cutting invariant

Review `#026` approved the plan family with zero P1/P2/P3, but the plan family
did not encode this repository's tracked-`dist` and size requirements at the
rows that changed public/runtime source. A stronger model may help, but a
mechanical cross-cutting review checklist would be more reliable than relying on
model recall.

### Targeted test commands were not truly targeted

Canonical reviews state that commands shaped as:

```bash
npm run test:source -- test/source/core/capabilities.test.ts
```

still enumerated the compiled source suite. Multiple nominally targeted commands
therefore repeated broad validation and verbose evidence. The suite was fast,
but the command contract and proof were misleading.

## Process interpretation to challenge independently

The following are hypotheses, not settled decisions:

1. The product/quality delta is material and likely justifies a modest dollar
   cost, but the recorded `$21.17814` is only a lower bound.
2. Raw token efficiency is poor even after accounting for cache because roughly
   half of measured usage belongs to coordinators rather than code/review roles.
3. The strongest review model was valuable; changing all roles to a stronger
   model would not address adapter, plan-gate, commit, or autonomy defects.
4. A healthy S01-S03 run likely needed 1-2 coordinators, not 6.
5. Ten process/checkpoint commits out of twenty indicate that commit
   amplification remained high despite delivery-first policy.
6. Missing generated artifacts should possibly be classified as an incomplete
   implementation gate rather than consuming a semantic fix cycle.
7. The away-window governor was not durable enough: background work continued,
   but owner-facing close required the interactive session to resume.

## Candidate reusable koder-pattern improvements

An independent model should assess whether these belong in the shared skill,
the SDK overlay, or both:

### Launch readiness

- Require one exact-adapter smoke dispatch before a long blind run: task read,
  workspace write, command execution, artifact-report ingestion, completion
  signal, Git safety, and optional commit/push permission.
- Pin task/report roots inside a path compatible with the selected sandbox.
- Record one proven fallback adapter before launch.

### Global process circuit breaker

- Keep per-phase two-attempt breakers, but add a queue-global cap on adapter,
  boot, permission, and receipt failures across reconfigurations.
- Require explicit owner return after the global cap rather than allowing every
  changed configuration to start a fresh unbounded retry family.

### Generated artifact contract

- For repositories with tracked generated artifacts, every source-changing row
  should declare generated ownership and run affected build/declaration/dist
  smoke/size checks before approval.
- Final integration should repeat gates, not discover the first generated
  failure when the integration row cannot own product fixes.

### Review completeness and fix-cycle accounting

- Review briefs should explicitly audit source, public barrels, package exports,
  generated JS/declarations/maps, and size where relevant.
- Distinguish `implementation_incomplete` (missing required artifact/proof) from
  a semantic `needs_fixes` cycle.
- Ask the first reviewer to report all currently observable findings rather than
  serializing independent classes across rereviews.

### Coordinator economy

- Move receipt parsing, dependency selection, Git checks, deadline checks, and
  queue transitions into a deterministic runner where possible.
- Use a cheaper model for exceptional coordinator judgment; reserve strongest
  models for implementation/review/authority reasoning.
- Add a coordinator token/process budget, for example a warning when coordinator
  usage exceeds 20-25% of run-accounted tokens.

### Commit economy

- Make finding review commits canonical, but batch queue approval/run-log state
  at coordinator rollover or final blocker.
- Track the ratio of product/review commits to process-only commits and warn on
  one process commit per row/phase behavior.

### Durable away-window governor

- Use a supervisor that survives the interactive API turn, can launch a fresh
  coordinator at rollover, and can perform blocked close/statistics/suspend at a
  terminal gate without requiring a later `resume` message.
- Ensure the governor still respects owner stop gates and never promotes itself
  into implementation context.

### Telemetry completeness

- Do not call a cost figure complete when adapters omit usage.
- Record model/provider/adapter, token/cost availability, report ingestion,
  process outcome, semantic outcome, and anomaly class separately.
- Prefer structured adapters over PTY when the structured mode can be granted
  the exact required write scope.

## Suggested model-role question

Evaluate this candidate matrix rather than assuming one model should own all
roles:

| Role | Candidate | Rationale / uncertainty |
| --- | --- | --- |
| governor | deterministic process/service | should not consume model context for routine transitions |
| coordinator | lower-cost model at medium effort | process judgment only; requires reliable tools |
| implement/fix | GPT-5.3 Codex high after write-enabled structured preflight | coding-specialized, but this run did not actually test it under a valid adapter |
| fallback implement/fix | Claude Sonnet after completion/telemetry wrapper repair | produced five durable commits, but PTY terminal/usage proof was weak |
| per-entry strict review | GPT-5.5 high | produced substantive security/API findings with reliable typed reports |
| final SDK/Holm authority | strongest fresh review context | milestone claim warrants maximal assurance |

## Questions for independent review

1. Was blind-strict per-entry review proportional to S01-S05 risk, or should some
   rows use one integrated review boundary?
2. Which measured overhead is inherent assurance cost versus accidental adapter
   churn?
3. Is coordinator token share near 49% acceptable for blind mode? If not, what
   threshold and enforcement mechanism should the shared skill define?
4. Should missing generated artifacts consume a fix cycle, or should the row
   remain `implementing` until its complete artifact contract exists?
5. How should koder-pattern distinguish a model failure from an adapter/sandbox
   failure before changing models?
6. What is the minimal preflight that predicts write/report/commit success
   without creating process ceremony larger than the expected work?
7. Should the shared skill require generated-artifact gates, or should it merely
   require repos to declare whether such gates exist?
8. Which of the candidate changes belong in `~/Projects/pi` versus this SDK's
   `AGENTS.md`, `EXECUTION.md`, Queue `#002`, or plan templates?
9. What model/effort choices minimize cost while preserving independent review
   quality for auth/protocol/security rows?
10. How should an unattended governor close and suspend reliably when the root
    interactive turn is no longer running?

## Reproduction commands

Run from `/home/glasscube/Projects/holmhq/sdk` at or after the recorded close
checkpoint. Commands intentionally avoid transcripts and private prompts.

```bash
# Session commits and line accounting
git rev-list --count efee699c1b742269099706cb6a5537a84c423bd6..d381613c65a6307adae56515f08ef650fb22dcb0
git diff --name-only efee699c1b742269099706cb6a5537a84c423bd6..d381613c65a6307adae56515f08ef650fb22dcb0
git diff --numstat efee699c1b742269099706cb6a5537a84c423bd6..d381613c65a6307adae56515f08ef650fb22dcb0
git log --oneline efee699c1b742269099706cb6a5537a84c423bd6..d381613c65a6307adae56515f08ef650fb22dcb0

# Canonical queue/review evidence
git show d381613:koder/queue/002_a2r_authority_conformance/INDEX.md
git show d381613:koder/issues/016_a2_authority_conformance_remediation/INDEX.md
git show d381613:koder/reviews/030_a2r_s03_capability_extension_ownership_rereview_2/INDEX.md

# Plan contracts
git show d381613:koder/plans/002_S01_holm_envelope_semantics/INDEX.md
git show d381613:koder/plans/002_S03_capability_extension_ownership/INDEX.md
git show d381613:koder/plans/002_S06_integrated_authority_return/INDEX.md

# Koder-pattern origin
git -C /home/glasscube/Projects/pi rev-parse HEAD
readlink -f /home/glasscube/.pi/agent/skills/koder-pattern
```

Ephemeral Harnex telemetry was aggregated during the run from
`/tmp/koder-sdk-q002-runtime/`. `/tmp` is not durable evidence; the aggregate
facts required for independent analysis are captured above, while canonical
semantic outcomes remain in Git.

## Residual uncertainty

- Complete Claude and Codex token/cost usage is unavailable.
- Root interactive-session usage is unavailable.
- The reason Pi/GPT-5.5 returned two zero-token fix refusals is known only as a
  model/transport refusal class; no private transcript is retained here.
- Provider invoice treatment of cached tokens and subscription-backed CLIs is
  not established.
- This analysis does not benchmark alternative models on the same fixed task.
- No independent model has yet reviewed these observations or proposed the
  actual koder-pattern patch.

## Recommended next action

Ask a fresh powerful model to review this artifact together with the referenced
SDK and `~/Projects/pi` skill files, then produce a separate proposal or review
that clearly divides:

1. shared koder-pattern changes;
2. SDK-specific overlay/plan corrections;
3. Harnex adapter fixes;
4. model-role recommendations supported by a small preflight benchmark.

Do not restart Queue `#002` or edit the Pi repository solely from this analysis;
those require explicit authorization and their own reviewed change scope.
