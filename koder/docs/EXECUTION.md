---
title: SDK Autonomous Execution Windows
updated: 2026-07-14
active_window: A2
active_issue: 003
requires_review_after: true
---

# Autonomous Execution Windows

This document grants bounded autonomy without silently crossing product-design
checkpoints. `koder/STATE.md` names the active window. Stop early on a genuine
blocker, but never continue beyond the named stop gate without a new owner
decision recorded here and in `koder/STATE.md`.

## Completed window — A1: architecture decision package

- **Result:** approved at SDK commit `0d443cf`.
- **Issue:** [`#002`](../issues/002_architecture_contract/INDEX.md).
- **Review:** [`01_codex.md`](../reviews/001_architecture_contract/01_codex.md)
  plus [`02_owner.md`](../reviews/001_architecture_contract/02_owner.md).
- **Decision:** `D001`–`D015` approved; `/state` is canonical and is not a
  legacy compatibility alias.

## Current window — A2: toolchain through framework-neutral state

- **Status:** ready
- **Issues:** `#003` → `#004` → `#005` → `#006`, serially
- **Autonomy:** plan, install repository-local development dependencies,
  implement with strict TDD, validate, review, commit, push, and maintain queue
  evidence
- **Stop gate:** core API/conformance package is decision-ready after `#006`;
  do not start Issue `#007`

### Required reading

1. `koder/STATE.md`
2. `koder/issues/001_universal_sdk_foundation/INDEX.md`
3. `koder/docs/{ARCHITECTURE,DECISIONS}.md`
4. The active child issue, beginning with
   `koder/issues/003_typescript_toolchain/INDEX.md`
5. The active plan/queue artifact named by `koder/STATE.md`, when present
6. `koder/docs/HOLM_SOURCE_MAP.md` only when a migration/conformance claim needs
   source routing; read Holm source at the pinned commit rather than guessing

### Ordered outcomes

1. **Issue `#003`:** strict TypeScript, test, declaration, generated-artifact,
   reproducibility, license, size, and CI harness.
2. **Issue `#004`:** environment-neutral core, capabilities, adapters, caller
   boundary, serialization, extensions, lifecycle, cancellation, and fakes.
3. **Issue `#005`:** transport, auth proof adapters, errors, deterministic cache,
   invalidation, uploads, diagnostics, and source-pinned migration evidence.
4. **Issue `#006`:** canonical `@holmhq/sdk/state` query/mutation/derived-resource
   API with immutable snapshots, subscriptions, optimistic rollback, and caller
   partitioning.

### Execution rules

- Work serially on `main`; do not overlap implementation agents or use
  worktrees unless the owner explicitly changes this rule.
- Use strict red → green → refactor for every implementation slice. Preserve
  evidence that the defining test/type fixture failed before production code.
- Keep slices queueable and independently validated; split work expected to
  exceed two hours rather than hiding it in one queue row.
- Review each completed implementation slice before advancing its dependent
  slice. A blocked entry must leave a clean committed checkpoint or no WIP.
- Resolve each child issue only after its acceptance criteria and source plus
  generated-artifact checks pass.
- Commit and push logical green checkpoints. Keep queue/run evidence concise and
  secret-free.

### Allowed in A2

- Add strict TypeScript source, tests, fixtures, declarations, tracked generated
  artifacts, build manifests, CI, and a lockfile.
- Select a minimal MIT-compatible local toolchain under Issue `#003` evidence.
- Read the existing Holm SDK/state source at a named commit for conformance.
- Update SDK issues, plans, reviews, queue state, README, and architecture
  clarifications that do not change an approved load-bearing decision.

### Forbidden in A2

- No npm publication, package release, Git tag, deploy, cloud spend, credentials,
  or registry token/workflow.
- No edits to Holm, Sobek, CDN, or another repository.
- No deletion, redirect, alias, or deprecation of Holm's existing SDK/state
  packages.
- No production app/admin endpoint migration (`#007`/`#008`), runtime-surface
  rollout (`#009`), actions (`#010`), realtime/collaboration/framework work
  (`#011`–`#013`), or final distribution work (`#014`/`#015`).
- No claim that unavailable Holm action, scope, private realtime, collaboration,
  desktop, or mobile capabilities ship.

### Validation before stopping

- All acceptance criteria for completed A2 issues are evidenced.
- Core and `/state` compile without DOM, Node, or framework ambient leakage.
- Source, type, declaration-consumer, conformance, generated-bundle,
  reproducibility, license, and size checks pass as applicable.
- A final independent review covers public API coherence, security boundaries,
  generated artifacts, and migration evidence.
- Working tree/index are clean and `main` is synchronized after close.

### Review return

Return at the earliest of:

1. all A2 queue entries through Issue `#006` pass and the core/state contract is
   ready for owner review;
2. a product or architecture decision would change `D001`–`D015`;
3. a required dependency/license, Holm source contradiction, or repeatable
   validation failure blocks safe progress.

Report commits, tests/checks, issue and slice delta, queue state, API/bundle-size
summary, blockers, and a recommendation. **Do not begin Issue `#007`.**

## Future windows (not yet authorized)

| Window | Scope | Entry gate | Stop gate |
| --- | --- | --- | --- |
| A3 | Issues `#007`–`#010`: app/admin migration and surface/action adapters | A2 approved | migration/API review |
| A4 | Issues `#011`–`#013`: realtime, collaboration seam, frameworks | A3 approved + relevant Holm capability truth refreshed | extension/framework review |
| A5 | Issues `#014`–`#015`: BFBB artifacts, docs, closeout | A4 approved | release-readiness decision; npm still blocked |

These rows are planning boundaries, not permission to execute. Activate one by
updating this file and `koder/STATE.md` in a reviewed `state:` commit.
