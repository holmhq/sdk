---
title: Active execution window
updated: 2026-07-16
window: W1
mode: blind
---

# Execution Window

## Authorization

- Owner authorization, 2026-07-16 (in-session, explicit): run the full SDK
  completion program at highest autonomy. The primary session acts
  EXCLUSIVELY as blind orchestrator; GPT-family workers implement, fix, and
  review via Harnex per the dispatch model policy. Koder-pattern blind
  orchestration governs process.
- Program scope and order: close Issue `#016`, then one blind queue per issue
  window: `#007` → `#009` → `#014` → `#008` → `#010` → `#011` → `#013` →
  `#012` → `#015`.
- Owner return points: blocked rows (fix-cycle/process budget exhausted,
  architecture or product-scope finding, any P1), any forbidden-action gate,
  and final program closeout. Otherwise proceed window to window, filing the
  next queue at each boundary.

## Active window: W1 — Issue #016 closeout

- Queue: `koder/queue/003_w1_issue016_closeout/INDEX.md`
- Stop gate: Issue `#016` closes only after (a) Review `#033` P2-2 is fixed
  and a focused independent review reports zero P1/P2 with all four CI modes
  green, and (b) a fresh read-only Holm-authority review accepts A2 at a
  named current Holm commit. Any P1/P2 or exhausted budget: block and return
  to owner.
- On completion: file the W2 queue (Issue `#007`) at the boundary and update
  this file. One active window at a time; future windows are not
  pre-authorized execution detail, only program order.

## Hard limits (all windows)

- No npm publish, tags, releases, or deploys; `package.json` stays private.
- No credentials, no cloud/production mutation; Holm repo strictly read-only
  (`~/Projects/holmhq/holm/master`); no edits to any other repository.
- Serial on `main`; no worktrees without explicit owner approval.
- `dispatch_models: [pi/gpt-5.5, codex/gpt-5.3-codex]`; never substitute an
  out-of-policy model/adapter to keep a run moving.
- Strict red → green → refactor TDD; a public source change owns its
  generated `dist/` JavaScript, declarations, maps, package smoke,
  reproducibility, and size gates in the same logical implementation.

## Blind overlay defaults (per queue unless a queue overrides)

- `review_granularity: entry`, `coordinator_entry_cap: 2`,
  `max_fix_cycles: 2`, `process_failure_budget: 6`,
  `independent_review: required`, `final_review_required: true` at each issue
  milestone.
- Preflight one real dispatch smoke for `pi` and `codex` before each
  unattended run; receipts under untracked scratch, promoted to durable
  queue/review artifacts before closeout.
