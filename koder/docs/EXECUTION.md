---
title: Active execution window
updated: 2026-07-17
window: W4
mode: blind
queue: koder/queue/005_w4_v01_web_release_candidate/INDEX.md
active_issue: 017
plan_review: koder/reviews/049_w4_v01_web_plan_review/INDEX.md
---

# Execution Window

## Authorization

- Owner authorization, 2026-07-17 (in-session, explicit): the owner authorized
  Queue `#005`, stated they would be away for about five hours, requested the
  entire approved W4 work be completed unattended, and requested final
  `/close`.
- W4 therefore uses temporary **blind orchestration** for Queue `#005` only.
  The root session is a process-only governor; fresh coordinators route fresh
  implementation, review, fix, rereview, recovery, integrated-review, and
  authority workers.
- Outcome disclosed before launch: product source/tests/docs plus tracked
  generated private `0.1.0-rc.1` artifacts across eight reviewed slices,
  normally 22-30 fresh phases including entry reviews/fixes, integrated SDK
  review, and Holm acceptance. Review `#049` estimates 8-14 hours plus review
  wall time, so the five-hour owner absence is an initial target rather than
  permission to omit gates.
- Completion authorization continues to the Queue `#005` stop gate, subject to
  a hard no-new-product-phase deadline of 2026-07-18 00:30 IST and safe
  closeout through 01:15 IST. Any fail-closed gate blocks instead of weakening
  validation or crossing forbidden actions.

## Active W4 — private v0.1-web release candidate

- Canonical issue: `koder/issues/017_v01_web_release_candidate/INDEX.md`.
- Approved plans: `koder/plans/004_S01_*` through `004_S08_*`.
- Independent Review `#049`: approved at planning commit `43c294e`, zero
  P1/P2/P3. Active Queue: `koder/queue/005_w4_v01_web_release_candidate/INDEX.md`.
- Sweep: eight rows, roughly 8-14 hours plus final review/authority wall time;
  coordinator cap `2`, implementation ownership serial on `main`.
- Monitoring requirement: governor watch fences <=5 minutes, followed every
  time by Harnex status/report/Git reconciliation and prompt session cleanup.
- Automatic dispatch policy is primary `pi/gpt-5.5` with sole fallback
  `codex/gpt-5.3-codex`; both passed typed no-change preflight. No other model
  family or adapter may be substituted.

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

### W4 stop gate

Queue `#005` may claim completion only when private `0.1.0-rc.1` code and
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
