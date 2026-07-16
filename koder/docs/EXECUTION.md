---
title: Execution boundary
updated: 2026-07-17
window: none
mode: none
last_window: W3
last_queue: koder/queue/004_w3_issue009_runtime_adapters/INDEX.md
---

# Execution Boundary

## Current authorization

No execution window is active. W3 / Queue `#004` completed Issue `#009` and its
stop gate. Do not file or begin Issue `#014`, select a new orchestration mode,
or dispatch implementation workers until the owner explicitly chooses the next
window shape and `dispatch_models` policy.

Program order remains `#014` → `#008` → `#010` → `#011` → `#013` → `#012` →
`#015`. Older queue and execution records are evidence, not standing
authorization.

## Completed window: W3 — Issue #009

- Owner authorization: 2026-07-16, unattended blind orchestration for Issue
  `#009` only, serial on `main`, with `pi/gpt-5.5` as the sole automatic model
  and no fallback.
- Queue: `koder/queue/004_w3_issue009_runtime_adapters/INDEX.md`, drained.
- Plans: `koder/plans/003_S01_*` through `003_S06_*`, all implemented.
- Product result: common adapter conformance and deterministic in-memory/test
  adapter; reconciled web adapter; explicit Node/CLI services; structural Sobek
  injected runtime with no HTTP self-call; reserved desktop/mobile bridge mocks;
  isolated exports, declarations, examples, and tracked generated artifacts.
- Product commit: `f06d1c0ef8fd1fd2e1225ab4c60759d58a7a9c22`.
- Validation: four full CI modes green with identical coverage metrics
  (98.01 statements / 98.90 lines / 98.58 functions / 95.50 branches /
  100.00 changed-reachable), 212 source tests, clean rebuild reproducibility for
  227 dist artifacts, and size/license/example/declaration/dist gates green.
- Integrated SDK Review `#046`: approved, zero P1/P2/P3.
- Fresh read-only Holm-authority Review `#048`: accepted, zero P1/P2/P3 at Holm
  `fb34d6b` (v0.185.0), with no drift in mapped authority paths.
- Queue process failures: `4/6`; all were fail-closed and recovered within
  policy. No fallback model, push, release, deploy, credential, cloud,
  production, worktree, or cross-repository write occurred.

## Monitoring correction

The owner observed that a 60-minute outer watch made completed nested worker
phases insufficiently visible. Any future nested blind window must use governor
watch fences of at most five minutes, reconcile `harnex status`, typed reports,
and Git after each fence, and stop completed sessions promptly. Do not use a
long blocking outer watch merely because the inner coordinator has a longer wall
cap.

## W3 stop gate disposition

Satisfied:

1. S01-S06 implemented under strict TDD with owned source, tests, declarations,
   maps, generated JavaScript, manifests, package smoke, reproducibility, and
   size evidence.
2. Every implementation/fix received fresh independent review with no
   outstanding P1/P2.
3. Normal, FORCE_COLOR, TAP, and TAP+color CI modes passed with identical
   metrics and clean-tree build reproducibility.
4. Integrated Review `#046` approved with zero P1/P2/P3.
5. Holm-authority Review `#048` accepted with zero P1/P2/P3.
6. Issue `#009` is resolved and Queue `#004` is drained.

The next checkpoint is owner review of the W3 closeout and a separate W4 mode
decision. The completed W3 contract grants no Issue `#014` implementation
permission.

## Standing hard limits

- No npm publish, tags, releases, push, or deploy; `package.json` stays private.
- No credentials and no cloud/production mutation.
- Holm and every repository other than this SDK remain read-only unless the
  owner explicitly approves a cross-repository change.
- Serial on `main`; no worktrees without explicit owner approval.
