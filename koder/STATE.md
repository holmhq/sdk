---
updated_at: "21 Jul 2026 | 01:59 AM IST"
state: IN_PROGRESS
active_window: "@holmhq/sdk@0.2.1 is live; complete first-OIDC security hardening and close"
active_issue: "#018 released in v0.2.1; hardening follow-up active"
orchestration_mode: "direct owner-assisted npm/GitHub settings hardening"
stop_gate: "owner-authenticated npm access update and explicit decision on GitHub admin bypass before close"
---

# Koder State

## Past

- W1–W5 delivered stable web/BFBB, framework-neutral state, runtime adapters,
  reproducible artifacts, docs, and public `@holmhq/sdk@0.1.0`.
- W6 delivered the audited preview admin/operator client and public `0.2.0`;
  Reviews `#063` and `#064` accepted the remediated SDK/Holm boundaries.
- Stage-only npm OIDC publishing is configured and Review `#065` approved it.
  The old publish token is revoked, npm CLI auth is removed, and genuine
  `v0.2.1` proved OIDC staging/publication in workflow run `29773856653`.

## Present

- `@holmhq/sdk@0.2.1` is public and npm `latest` resolves to it. Annotated
  `v0.2.1` peels to exact reviewed target `81d5732`; GitHub's latest release is
  `https://github.com/holmhq/sdk/releases/tag/v0.2.1`.
- Registry tarball, GitHub tarball, manifest, and checksums match the prepared
  artifacts byte-for-byte. npm signature/SLSA provenance, all 11 exports, 216
  admin methods, and the installed-package multipart MIME smoke verify.
- Workflow run `29773856653` and npm stage
  `5194865d-de9e-4e92-b698-d0c5710e4553` prove stage-only OIDC publication.
  The release skill now records the observed npm/GitHub sequencing.
- GitHub's required-reviewer path was bypassed rather than approved: approvals
  API reports `holmhq-admin`, `state=skipped`, while `can_admins_bypass=true`.
  This does not alter the verified package, but it remains a security hardening
  item and the normal reviewer path is not yet proven.
- npm Publishing access still needs **Require two-factor authentication and
  disallow tokens**. Medialab may now evaluate an exact `0.2.1` pin, but app
  changes and deployment remain separately gated.

## Future

1. On npm, select **Require two-factor authentication and disallow tokens**,
   update package settings, complete owner authentication, and verify token/auth
   absence.
2. With explicit owner authorization, disable GitHub environment administrator
   bypass while retaining reviewer `jikkuatwork` and `v*` tag policy. Prove a
   normal reviewer approval only on the next genuine release—never a dummy.
3. Commit/push the matured runbook and final release evidence, then close with a
   clean synchronized tree.
4. Update and revalidate Medialab's exact `0.2.1` pin only under its separate
   repository/deployment authorization.
