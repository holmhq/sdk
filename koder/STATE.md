---
updated_at: "18 Jul 2026 | 08:25 AM IST"
state: BLOCKED
active_window: "W5 — pilot and #015 complete; 0.1.0 release prepared"
active_issue: "none; #001/#015 resolved, external release blocked"
orchestration_mode: "direct owner-authorized; one independent review and one narrow rereview"
stop_gate: "restore owner npm auth, rerun release gate, then atomically tag/publish/GitHub-release exact target 9d855c5"
---

# Koder State

## Past

- W1–W4 delivered the reviewed private web RC; W5 proved it in the real
  production-hosted Sokoban app against Holm `0.185.1`.
- Owner authorized lightweight unattended completion through genuine `0.1.0`
  release preparation, including push/tag/npm/GitHub actions once safe.
- Issue `#015` and umbrella `#001` are resolved: elegant newcomer README,
  technical agent guide, release/capability/migration/vendoring docs, shared
  vanilla/React session example, and deferred-slice reconciliation.
- `396f991` promotes public `@holmhq/sdk@0.1.0`; `9d855c5` fixes nested package
  smoke under npm's publish-dry-run environment. Reviews `#060`/`#061` both
  approve with `P1=0 P2=0 P3=0`.

## Present

- Full `npm run ci`, audit, installed-tarball checks, reproducibility, and
  `npm publish --dry-run --access public` pass. The tarball is allowlisted to
  255 files (~176 KB packed), with no runtime dependencies.
- GitHub auth, public repo visibility, and push dry-run pass. Exact future
  release/tag target is `9d855c501b56a3e7ea46100bc1b4b34bc979a958`.
- npm read-only `whoami` fails `E401`: the configured token is rejected and no
  alternate environment token exists. No tag, GitHub release, or real npm
  publication was created, avoiding a partial release.

## Future

1. Owner restores npm registry authentication without committing credentials.
2. Reverify `9d855c5`, rerun the release gate, create/push annotated `v0.1.0`,
   publish public `@holmhq/sdk@0.1.0`, create the GitHub release, then smoke the
   registry install and immutable tag.
3. Demand-driven `#008`/`#010`–`#013` remain deferred; optional Holm dev-login
   defect filing still requires separate Holm-repo write approval.
