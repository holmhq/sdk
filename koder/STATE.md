---
updated_at: "17 Aug 2026 | 03:20 PM IST"
state: REVIEW_READY
active_window: "Issue #019 S4 — non-HTTP parity mapping checkpoint"
active_issue: "019"
orchestration_mode: "direct; serial main; no queue"
stop_gate: "one independent S4 mapping review with fresh read-only pinned Holm verification; no public implementation, release, or next issue"
---

# Koder State

## Current

- Issue [`#019`](issues/019_holm_route_registry_refresh/INDEX.md) S4 mapping
  landed in `d941db5`. Evidence
  [`#009`](evidence/009_holm_non_http_parity/INDEX.md) resolves 47 exact
  identities: 9 WebSocket, 21 Sobek, 10 node/capability, and 7 action/schema.
- The map pins every relied-on source byte to clean Holm commit `44d51d0f…`
  (`v0.208.0` marker, `v0.208.0-128-g44d51d0f7`) and SDK product baseline
  `c06f98f`. Disposition is 2 adopted, 12 redesigned, 31 deferred, and 2
  excluded; SDK status is 4 current, 1 partial, 9 candidate, 26 none, and 7
  unsupported.
- Holm realtime now proves authenticated private/presence channels, policies,
  and whispers, but also legacy bare channels, lossy/newline-coalesced delivery,
  source-specific presence fanout, and no binary/replay/general-client-publish
  contract. The SDK still ships no production realtime transport.
- Twenty grouped Holm injected host surfaces remain distinct from the current
  two-operation SDK Sobek preview seam. Holm manifest strings remain internal
  inputs to compound authorization, not versioned SDK capability offers.
- Holm Issue `#534` supersedes the standalone CLI action transport: GET/POST is
  canonical. The offline Default Projection fixture is concrete, while live
  registry/discovery, generic CLI, generated actions, and state/query registry
  support remain unavailable.
- The fail-closed map checker is wired into normal CI. Focused tests pass 4/4,
  source tests pass 231/231, full `npm run ci`, pinned read-only Holm checking,
  package smoke, coverage, licenses, size, and diff hygiene pass.
- After the clean pin was captured, the read-only Holm checkout advanced and an
  unrelated route-registry run dirtied tracked files. Live mode correctly
  reports drift; pinned-object verification remains green. No unfinished peer
  implementation was ingested and no Holm write was made.
- S3 remains independently accepted in `c7e589b`; all 19 other admin deltas stay
  deferred. No public SDK source, `dist`, version, release, publication,
  deployment, Medialab, or `@zyt` change was made in S4.

## Next session

1. Independently review exact S4 range `c06f98f..d941db5`, including all 47 map
   identities, disposition truth, checker failure modes, and source-map updates.
2. Run `npm run test:holm-non-http-parity`, full validation as needed, and fresh
   read-only `--check-pinned` verification against Holm `44d51d0f…`; record all
   P1/P2/P3 findings.
3. If review is green, accept and resolve S4/Issue `#019`, then stop. Any
   WebSocket, Sobek, capability, action/schema, release, or cross-repository
   implementation requires a separately activated owner scope.

## Later

- Public implementation candidates require demand, an explicit architecture
  reconciliation where needed, strict RED evidence, and their own stop gates.
- The 19 deferred admin/operator rows remain separately demand-driven.
- npm publication, SDK release, deployment, Holm edits, and Medialab writes
  require separate explicit owner approval.

## Stable baseline

- `@holmhq/sdk@0.2.1` remains the current public immutable release.
- Public `0.2.1` retains 189/216 admin inventory; unreleased source has 191
  route/method contracts and 218 methods.
