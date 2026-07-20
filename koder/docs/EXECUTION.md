---
title: Execution boundary
updated: 2026-07-21
window: v0.2.1 post-release npm/GitHub security hardening
mode: direct owner-assisted settings hardening
last_window: W6
completed_issue: 018
queue: none
release: v0.2.1 public and verified on npm/GitHub; exact target 81d5732
release_review: "#066 approved Issue 018 at bb663d9; P1=0 P2=0 P3=0"
holm_authority_review: "#067 accepted Issue 018 against Holm 9fbc0b4; P1=0 P2=0 P3=0"
external_blocker: "resolved for SDK availability; Medialab exact-pin update/review and deployment remain separate authorization"
security_followup: "npm must disallow tokens; GitHub npm-release admin bypass remains enabled and first run recorded state=skipped"
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

W6 is complete. Published `0.1.0` and `0.2.0`, their tags, and release assets
remain immutable.

Issue `#018` is resolved at `bb663d9` and released in `@holmhq/sdk@0.2.1`:
web multipart fallback preserves declared upload MIME while resumable chunks
remain octet-stream. Independent Review `#066` approved and fresh read-only
Holm Review `#067` accepted against `9fbc0b4`, both with `P1=0 P2=0 P3=0`.

`0.2.1` is public on npm and is the latest GitHub release. Annotated `v0.2.1`
peels to exact target `81d5732f1ba71dcbe1d42a7fe52868dedada9e56`.
Registry and GitHub assets verify byte-for-byte; npm signature/provenance,
installed exports, admin inventory, and release-specific MIME smoke pass.
Evidence is in `koder/evidence/006_v021_release_candidate/INDEX.md`.

The remaining bounded window is security hardening: require npm 2FA and disallow
tokens, then explicitly decide whether to disable GitHub environment admin
bypass. Workflow run `29773856653` proved OIDC staging/publication, but GitHub
recorded `state=skipped` by `holmhq-admin`, not reviewer approval. Medialab
deployment, Holm writes, and unrelated capability work remain excluded.

## Owner decision — 2026-07-20

The owner selected the admin migration as the next significant autonomous track
and explicitly authorized release rather than an unreleased checkpoint when
quality is proven. Direct serial execution is the selected mode; blind
orchestration was not activated. Conditional release included push, annotated
`v0.2.0`, GitHub release assets, and npm publication after—not before—the review
and authority gates.

The owner later selected active Medialab as the next SDK adopter and authorized
the bounded frontend migration. Dogfooding exposed Issue `#018`, which was
remediated and reviewed in this repository. That instruction did not authorize
a new SDK release, npm stage, push, tag, or Medialab deployment; those remain
explicit owner decisions.

## Owner decision — 2026-07-21

The owner selected `0.2.1` as the genuine patch release for Issue `#018` and
explicitly authorized release and publication. This authorizes the SDK release
commit/push, immutable annotated `v0.2.1` tag, protected GitHub OIDC stage, npm
publication approval flow, GitHub release/assets, verification, and required
post-first-stage package-access hardening. Browser approvals remain accountable
owner actions and every mismatch is a stop condition. This does not authorize
Medialab deployment or writes to Holm/other repositories.

## Standing limits

- Holm and repositories other than this SDK remain read-only without explicit
  approval.
- Work remains serial on `main`; no worktrees without explicit approval.
- This release uses new version `0.2.1`; published `0.1.0` and `0.2.0`, their
  reviewed tags, and checksummed assets remain immutable and must not be
  mutated.
- The temporary `holm-sdk-linux` token is revoked, npm's active token list is
  empty, and the local npm CLI is logged out with no stored registry auth key.
- Review `#065` approves stage-only `publish.yml`. Environment `npm-release`
  requires reviewer `jikkuatwork` and permits only `v*` tag deployments, but
  live `can_admins_bypass=true`; the first run used that bypass and does not
  prove reviewer approval. npm's trusted publisher remains exact for workflow
  `publish.yml`, environment `npm-release`, and only `npm stage publish`.
- Do not stage a dummy package or rerun any published tag. `0.2.1` proved OIDC
  publication; require 2FA and disallow tokens in npm package access now.
- Do not deploy the prepared Medialab migration while it pins public `0.2.0`.
  Update to exact public `0.2.1`, rerun local gates/review, and obtain separate
  deployment authorization.
- Use proven runbook `koder/skills/npm-release/`; Pi, Claude Code, and Codex
  compatibility paths remain symlinks to this canonical copy. Its proof records
  both successful OIDC publication and the unresolved admin-bypass caveat.
- Organization recovery and GitHub release immutability remain optional owner
  decisions.
