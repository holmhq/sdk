---
title: Active execution window
updated: 2026-07-16
window: W2
mode: direct
---

# Execution Window

## Authorization

- Owner authorization, 2026-07-16 (in-session, explicit): W1 (Issue `#016`
  closeout, blind queue `003`) is complete with all gates satisfied. For W2
  the owner selected **owner-present direct execution with spot dispatches**,
  superseding the blind-orchestrator shape for this window: the primary
  session implements directly under strict TDD; Harnex dispatches are used
  only for independent reviews and explicitly delegated spot tasks.
- Rationale (recorded): W1's tail was resolved directly at owner direction
  and went cleanly; Issue `#007` is design-heavy (route audit, adapter
  boundaries, selective migration) and suits owner-present judgment.
- Program order unchanged: `#007` → `#009` → `#014` → `#008` → `#010` →
  `#011` → `#013` → `#012` → `#015`. Mode and `dispatch_models` are decided
  per window; this decision covers W2 only. At the W2 boundary, return to
  the owner for the W3 mode decision.

## Active window: W2 — Issue #007 web and app client

- Issue: `koder/issues/007_web_app_client/INDEX.md`
- Mode: owner-present direct in the primary session; strict red → green →
  refactor TDD; serial on `main`. No queue is filed for this window.
- Spot dispatches: independent reviews at issue milestones, plus any task the
  owner explicitly delegates. Preflight one real dispatch smoke for `pi`
  before each unattended dispatch batch.
- Stop gate: Issue `#007` closes only after (a) full validation green in all
  four CI modes with clean-tree build reproducibility, (b) one independent
  SDK review via dispatch reporting zero P1/P2, and (c) a fresh read-only
  Holm-authority conformance check of the web-client route/auth surfaces at a
  named current Holm commit. Any P1/P2 or exhausted budget: block and return
  to owner.

## Hard limits (all windows)

- No npm publish, tags, releases, or deploys; `package.json` stays private.
- No credentials, no cloud/production mutation; Holm repo strictly read-only
  (`~/Projects/holmhq/holm/master`); no edits to any other repository.
- Serial on `main`; no worktrees without explicit owner approval.
- `dispatch_models: [pi/gpt-5.5]`. Owner decision 2026-07-16:
  `codex/gpt-5.3-codex` is removed from policy for W2 after three integrity
  failures in run q003-w1 (ack-only response, false environment blocker,
  fabricated review verdict). No fallback adapter: if `pi` fails preflight or
  exhausts the process-failure budget, dispatches block and return to the
  owner. Never substitute an out-of-policy model/adapter to keep work moving.
- Strict red → green → refactor TDD; a public source change owns its
  generated `dist/` JavaScript, declarations, maps, package smoke,
  reproducibility, and size gates in the same logical implementation.

## Dispatch defaults (spot dispatches this window)

- `independent_review: required` at the issue milestone;
  `final_review_required: true` before the stop gate is declared satisfied.
- `max_fix_cycles: 2` per review finding batch before returning to the owner.
- Required artifact-report sidecars remain mandatory on every dispatch;
  receipts under untracked scratch, promoted to durable review artifacts
  before closeout.
