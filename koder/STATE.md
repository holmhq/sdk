---
updated_at: "21 Jul 2026 | 09:49 AM IST"
state: REVIEW_READY
active_window: "unified one-approval npm/GitHub release automation; npm settings cutover pending"
active_issue: "none; release-process hardening after v0.2.1"
orchestration_mode: "direct implementation plus owner-assisted npm settings cutover"
stop_gate: "npm trusted publisher must allow only npm publish and package access must disallow tokens before close"
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

- `@holmhq/sdk@0.2.1` remains public, verified, and immutable on npm/GitHub.
- The owner rejected the multi-step staged process. Strict TDD replaced it with
  one workflow and one owner action: approve protected environment
  `npm-release`. Unprivileged validation prepares assets; the protected job
  publishes npm and creates the GitHub Release; unprivileged verification checks
  installation, signatures, provenance, metadata, and every byte.
- Security Review `#068` approves with no unresolved P1/P2/P3. Exact Node
  `24.8.0` / npm `11.6.0`, dispatch-SHA binding, live immutable-tag and approval
  checks, global release serialization, safe same-tag resumption, and hardened
  workflow drift tests are in place. Full `release:check` remains green.
- Live GitHub hardening is complete: `npm-release` has
  `can_admins_bypass=false`, reviewer `jikkuatwork`, and policy `v*`; active
  ruleset `19324891` blocks deletion/all updates to `refs/tags/v*` with no
  bypass actors or exclusions.
- npm still authorizes only the old `npm stage publish` action. Before any future
  release, the owner must edit the trusted publisher to **`npm publish` only**
  and set Publishing access to **Require two-factor authentication and disallow
  tokens**. No dummy version, tag, workflow run, package, release, or deployment
  was created for this process change.

## Future

1. Commit and push the approved unified workflow, docs, skill, test, and Review
   `#068` evidence.
2. In npm package Settings, change the trusted publisher allowed action from
   `npm stage publish` to **`npm publish` only**.
3. Set Publishing access to **Require two-factor authentication and disallow
   tokens**, complete owner authentication, and verify the saved state.
4. Close clean and synchronized. Prove the unified path only on the next genuine
   release—never a dummy.
5. Update/revalidate Medialab's exact `0.2.1` pin only under separate repository
   and deployment authorization.
