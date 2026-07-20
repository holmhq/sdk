---
updated_at: "20 Jul 2026 | 07:56 PM IST"
state: READY
active_window: "none — W6 complete; 0.2.0 released and publishing hardening configured"
active_issue: "none; #008 resolved"
orchestration_mode: "direct owner-assisted external hardening complete"
stop_gate: "none now; first genuine OIDC stage must pass before token-disallow package access"
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
- Stage-only OIDC workflow `publish.yml` is implemented at `f1780e8`; full CI is
  green and independent Review `#065` approves with `P1=0 P2=0 P3=1`.
- GitHub environment `npm-release` now requires reviewer `jikkuatwork` and only
  permits `v*` tag deployments. npm Trusted Publisher is registered for
  `holmhq/sdk`, `publish.yml`, `npm-release`, with only `npm stage publish`.
- The scoped bypass-2FA token `holm-sdk-linux` is revoked, npm's active token
  list is empty, the local npm CLI is logged out, and its stored registry auth
  key is removed. No staging workflow was dispatched.
- Candidate skill `koder/skills/npm-release/` captures the owner-present OIDC
  runbook at `7244c4e`; tracked symlinks expose the one canonical copy to Pi,
  Claude Code, and Codex. Validation and the published-`0.2.0` stop route pass,
  but only the next genuine release can prove the live stage/approval path.

## Future

1. At the next genuine reviewed release, use the `npm-release` skill with its
   exact annotated tag, approve the protected environment, and verify OIDC
   stages the unpublished package. Do not create a dummy release merely to test.
2. Review and WebAuthn-approve that staged package, set npm package access to
   require 2FA and disallow tokens, then update the candidate skill with proven
   run evidence.
3. Choose further capability work only from actual demand; Issues `#010`–`#013`
   remain deferred.
