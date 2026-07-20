---
updated_at: "21 Jul 2026 | 12:47 AM IST"
state: READY
active_window: "none — Issue #018 remediated and reviewed; release decision deferred"
active_issue: "none; #018 resolved at bb663d9"
orchestration_mode: "direct SDK remediation plus read-only Medialab/Holm validation"
stop_gate: "owner approval of a genuine new SDK version/release before npm staging or Medialab deploy"
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

- Medialab dogfooding found Issue `#018`: public `0.2.0` changed declared file
  MIME to `application/octet-stream` in the supported web multipart fallback.
- Strict-TDD fix `bb663d9` preserves declared multipart MIME while resumable
  chunks remain octet-stream. Generated ESM/maps/manifests are current.
- Independent Review `#066` approved with `P1=0 P2=0 P3=0`; fresh read-only
  Holm Review `#067` accepted against `9fbc0b4`, also `P1=0 P2=0 P3=0`.
- Final `release:check` is green: 230 source tests, 25 dist tests, 267
  reproducible artifacts, 290-file installed-package smoke, `100.00`
  changed-reachable coverage, and size `296327` raw / `226159` minified /
  `58504` gzip. FORCE_COLOR, TAP, and TAP+color CI also pass.
- Published `0.2.0`, tag `v0.2.0`, and its release assets remain immutable and
  do not contain Issue `#018`. No version bump, push, tag, stage, release,
  publication, or deployment occurred.
- The external Medialab frontend migration is prepared and reviewed locally,
  but remains blocked on an immutable fixed SDK release before production use.

## Future

1. Decide the genuine next SDK version and release scope. If approved, use the
   `npm-release` skill with the exact reviewed annotated tag; never create a
   dummy release or rerun `v0.2.0`.
2. After the fixed package is public and verified, update Medialab's exact pin,
   rerun its adapter/build/upload smokes and review, then separately authorize
   any app deployment.
3. After the first successful OIDC stage, require npm package 2FA and disallow
   tokens, then mark the release skill proven with run evidence.
4. Keep Issues `#010`–`#013` demand-driven; do not activate them merely to fill
   a release.
