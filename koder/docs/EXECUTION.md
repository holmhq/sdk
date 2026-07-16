---
title: Active execution window
updated: 2026-07-16
window: W3
mode: blind
queue: koder/queue/004_w3_issue009_runtime_adapters/INDEX.md
---

# Execution Window

## Authorization

- Owner authorization, 2026-07-16 (in-session, explicit): after W2 / Issue
  `#007` completed, the owner requested a long queue or multiple queues that
  could drain unattended overnight. W3 therefore uses **blind orchestration**
  for Issue `#009` only.
- Outcome disclosed before launch: product code, tests, declarations, and
  tracked generated artifacts across six reviewed runtime-adapter slices; about
  10-18 fresh worker phases including entry reviews/fixes and one integrated
  final review; up to about eight hours wall time with a 45-minute closeout
  reserve.
- W3 does not authorize Issue `#014` or a multi-issue conveyor. The queue stops
  when Issue `#009` is accepted or a fail-closed gate blocks it.
- Program order after this boundary remains `#014` → `#008` → `#010` → `#011`
  → `#013` → `#012` → `#015`; every later window requires a fresh owner mode
  decision.

## Active window: W3 — Issue #009 runtime and surface adapters

- Issue: `koder/issues/009_runtime_surface_adapters/INDEX.md`.
- Queue: `koder/queue/004_w3_issue009_runtime_adapters/INDEX.md`.
- Reviewed plans: `koder/plans/003_S01_*` through `003_S06_*`; independent
  Review `#040` approved the family with zero P1/P2/P3 at `bbf9388`.
- Mode: unattended blind orchestration, serial on `main`. The root session is a
  process-only governor. Fresh coordinators own at most two entries and route
  fresh implement, review, fix, rereview, recovery, and final-review workers.
  The governor/coordinators must not ingest product source, diffs, worker
  transcripts, or finding prose.
- Target window: 2026-07-16 23:53 IST through 2026-07-17 07:45 IST. Start no new
  implementation phase after 07:00 IST; reserve the remainder for validation,
  review, accounting, and handoff.
- First product-visible result: common adapter conformance plus the deterministic
  in-memory/test adapter (S01).
- Holm authority: live Issue `#534` at planning commit `55cd8213` (v0.185.0)
  supersedes old Issue `#486`. GET/POST remains Holm's canonical app wire;
  SDK operation envelopes stay internal and any Sobek/in-process seam must
  preserve canonical caller/validation/response/error semantics. Holm is
  read-only and currently has unrelated pre-existing dirty work.

## Stop gate

Issue `#009` closes only after:

1. S01-S06 are implemented under strict red → green → refactor TDD, with each
   public source change owning affected JavaScript, declarations, maps, package
   smoke, reproducibility, and size evidence.
2. Every implementation/fix receives a fresh independent entry review with zero
   outstanding P1/P2; semantic fix cycles are capped at two.
3. Full validation is green in normal, FORCE_COLOR, TAP, and TAP+color modes
   with identical coverage metrics and clean-tree build reproducibility.
4. A fresh integrated SDK review reports zero P1/P2.
5. A fresh read-only Holm-authority review accepts the adapter boundary against
   Issue `#534` at a named current commit.
6. Git is clean and committed.

Any P1/P2 at the final gate, architecture/product decision, Holm contradiction,
out-of-policy model requirement, process-failure budget exhaustion, or timebox
boundary blocks and returns to the owner. Do not continue into Issue `#014`.

## Blind-run overlay

- `dispatch_models: [pi/gpt-5.5]`; no automatic fallback is authorized. The Pi
  preflight passed before launch. Never substitute another model or adapter.
- `review_granularity: entry`; `coordinator_entry_cap: 2`;
  `max_fix_cycles: 2`; queue-global `process_failure_budget: 6`;
  `final_review_required: true`; implementation ownership is serial.
- Compact required Harnex reports live under ignored `.harnex/q004/`; durable
  queue/review artifacts retain the minimum owner-facing proof. Missing or
  malformed proof fails closed.
- Coordinators batch queue/issue/plan accounting with logical work or resumable
  checkpoints; no metadata-only phase worker and no commit per frontmatter
  transition.

## Hard limits

- No npm publish, tags, releases, push, or deploy; `package.json` stays private.
- No credentials and no cloud/production mutation.
- Holm and every repository other than this SDK are read-only; no cross-repo
  edits or tests that mutate their worktrees.
- Serial on `main`; no worktrees.
- No Issue `#014`, admin, actions/CLI projection, realtime, collaboration,
  framework binding, production desktop/mobile, or Holm Issue `#534`
  implementation under W3.
