---
title: Execution boundary
updated: 2026-07-17
window: W5
mode: direct owner-present
last_window: W4
completed_issue: 017
queue: none
integrated_review: koder/reviews/058_issue017_v01_web_rc_integrated_review/INDEX.md
holm_acceptance: koder/reviews/059_issue017_holm_authority_acceptance/INDEX.md
---

# Execution Boundary

## Owner acceptance — 2026-07-17

The owner accepted private `0.1.0-rc.1` (product checkpoint `dc4af0d`,
integrated Review `#058`, Holm-authority Review `#059` against Holm `748cbe5`)
and its post-RC checklist. The RC gate is closed.

## Slim process defaults (owner decision, 2026-07-17)

The heavy orchestration machinery is retired for this phase:

- Direct execution on `main`, owner-present. No queues, no blind mode, no
  worker dispatch.
- Independent review cycles are required only for changes that touch the frozen
  stable API surface or Holm protocol conformance. Everything else ships on
  green validation.
- TDD and the CI/validation gates stay — they are cheap and effective.
- Issues `#008`, `#010`–`#013` are reclassified deferred/demand-driven; they do
  not count toward v0.1 completion.
- Issue `#015` is trimmed to its load-bearing scope (see its INDEX).

## Active window — W5: real-app pilot + trimmed #015

Owner-authorized on 2026-07-17:

- Build a real pilot app (`sokoban`, auth + leaderboard) at
  `~/Projects/zyt/sokoban/`, consuming the SDK via vendored local `dist/`
  artifacts pinned to product checkpoint `dc4af0d`, hash-verified against
  `dist/manifest.json`. Never `@main`.
- Running a local Holm dev server for the pilot is in scope; the Holm
  repository itself stays read-only.
- Record actual app/browser observations as pilot evidence.
- Complete trimmed Issue `#015` (README, migration ledger, capability matrix,
  vendoring guide, vanilla + React examples, ledger reconciliation).

Stop gate: no push, tag, npm publish, release, deploy, credentials,
cloud/production mutation, or promotion to `0.1.0`. Promotion is considered
only after the pilot demonstrably works, in an owner-present decision.

## Standing hard limits

- `package.json` remains private until explicit owner approval changes it.
- Holm and every repository other than this SDK and the pilot app directory
  remain read-only unless the owner explicitly approves a change.
- Serial on `main`; no worktrees without explicit owner approval.
