---
title: Execution boundary
updated: 2026-07-21
window: none; release automation ready and next genuine release awaits real product demand
mode: direct; no autonomous release window active
last_window: W6
completed_issue: 018
queue: none
release: v0.2.1 public and verified on npm/GitHub; exact target 81d5732
release_review: "#066 approved Issue 018 at bb663d9; P1=0 P2=0 P3=0"
holm_authority_review: "#067 accepted Issue 018 against Holm 9fbc0b4; P1=0 P2=0 P3=0"
external_blocker: "resolved; Medialab exact-0.2.1 migration and manifest fix are deployed; owner retest follows transient Holm memory-admission 503s"
security_followup: "GitHub hardened; owner reports npm publish-only trust and package-access 2FA/token lockout appear persisted; re-confirm before the next genuine release"
trusted_publishing_review: "#068 approved unified workflow; P1=0 P2=0 with final P3 remediated"
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

The owner rejected the multi-step staged process and authorized simplification.
The reviewed replacement uses one workflow and one owner action: approve
`npm-release`. Unprivileged validation prepares exact assets; the protected job
requires a live accountable approval, publishes npm directly through OIDC, and
creates/verifies the GitHub Release; unprivileged verification checks package
imports, signatures, provenance, metadata, and bytes. Review `#068` approves
with no unresolved findings; full release checks pass.

Live GitHub hardening is complete: environment administrator bypass is disabled,
reviewer `jikkuatwork` and `v*` deployment policy remain, and active ruleset
`19324891` blocks deletion/all updates to release tags with no bypass/excludes.
The owner reports that npm's trusted publisher allows `npm publish` only and
that **Require two-factor authentication and disallow tokens** appears
persisted. This closes the current configuration blocker on owner confirmation;
the package setting must still be rechecked in the browser before the next
genuine release dispatch. No release was manufactured to test the new flow.
Medialab deployment, Holm writes, and unrelated capability work remain excluded.

Commit `2352321` adds a separate Node 20 CI job that exercises tracked `dist`
and a packed/install/import smoke without development dependencies, matching the
published `engines.node >=20` contract. Fresh full release validation and a
read-only independent review are green with `P1=0 P2=0 P3=0`.

Owner-authorized Medialab adoption is live from pushed Zyt commit `fe81675`.
It pins exact public `0.2.1`, removes the copied legacy SDK, preserves the custom
WebSocket boundary, and passes adapter, syntax, temporary Vite, installed MIME
fallback, and independent review gates. Follow-up `b0c8f10` adds an authored
browser-valid manifest; Holm redeployed 15 files to existing app
`holm_app_fBb09CTIJsIJ` at `medialab.zyt.app`.

The first owner test saw transient image-route `503`s matching the existing Holm
memory-admission incident shape, not an SDK route contract. During triage the
peer was externally restarted/upgraded to Holm `0.185.6`; current pressure and
governor are `ok`, `/api/me` returns `200`, and an unauthenticated image request
reaches app auth with `401` instead of `503`. Owner retest is pending. No app
retry workaround, SQL, Holm write, or SDK change was introduced.

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

## Owner decision — release simplification, 2026-07-21

The owner directed that future npm and GitHub publication complete through one
protected approval rather than separate GitHub, npm-stage, and GitHub-release
steps. This authorizes repository workflow/docs/tests/skill changes and the
necessary GitHub/npm release-setting hardening. It does not authorize a dummy
version, another package release, Medialab deployment, or writes to Holm/other
repositories. The unified path remains unproven until the next genuine release.

## Owner decision — package-access follow-up, 2026-07-21

The owner reports that npm's 2FA/token lockout appears confirmed and directs a
final live check during the next genuine release rather than manufacturing a
test version. Treat release configuration as ready, but stop before dispatch if
the browser does not show the persisted required setting.

## Owner decision — Medialab migration, 2026-07-21

The owner authorized pushing the two pending SDK commits, then writing the
bounded Medialab migration to exact `0.2.1`, validating and independently
reviewing it, with an explicit stop before deployment. SDK `main` was pushed;
Zyt commit `fe81675` contains the approved migration.

The owner then explicitly authorized Medialab deployment for testing. Zyt
commits `fe81675` and `ac12e76` were pushed and the existing app was redeployed
at `medialab.zyt.app`. This did not authorize SQL, Holm writes, unrelated app
work, or additional deployments.

## Standing limits

- Holm and repositories other than this SDK remain read-only without explicit
  approval; the completed Medialab write window is now closed.
- Work remains serial on `main`; no worktrees without explicit approval.
- This release uses new version `0.2.1`; published `0.1.0` and `0.2.0`, their
  reviewed tags, and checksummed assets remain immutable and must not be
  mutated.
- The temporary `holm-sdk-linux` token is revoked, npm's active token list is
  empty, and the local npm CLI is logged out with no stored registry auth key.
- Review `#068` approves unified `publish.yml`. Environment `npm-release`
  requires reviewer `jikkuatwork`, permits only `v*` tags, and has admin bypass
  disabled. Ruleset `19324891` makes `refs/tags/v*` immutable. The owner reports
  npm trust is `npm publish` only and package access has 2FA/token lockout;
  re-confirm both live before the next genuine release dispatch.
- Do not stage a dummy package, dispatch merely to test settings, or rerun any
  published tag. Prove the unified workflow only on the next genuine release.
- Medialab is live from reviewed commit `fe81675` on exact public `0.2.1`.
  Owner interactive acceptance is pending; further Zyt writes or deployments
  require new explicit scope.
- Use `koder/skills/npm-release/`; Pi, Claude Code, and Codex compatibility
  paths remain symlinks. OIDC identity is proven by `0.2.1`; the unified direct
  npm + GitHub workflow is explicitly pending genuine-release proof.
- Organization recovery and GitHub release immutability remain optional owner
  decisions.
