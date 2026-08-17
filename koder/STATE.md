---
updated_at: "17 Aug 2026 | 08:55 PM IST"
state: BLOCKED
active_window: "Issue #019 S4 — non-HTTP parity mapping remediation"
active_issue: "019"
orchestration_mode: "direct; serial main; no queue"
stop_gate: "resolve Review #072 P2=4 P3=1, pass fresh pinned Holm validation, and obtain a new independent S4 review; no public implementation, release, or next issue"
---

# Koder State

## Current

- Independent Review
  [`#072`](reviews/072_issue019_s4_non_http_parity/INDEX.md) assessed exact S4
  product range `c06f98f..d941db5` and returned `NEEDS_FIXES` with
  `P1=0 P2=4 P3=1`; Issue [`#019`](issues/019_holm_route_registry_refresh/INDEX.md)
  remains open.
- The map overstates compound authorization across grouped
  `holm.admin.roles.*` operations. Pinned Holm has source-specific guards, while
  role remove/list/find and arbitrary-role add do not have the blanket caller /
  manifest checks claimed by the row.
- WebSocket truth omits the app-overridable typed-channel
  `realtime.max_channels_per_socket` limit, default unlimited behavior, stable
  rejection, and legacy bare-channel bypass.
- Logged-out member storage installs only `holm.app.member.media.serve`; the map
  incorrectly says all listed media methods exist in every owner context.
- The checker accepts malformed/absent nearest-release provenance and an
  `absent` Holm status with `implementation` authority. Default Projection
  payload hashes are correct, but their handoff manifest is only transitively
  pinned and not directly verified by the SDK checker.
- The other identity, disposition, SDK-status, WebSocket, Sobek, node, action /
  schema, source-map, and scope checks passed. The inventory remains 47 unique
  identities with no public SDK support inferred from Holm existence.
- `npm run test:holm-non-http-parity`, 231 source tests, full `npm run ci`, diff
  hygiene, package checks, and fresh read-only pinned Holm verification pass.
  Live Holm had moved cleanly to `cc916bb…` / `0.209.2`; live mode correctly
  reported drift and relevant finding sources were unchanged from the pin.
- No public `src/**`, `dist/**`, version, release, publication, deployment,
  Holm, Medialab, or `@zyt` change was made.

## Next session

1. Add strict RED regressions for complete provenance/authority semantics and
   direct Default Projection payload verification.
2. Correct operator-admin auth, typed-channel limit, and per-owner member-media
   truth in Evidence `#009` without changing Holm or implementing a public API.
3. Rerun focused/full validation and `--check-pinned`, commit the bounded S4
   remediation, and request a fresh independent mapping review. If green, accept
   and resolve Issue `#019`, then stop.

## Later

- Public WebSocket, Sobek, capability, or action/schema implementation requires
  demand, architecture reconciliation where needed, fresh RED evidence, and a
  separately activated stop gate.
- The 19 deferred admin/operator route rows remain separately demand-driven.
- npm publication, SDK release, deployment, Holm edits, and Medialab writes
  require separate explicit owner approval.

## Stable baseline

- `@holmhq/sdk@0.2.1` remains the current public immutable release.
- Public `0.2.1` retains 189/216 admin inventory; unreleased source has 191
  route/method contracts and 218 methods.
