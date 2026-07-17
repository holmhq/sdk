---
title: Execution boundary
updated: 2026-07-17
window: none
mode: none
last_window: W3
prepared_window: W4
prepared_issue: 017
plan_review: koder/reviews/049_w4_v01_web_plan_review/INDEX.md
---

# Execution Boundary

## Current authorization

No execution window is active. This session was planning-only: the owner
accepted the narrow v0.1-web support matrix and requested thin W4 plans, then
asked to close before queue construction or implementation.

Do not create or drain Queue `#005`, activate W4, dispatch product workers, or
edit source/tests/dist/package metadata until the owner explicitly authorizes the
restarted W4 execution mode and queue. Older W1-W3 authorizations do not carry
forward.

## Prepared W4 — private v0.1-web release candidate

- Canonical issue: `koder/issues/017_v01_web_release_candidate/INDEX.md`.
- Approved plans: `koder/plans/004_S01_*` through `004_S08_*`.
- Independent Review `#049`: approved at planning commit `43c294e`, zero
  P1/P2/P3, queueable as one future serial Queue `#005` sweep.
- Estimated sweep: eight rows, roughly 8-14 hours plus final review/authority
  wall time; recommended coordinator cap `2`, implementation ownership serial
  on `main`.
- Monitoring requirement: governor watch fences <=5 minutes, followed every
  time by Harnex status/report/Git reconciliation and prompt session cleanup.
- Automatic dispatch model policy must be selected/confirmed at W4
  authorization; no out-of-policy fallback may be inferred from older windows.

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

### Planned W4 order

1. S01 stable API inventory and deterministic freeze gate.
2. S02 preview/reserved labels and import isolation.
3. S03 Review `#033` credential/diagnostic advisories 1-4.
4. S04 Review `#033` edge advisories 5-9.
5. S05 deterministic v0.1 web/BFBB bundles.
6. S06 artifact integrity, tamper failure, and offline vendoring fixtures.
7. S07 private RC metadata/docs/update/rollback contract.
8. S08 integrated validation, review, Holm acceptance, and owner handoff.

### Planned W4 stop gate

The future queue may claim completion only when private `0.1.0-rc.1` code and
artifacts are ready; stable API drift, four CI modes with identical metrics,
clean rebuild/repro, declarations/dist/examples/size/license/integrity gates,
Issue `#014` acceptance, independent integrated SDK review with zero P1/P2,
fresh read-only Holm acceptance with zero P1/P2, and clean committed Git all
pass.

Even after that gate, stop before real-app pilot, browser/vendor soak, push, tag,
npm publish, release, deploy, credentials, cloud/production mutation, or
promotion to `0.1.0`. Those require separate owner authorization.

## Completed W3 reference

W3 / Queue `#004` resolved Issue `#009` at product commit `f06d1c0`; integrated
Review `#046` and Holm-authority Review `#048` approved with zero P1/P2/P3.
This is evidence for W4, not authorization.

## Standing hard limits

- `package.json` remains private until explicit owner approval changes it.
- Holm and every repository other than this SDK remain read-only unless the
  owner explicitly approves a cross-repository change.
- Serial on `main`; no worktrees without explicit owner approval.
