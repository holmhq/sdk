---
title: Execution boundary
updated: 2026-07-20
window: W5-complete
mode: direct owner-authorized release follow-through
last_window: W4
completed_issue: 015
queue: none
release_review: koder/reviews/060_v010_release_review/INDEX.md
publish_rereview: koder/reviews/061_v010_publish_gate_rereview/INDEX.md
release: v0.1.0
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

W5 is closed. No implementation or release blocker remains, and no next product
window is active. Deferred admin/action/realtime/collaboration/framework work is
not implicitly authorized by this release.

## Standing limits

- Holm and repositories other than this SDK remain read-only without explicit
  approval.
- Work remains serial on `main`; no worktrees without explicit approval.
- A future npm release must use a new semver version; published `0.1.0` is
  immutable, and its reviewed tag/checksummed assets must not be mutated.
- Trusted publishing/OIDC, organization recovery, and GitHub release
  immutability are optional owner decisions, not prerequisites retroactively.
