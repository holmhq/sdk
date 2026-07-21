---
updated_at: "21 Jul 2026 | 11:23 AM IST"
state: BLOCKED
active_window: "unified one-approval release automation implemented; npm package-access lockout pending"
active_issue: "none; release-process hardening after v0.2.1"
orchestration_mode: "owner-authenticated npm setting required"
stop_gate: "confirm Require two-factor authentication and disallow tokens before hardening is complete"
---

# Koder State

## Past

- W1–W5 delivered stable web/BFBB, framework-neutral state, runtime adapters,
  reproducible artifacts, docs, and public `@holmhq/sdk@0.1.0`.
- W6 delivered the audited preview admin/operator client and public `0.2.0`;
  Reviews `#063` and `#064` accepted the remediated SDK/Holm boundaries.
- Genuine `v0.2.1` proved npm OIDC identity in workflow run `29773856653`.
  The old publish token is revoked and local npm CLI auth remains removed.

## Present

- `@holmhq/sdk@0.2.1` remains public, verified, and immutable on npm/GitHub.
- Commit `246ab34` replaces the multi-step staged process with one workflow and
  one owner action: approve `npm-release`. It validates without publish
  authority, publishes npm plus the GitHub Release in one protected job, then
  verifies without publish authority.
- Security Review `#068` approves with no unresolved findings. Full
  `release:check` is green: 230 source tests, 25 dist tests, 267 reproducible
  artifacts, changed-reachable coverage `100.00`, and size
  `296327` raw / `226159` minified / `58504` gzip.
- GitHub is hardened: admin bypass is disabled; reviewer `jikkuatwork` and `v*`
  policy remain; ruleset `19324891` makes `refs/tags/v*` immutable.
- The owner reports and verifies that npm's trusted publisher now allows
  **`npm publish` only**. Publishing access was not separately confirmed after
  the instruction to leave it unchanged, so **Require two-factor authentication
  and disallow tokens** remains the sole hardening blocker.
- No dummy version, workflow dispatch, package, release, or deployment occurred.
  The unified path remains pending proof by the next genuine release.

## Future

1. In npm package Settings, select **Require two-factor authentication and
   disallow tokens**, save, authenticate, and verify the persisted setting.
2. Record that owner-confirmed result and return the repository state to ready;
   do not dispatch a dummy release.
3. Update/revalidate Medialab's exact `0.2.1` pin only under separate repository
   and deployment authorization.
