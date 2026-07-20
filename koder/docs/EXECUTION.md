---
title: Execution boundary
updated: 2026-07-20
window: W6-complete
mode: direct owner-authorized release follow-through
last_window: W5
completed_issue: 008
queue: none
release: v0.2.0
release_review: "#063 approved #062 remediation; P1=0 P2=0 P3=1 advisory"
holm_authority_review: "#064 accepted against Holm 9a02784; P1=0 P2=0 P3=1 advisory"
external_blocker: none
security_followup: "configured: token revoked; npm-release protected; stage-only trusted publisher registered; first OIDC stage awaits next genuine release"
trusted_publishing_review: "#065 approved f1780e8; P1=0 P2=0 P3=1 environment-protection advisory"
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

W6 is complete. Issue `#008` is resolved and `@holmhq/sdk@0.2.0` is public with
`latest` pointing to it. Annotated tag `v0.2.0` peels to exact reviewed target
`189eaa6`; GitHub's latest release assets and the npm registry tarball match the
reviewed checksums byte-for-byte, and a clean registry consumer imports all 11
entry points. Actions, realtime, collaboration, framework bindings, and
Holm-side cutover remain deferred.

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
- The temporary `holm-sdk-linux` token is revoked, npm's active token list is
  empty, and the local npm CLI is logged out with no stored registry auth key.
- Review `#065` approves stage-only `publish.yml`. Environment `npm-release` now
  requires reviewer `jikkuatwork` and permits only `v*` tag deployments. npm's
  trusted publisher is registered for exact workflow `publish.yml`, environment
  `npm-release`, and only the `npm stage publish` action.
- Do not stage a dummy package or rerun published `v0.2.0`. The next genuine
  reviewed release must prove its first OIDC stage; after success, require 2FA
  and disallow tokens in npm package access.
- Use candidate runbook `koder/skills/npm-release/` for that release. Pi, Claude
  Code, and Codex compatibility paths are symlinks to this canonical copy; mark
  it proven only after recording a successful genuine OIDC run.
- Organization recovery and GitHub release immutability remain optional owner
  decisions.
