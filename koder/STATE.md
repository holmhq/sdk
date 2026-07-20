---
updated_at: "21 Jul 2026 | 01:13 AM IST"
state: IN_PROGRESS
active_window: "genuine @holmhq/sdk@0.2.1 release — prepare, gate, stage, publish, and verify"
active_issue: "#018 release promotion; product fix resolved at bb663d9"
orchestration_mode: "direct release execution with protected GitHub/npm owner approvals"
stop_gate: "stop on any exact-target, OIDC, staged-package, provenance, or artifact mismatch"
---

# Koder State

## Past

- W1–W5 delivered stable web/BFBB, framework-neutral state, runtime adapters,
  reproducible artifacts, docs, and public `@holmhq/sdk@0.1.0`.
- W6 delivered the audited preview admin/operator client and public `0.2.0`;
  Reviews `#063` and `#064` accepted the remediated SDK/Holm boundaries.
- Stage-only npm OIDC publishing is configured and Review `#065` approved it.
  The old publish token is revoked, npm CLI auth is removed, and the protected
  `npm-release` environment awaits its first genuine release run.

## Present

- The owner authorized a genuine `@holmhq/sdk@0.2.1` patch release containing
  Issue `#018`, including push, annotated tag, OIDC stage, npm publication, and
  GitHub release verification; Medialab deployment remains separately gated.
- Strict-TDD fix `bb663d9` preserves declared multipart MIME while resumable
  chunks remain octet-stream. Independent Review `#066` approved with
  `P1=0 P2=0 P3=0`; fresh read-only Holm Review `#067` accepted against
  `9fbc0b4`, also `P1=0 P2=0 P3=0`.
- Release identity is being advanced to `0.2.1`. Targeted release metadata,
  dist, and installed-package gates went red after the version bump and green
  after docs/checks and generated reports were updated.
- Public `0.2.0`, tag `v0.2.0`, and its release assets remain immutable. No
  release commit, push, `v0.2.1` tag, workflow dispatch, npm stage,
  publication, GitHub release, or deployment has occurred yet.
- The external Medialab frontend migration remains blocked until the fixed SDK
  package is public and independently verified.

## Future

1. Complete exact-target four-mode release gates, audit, reproducibility,
   package/tarball evidence, and release-target review for `0.2.1`.
2. Push the reviewed target and annotated `v0.2.1`, then dispatch only the
   protected stage-only OIDC workflow from that immutable tag.
3. Verify the staged package before owner GitHub/npm approvals; after public
   verification, create and checksum-verify the GitHub release assets.
4. Complete first-stage npm 2FA/token hardening, mature the release runbook with
   observed evidence, and close with clean synchronized Git.
5. Update and revalidate Medialab's exact SDK pin only under its separate
   repository/deployment authorization.
