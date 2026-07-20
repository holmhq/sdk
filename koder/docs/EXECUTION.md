---
title: Execution boundary
updated: 2026-07-20
window: W6-issue008-admin
mode: direct owner-authorized autonomous execution
last_window: W5
active_issue: 008
queue: none
release_target: v0.2.0-conditional
release_review: "#062 changes requested (P1 upload preflight); remediation pending rereview"
holm_authority_review: pending
external_blocker: none
---

# Execution Boundary

## Owner decision — 2026-07-18

The owner expanded W5 from the completed Sokoban pilot and trimmed Issue `#015`
through genuine `0.1.0` promotion, push, tag, GitHub release, and npm
publication, asking for the lightest process that retained the intended quality
outcome. This did not authorize Holm edits or unrelated production changes.

## Completed outcome

- Issue `#015` and foundation track `#001` are resolved: 10 included slices
  complete, 5 demand-driven slices deferred.
- Public package product commit: `396f991`; publish-gate fix and release target:
  `9d855c501b56a3e7ea46100bc1b4b34bc979a958`.
- `npm run release:check`, audit, reproducibility, package dry-run, and installed
  tarball gates pass.
- Independent Review `#060` and narrow publish-gate Review `#061` both approve
  with `P1=0 P2=0 P3=0`.
- `@holmhq/sdk@0.1.0` is public on npm with `latest` pointing to `0.1.0`.
- Annotated tag `v0.1.0` and the latest GitHub release are public; the tarball,
  `SHA256SUMS`, and `dist-manifest.json` assets download and verify byte-for-byte.
- A clean registry consumer imported all 10 exported entry points.

## Current boundary

W6 activates only Issue `#008`: implement the source-pinned admin/operator
preview, preserve stable entry points, run full validation, obtain one
independent SDK review and fresh read-only Holm-authority acceptance, then
release `0.2.0` only if those gates justify confidence. Actions, realtime,
collaboration, framework bindings, and Holm-side cutover remain deferred.

## Owner decision — 2026-07-20

The owner selected the admin migration as the next significant autonomous track
and explicitly authorized release rather than an unreleased checkpoint when
quality is proven. Direct serial execution is the selected mode; blind
orchestration was not activated. Conditional release includes push, annotated
`v0.2.0`, GitHub release assets, and npm publication after—not before—the review
and authority gates.

## Standing limits

- Holm and repositories other than this SDK remain read-only without explicit
  approval.
- Work remains serial on `main`; no worktrees without explicit approval.
- This release uses new version `0.2.0`; published `0.1.0` and its reviewed
  tag/checksummed assets remain immutable and must not be mutated.
- Trusted publishing/OIDC, organization recovery, and GitHub release
  immutability are optional owner decisions, not prerequisites retroactively.
