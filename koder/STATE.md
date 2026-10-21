---
updated_at: "21 Oct 2026 | 11:37 PM IST"
state: REVIEW_READY
active_window: "public-tree privacy cleanup; supervisor review before push"
active_issue: "privacy cleanup; Issue #019 remains historically resolved"
orchestration_mode: "direct worker; privacy-cleanup worktree; no queue"
stop_gate: "supervisor reviews and pushes; no worker push, tag, publish, deploy or cross-repository access"
---

# Koder State

## Current handoff

- The current public tree was cleaned without accessing the private Holm checkout
  or rewriting history. Source-map/internal routing dumps were removed; historical
  issues, plans and reviews retain neutral summaries and product decisions.
- This repo is public: never record Holm source paths, Holm commit IDs or Go
  identifiers. Cite Holm versions and public HTTP behaviour; maintainers keep
  the internal source map and exact verification privately.
- `scripts/check-public-privacy.mjs` and its regression test are wired into CI and
  therefore `release:check`. The scanner checks tracked working-tree bytes and
  symlink text without following links outside the repo.
- Public app/admin route ledgers remain useful: 12 app route keys / 15 pairs,
  176 admin keys / 191 route-method contracts / 218 methods / 18 exclusions.
- The admin authority tool accepts an optional JSON export; it skips cleanly
  without an explicit file. No private checkout is required by release validation.
- Source changes are comment-only privacy rewrites; public API shapes and runtime
  behaviour are unchanged. Affected tracked declarations/maps/manifest were rebuilt.
- Full release gate passed: 231 source tests, 25 dist tests, 267 reproducible
  artifacts, 290-file installed-package smoke, 72-package license check and size.
  Coverage: statements 98.06, lines 98.95, functions 98.65, branches 95.32,
  changed reachable 100.00. Privacy/tooling regression tests pass 4/4.
- Dependency install reported 4 existing audit findings (1 moderate, 3 high);
  dependency/security remediation is outside this cleanup. No audit fix was run.

## Product memory

- Issue `#019` remains resolved through Review `#073` at SDK `f623a8c`.
  Historical full-server/internal parity checks are no longer public CI gates.
- `@holmhq/sdk@0.2.1` remains the public immutable release; unreleased retention
  helpers remain in the reviewed source. No version or release changed here.
- WebSocket transport, direct Sobek capabilities, discovery, action/schema and
  native-runtime work remain separately demand- and review-gated.
- Release access recovery and Medialab acceptance remain deferred; this cleanup
  grants no authority to use credentials or mutate another repository.

## Next

Supervisor reviews this branch and the removal receipt, then decides whether to
push. Preserve unrelated untracked `.harnex/dispatch.jsonl` telemetry; it is not
part of the public-tree changes. Do not begin another issue or release operation.
