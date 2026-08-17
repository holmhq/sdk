---
title: Holm Source Map for SDK Extraction
updated: 2026-08-17
holm_baseline: 11ceae0d88e9c800eb77916e3244fbd231ad81bb
latest_non_http_checkpoint: 44d51d0f785ff6208ecc034c720e76a8543891be
---

# Holm Source Map

This SDK is extracted deliberately from Holm while Holm remains the runtime and
protocol authority. Do not reconstruct contracts from chat history. Start from
the pinned baseline below, then verify live source when behavior matters.

## Baseline

- Local checkout: `~/Projects/holmhq/holm/master`
- GitHub: `https://github.com/holmhq/holm`
- Pinned commit: `11ceae0d88e9c800eb77916e3244fbd231ad81bb`
- Platform marker at baseline: `v0.182.0` (`version.json`)

Use links of this form in durable design/review evidence:

```text
https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/<path>
```

## Current non-HTTP checkpoint

Issue `#019` S4 maps current WebSocket, injected Sobek, node/manifest
capability, and action/schema truth in
[`koder/evidence/009_holm_non_http_parity/INDEX.md`](../evidence/009_holm_non_http_parity/INDEX.md).
Its machine map pins every source byte to clean Holm commit
`44d51d0f785ff6208ecc034c720e76a8543891be` (`v0.208.0` marker,
`v0.208.0-128-g44d51d0f7`). Use that evidence rather than this older
architecture baseline when making a non-HTTP implementation claim.

## Universal runtime and surfaces

| Contract | Holm path | Why it matters |
| --- | --- | --- |
| Original universal app runtime | `koder/proposals/001_universal_app_runtime/INDEX.md` | Historical source for caller/surface, mailbox, BFBB, and no-universal-UI invariants. Its standalone CLI action shape is not current authority. |
| Superseded extraction map | `koder/issues/486_universal_app_runtime_extraction_map/INDEX.md` | Historical extraction evidence only; Issue `#534` supersedes its CLI-owned action model. |
| Contract-first app authority | `koder/issues/534_contract_first_holm_apps/INDEX.md` | Canonical schema-described GET/POST contract with optional CLI/default/agent projections; production registry/discovery slices remain separately gated. |
| Holm protocol direction | `koder/issues/085_holm_protocol/INDEX.md` | Long-term implementation-independent identity/mesh direction and possible non-Go protocol participants. |
| Framework compatibility probe | `koder/issues/485_node_lite_framework_compatibility_probe/INDEX.md` | Static React/Angular/Svelte feasibility versus unsupported arbitrary Node/SSR assumptions. |

SDK rule: contract and schema authority is owned by Holm. Issue `#534` makes
GET/POST the canonical invocation wire and projections consume route metadata;
SDK helpers may author or consume ordinary data, but must not revive the
superseded standalone action transport or make the contract package-dependent.

## Existing JavaScript client

| Surface | Holm path | Extraction use |
| --- | --- | --- |
| Public factories | `packages/holm-sdk/index.js` | Existing `createClient()` / `createAppClient()` behavior and exports. |
| Distribution entry | `packages/holm-sdk/entry.js` | Current production bundle boundary. |
| HTTP transport | `packages/holm-sdk/client.js` | Fetch adapter, auth, response envelopes, uploads, hooks, cache integration. |
| Cache | `packages/holm-sdk/cache.js` | TTL, SWR, deduplication, LRU, events, prefix invalidation. |
| App client | `packages/holm-sdk/app.js` | Browser/member auth, app HTTP, links, uploads, surface URLs. |
| Admin client | `packages/holm-sdk/admin.js` | Operator namespace and route wrappers. |
| Runtime normalization | `packages/holm-sdk/runtime.js` | Current browser/Node assumptions and app surface bootstrap. |
| Error contract | `packages/holm-sdk/errors.js` | Existing API error shape. |
| Types | `packages/holm-sdk/types.js` | JSDoc payload/options inventory to translate into strict TypeScript deliberately. |
| Tests | `packages/holm-sdk/test.js` | Behavioral parity source; do not claim migration without corresponding conformance proof. |
| Route audits | `packages/holm-sdk/{admin.audit.js,app.audit.js,surface.audit.js}` | Audited route coverage and intentional exclusions. |
| Build | `packages/holm-sdk/build.sh` | Current single-file ESM generation and version stamping. |
| Package metadata | `packages/holm-sdk/package.json` | Existing independent package version (`0.75.0`) and artifact name. |

Do not copy the current API mechanically. Preserve behavior only where a slice
explicitly adopts it and tests prove parity.

