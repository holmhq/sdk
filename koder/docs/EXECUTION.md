---
title: Execution boundary
updated: 2026-07-17
window: none
mode: none
last_window: W4
completed_issue: 017
queue: koder/queue/005_w4_v01_web_release_candidate/INDEX.md
integrated_review: koder/reviews/058_issue017_v01_web_rc_integrated_review/INDEX.md
holm_acceptance: koder/reviews/059_issue017_holm_authority_acceptance/INDEX.md
---

# Execution Boundary

## Current authorization

No execution window is active. Owner-authorized W4 Queue `#005` completed and
closed at the private `0.1.0-rc.1` readiness gate on 2026-07-17. The temporary
blind orchestration mode ended with the run; it does not carry forward.

The exact next review is owner acceptance of the private RC checkpoint and its
post-RC checklist. Do not begin a real-app pilot, browser/vendor soak, promotion
to `0.1.0`, push, tag, npm publication, release, deployment, credentials,
cloud/production mutation, Issue `#015`, or any next window without separate
owner authorization.

## Completed W4 — private v0.1-web release candidate

- Canonical issue: `koder/issues/017_v01_web_release_candidate/INDEX.md`.
- Approved plans: `koder/plans/004_S01_*` through `004_S08_*`.
- Independent Review `#049` approved planning at `43c294e`, zero P1/P2/P3.
  Queue `koder/queue/005_w4_v01_web_release_candidate/INDEX.md` drained all
  eight rows serially on `main`.
- Temporary blind run used coordinator cap `2`, primary `pi/gpt-5.5`, and sole
  fallback `codex/gpt-5.3-codex`; both passed preflight. The queue ended with
  process failures `7/8`, no unresolved blocker, and clean Git.
- Issues `#014` and `#017` are resolved. Package state is private
  `0.1.0-rc.1`; no release, pilot, credential, cloud, worktree, or cross-repo
  action occurred.

### Locked v0.1-web support matrix

Stable/frozen throughout `0.1.x`:

- `@holmhq/sdk`
- `@holmhq/sdk/core`
- `@holmhq/sdk/transports`
- `@holmhq/sdk/app`
- `@holmhq/sdk/web`
- `@holmhq/sdk/state`
- `@holmhq/sdk/test`

Preview/not frozen: `@holmhq/sdk/node`, `@holmhq/sdk/sobek`.

Reserved/not production: `@holmhq/sdk/bridge`.

Unavailable: admin, actions/generated CLI, realtime, collaboration, framework
bindings, production desktop/mobile, and arbitrary SSR.

Node `>=20` is the build/tooling floor; raw vendored BFBB has no Node runtime
dependency.

### Queue 005 order

1. S01 stable API inventory and deterministic freeze gate.
2. S02 preview/reserved labels and import isolation.
3. S03 Review `#033` credential/diagnostic advisories 1-4.
4. S04 Review `#033` edge advisories 5-9.
5. S05 deterministic v0.1 web/BFBB bundles.
6. S06 artifact integrity, tamper failure, and offline vendoring fixtures.
7. S07 private RC metadata/docs/update/rollback contract.
8. S08 integrated validation, review, Holm acceptance, and owner handoff.

### W4 completion evidence

- Four CI modes passed with identical metrics: `98.02` statements, `98.91`
  lines, `98.58` functions, `95.45` branches, and `100.00` changed-reachable.
- 220 source tests, 22 dist tests, 235 reproducible dist artifacts, 232 verified
  manifest artifacts, and API/declaration/example/RC-doc/integrity/size/license
  gates passed.
- Integrated SDK Review `#058` approved `P1=0 P2=0 P3=0` at `59614d5`.
- Fresh read-only Holm Review `#059` accepted `P1=0 P2=0 P3=0` against Holm
  `748cbe5` (`v0.185.1`) with identical clean pre/post fingerprints.
- Stop remains before real-app pilot, browser/vendor soak, push, tag, npm
  publish, release, deploy, credentials, cloud/production mutation, or
  promotion to `0.1.0`; each requires separate owner authorization.

## Completed W3 reference

W3 / Queue `#004` resolved Issue `#009` at product commit `f06d1c0`; integrated
Review `#046` and Holm-authority Review `#048` approved with zero P1/P2/P3.
This is evidence for W4, not authorization.

## Standing hard limits

- `package.json` remains private until explicit owner approval changes it.
- Holm and every repository other than this SDK remain read-only unless the
  owner explicitly approves a cross-repository change.
- Serial on `main`; no worktrees without explicit owner approval.
