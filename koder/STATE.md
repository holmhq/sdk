---
updated_at: "20 Jul 2026 | 03:27 PM IST"
state: BLOCKED
active_window: "none — W6 complete; 0.2.0 released"
active_issue: "none; #008 resolved"
orchestration_mode: "direct owner-authorized release follow-through complete"
stop_gate: "revoke npm token holm-sdk-linux, protect npm-release, and register publish.yml as stage-only npm trusted publisher"
---

# Koder State

## Past

- W1–W5 delivered and released `@holmhq/sdk@0.1.0`: stable web/BFBB,
  framework-neutral state, runtime adapters, reproducible artifacts, docs, and
  production Sokoban proof.
- W6 resolved Issue `#008`: preview `@holmhq/sdk/admin`, explicit
  `createAdminClient({ runtime, caller })`, operator-gated web/Node transport,
  runtime-neutral uploads/binary behavior, and 216 generated methods over 189
  source-pinned Holm route/method contracts.
- Review `#062` found one upload-preflight P1; TDD remediation landed at
  `96485b7`, and Review `#063` approved with `P1=0 P2=0 P3=1`. Fresh read-only
  Holm Review `#064` accepted against `9a02784`, `P1=0 P2=0 P3=1`.

## Present

- `@holmhq/sdk@0.2.0` is public on npm and `latest` points to it. Registry SHA-1
  `6fb216caa5502a80f0b568119b0727d6ba96d46c` and downloaded tarball bytes match
  the reviewed package; a clean registry install imports all 11 entry points.
- Annotated tag `v0.2.0` peels to exact reviewed target `189eaa6`. GitHub's
  latest release is live with tarball, `SHA256SUMS`, and `dist-manifest.json`;
  downloaded assets match prepared checksums byte-for-byte.
- Exact-target normal release check plus FORCE_COLOR/TAP/TAP+color CI passed
  with identical metrics (`98.09` statements, `98.95` lines, `98.65` functions,
  `95.31` branches, `100.00` changed-reachable), 230 source tests, 24 dist tests,
  and 267 reproducible artifacts.
- Local `NPM_ACCESS_TOKEN` and temporary npm config are removed. The browser-
  created no-expiry token `holm-sdk-linux` must still be revoked in npm's web UI
  before the session can close without a credential risk.
- Stage-only OIDC workflow `publish.yml` is implemented at `f1780e8`; full CI is
  green and independent Review `#065` approves with `P1=0 P2=0 P3=1`. Its P3:
  GitHub environment `npm-release` exists but still has no protection rules.
- The owner explicitly deferred npm token/environment/trusted-publisher refresh
  to the next session; no staging workflow has been dispatched.

## Future

1. Revoke npm token `holm-sdk-linux`; do not paste it or any credential into the
   repository or chat.
2. Add required reviewers/protection to GitHub environment `npm-release`.
3. Register npm trusted publisher: `holmhq` / `sdk` / `publish.yml` /
   `npm-release`, allowed action `npm stage publish` only. After its first real
   stage, set npm publishing access to require 2FA and disallow tokens.
4. Choose further capability work only from actual demand; Issues `#010`–`#013`
   remain deferred.