## Existing reactive state work

| Surface | Holm path | Extraction use |
| --- | --- | --- |
| Public state exports | `packages/holm-state/src/index.js` | Existing primitive inventory. |
| Signals | `packages/holm-state/src/signals.js` | Current Vue-reactivity-backed contract; migration input, not universal-core mandate. |
| Remote resources | `packages/holm-state/src/remote.js` | Caching/write-back ideas and current transport coupling to reconsider. |
| Realtime channel state | `packages/holm-state/src/channel.js` | Existing reactive channel semantics and lifecycle tests. |
| Auth guards | `packages/holm-state/src/guard.js` | Reactive auth/redirect behavior. |
| Routing | `packages/holm-state/src/route.js` | Headless navigation state. |
| Tracking/debug | `packages/holm-state/src/{track.js,debug.js}` | History, replay, and observability ideas. |
| Tests | `packages/holm-state/test/` | Behavioral source and edge-case inventory. |
| Original design | `koder/issues/196_holm_ui_framework/INDEX.md` | Headless state versus optional DOM renderer; package topology is open to redesign here. |

Universal SDK rule: public reactive resources must expose framework-neutral,
immutable snapshots and subscriptions. No Vue/React/Angular/Svelte runtime may
be required by the core.

## Realtime, scope, and collaboration

| Contract | Holm path | Why it matters |
| --- | --- | --- |
| Historical realtime gap track | `koder/issues/517_realtime_channel_auth_presence/INDEX.md` | Historical gap source; do not use it as current capability truth after private/presence/whisper work landed. |
| Earlier auth foundation | `koder/issues/388_authenticated_member_realtime_channels/INDEX.md` | Member/app-aware private channel requirements and history. |
| Group-private scopes | `koder/issues/341_app_member_scope_semantics/INDEX.md` | App/member/group privacy levels and scoped realtime/storage requirements. |
| CRDT strategy | `koder/issues/342_collaboration_crdt_strategy/INDEX.md` | Oplog/snapshot substrate first; Yjs/Automerge/Loro evaluation; opaque update safety. |
| Current server runtime API | `internal/hosting/realtime.go` | Existing server-side `holm.realtime` broadcast, subscriber/count, and kick methods. |
| Current websocket hub | `internal/hosting/{ws.go,ws_auth.go}` | Exact `/_ws` JSON protocol, legacy/private/presence channels, whispers, heartbeat, loss, and lifecycle semantics. |
| Current socket auth | `internal/realtimeauth/resolver.go` | Session/API-key/space-token resolution and app-read authorization. |
| Current tests | `internal/hosting/{realtime_test.go,ws_auth_test.go,ws_test.go,ws_stress_test.go}` | Existing behavior and capacity evidence. |
| App guidance | `knowledge-base/skills/app/references/multiplayer-patterns.md` | Durable-state-first, broadcast-then-reconcile pattern. |

SDK rule: keep ephemeral realtime, authoritative query state, durable events/
queues, and collaboration logs as distinct contracts. Current Holm source has
typed private/presence channels and whispers but still no binary/replay
contract; use Evidence `#009` for exact limits and fanout. CRDT engines remain
optional codecs/providers, never an implicit core dependency.

## Current documentation and app defaults

| Topic | Holm path |
| --- | --- |
| SDK concept | `docs/concepts/sdk.md` |
| Generated SDK reference | `docs/reference/sdk.md` |
| App client primitives | `knowledge-base/skills/app/references/client-primitives.md` |
| Cache semantics | `knowledge-base/workflows/holm-sdk/caching.md` |
| Distribution model | `knowledge-base/workflows/holm-sdk/distribution.md` |
| SDK extension workflow | `knowledge-base/workflows/holm-sdk/extending.md` |
| App skill defaults | `knowledge-base/skills/app/SKILL.md` |
| Minimal shipped templates | `internal/assets/templates/` |
| Full reference recipe | `knowledge-base/skills/app/recipes/zippy/` |

The current docs correctly mention `createAppClient()`, but some templates still
use raw `fetch()`. New SDK examples and eventual Holm template migration must
make the intended path executable by default, not merely documented.

## Cross-repo discipline

- Do not edit Holm from an SDK slice unless the user explicitly authorizes a
  cross-repo change.
- File a Holm issue when the SDK needs a missing runtime/protocol capability.
- Record the Holm commit used by each conformance refresh.
- Keep protocol fixtures small and generated/reviewable; do not vendor the Holm
  repository or copy large source excerpts here.
- Existing Holm `packages/holm-sdk` and `packages/holm-state` remain operational
  until a separately evidenced cutover.
