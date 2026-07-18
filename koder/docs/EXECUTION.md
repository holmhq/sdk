---
title: Execution boundary
updated: 2026-07-18
window: W5
mode: direct owner-authorized unattended follow-through
last_window: W4
completed_issue: 015
queue: none
release_review: koder/reviews/060_v010_release_review/INDEX.md
publish_rereview: koder/reviews/061_v010_publish_gate_rereview/INDEX.md
external_blocker: npm registry authentication returns E401
---

# Execution Boundary

## Owner decision — 2026-07-18

The owner explicitly expanded W5 from the completed Sokoban pilot and trimmed
Issue `#015` through genuine `0.1.0` promotion, push, tag, GitHub release, and
npm publication, asking for the lightest process that retained the intended
quality outcome. This supersedes the earlier no-release stop gate; it does not
authorize Holm edits or unrelated production changes.

## Completed local outcome

- Issue `#015` and foundation track `#001` are reconciled: 10 included slices
  complete, 5 demand-driven slices deferred.
- Public package product commit: `396f991`.
- Publish dry-run inheritance fix and exact release target: `9d855c5`.
- `npm run ci`, installed-tarball smoke, audit, and
  `npm publish --dry-run --access public` pass.
- Independent Review `#060` and narrow publish-gate Review `#061` both approve
  with `P1=0 P2=0 P3=0`.
- GitHub auth, public repository visibility, and push dry-run pass.

## Active stop gate

npm authentication fails read-only `whoami` with `E401`; the configured token
cannot publish and no alternate environment token is present. Do not rotate,
request, or fabricate credentials unattended. To avoid a partial release whose
README advertises an unavailable npm package, do not create/push `v0.1.0` or a
GitHub release until npm auth is restored.

After owner-authenticated npm access works:

1. verify exact target `9d855c501b56a3e7ea46100bc1b4b34bc979a958` and rerun the release gate;
2. create/push annotated `v0.1.0` at that target;
3. publish `@holmhq/sdk@0.1.0` with public access;
4. create the GitHub release from `CHANGELOG.md`; and
5. verify registry version, package install, release/tag, and clean Git.

## Standing limits

- Holm and repositories other than this SDK remain read-only without explicit
  approval.
- Deferred admin/action/realtime/collaboration/framework work is not activated.
- Work remains serial on `main`; no worktrees or partial release substitution.
