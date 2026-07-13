---
status: open
priority: P1
created: 2026-07-13
updated: 2026-07-13
tags: sdk, typescript, surfaces, state, realtime, frameworks, bfbb
source:
  repo: holmhq/holm
  commit: 11ceae0d88e9c800eb77916e3244fbd231ad81bb
  proposal: koder/proposals/001_universal_app_runtime/INDEX.md
  issue: koder/issues/486_universal_app_runtime_extraction_map/INDEX.md
type: design
issue_kind: track
slice_count: 14
slices_done: 0
context: Build a new universal TypeScript SDK without deleting the existing Holm SDK/state packages, then migrate capabilities only with conformance evidence.
---

# Issue 001: Universal Holm SDK Foundation

## One-line thesis

Build `@holmhq/sdk` as one elegant, extensible TypeScript SDK for Holm's web,
CLI, server/Sobek, and future desktop/mobile surfaces, with framework-neutral
reactive resources, explicit runtime adapters, optional framework/CRDT
extensions, and BFBB-vendorable JavaScript artifacts.

## Problem

Holm already has a capable zero-dependency JavaScript HTTP client and a separate
reactive-state experiment, but the product is fragmented:

- app/admin transport and reactive resources are separate discoveries;
- browser assumptions leak into the current universal-client claim;
- the state implementation is coupled to Vue reactivity;
- templates do not consistently lead developers through the SDK;
- CLI, desktop, and mobile surfaces need one lower contract without one UI DSL;
- realtime authorization/presence and CRDT strategy are evolving independently;
- manually vendored bundles can drift from source.

The new repository is an opportunity to establish clean contracts without a
flag-day rewrite. Existing Holm packages stay operational while capabilities
move one evidenced slice at a time.

## Locked product decisions

1. Repository: `holmhq/sdk` product identity; current remote is
   `git@github.com:holmhq-admin/sdk.git`.
2. Package name: `@holmhq/sdk`.
3. Source language: strict TypeScript; consumers receive generated ESM JS,
   declarations, and source maps.
4. License: MIT.
5. npm publishing is deferred; `package.json` remains `private` until explicit
   release approval.
6. Initial distribution uses committed build artifacts and immutable
   GitHub/jsDelivr tag or SHA URLs.
7. Typical BFBB apps vendor a pinned artifact locally rather than requiring npm
   or a runtime CDN.
8. A complete convenience bundle is acceptable; narrow artifacts/entry points
   still enforce runtime isolation and measurable size budgets.
9. Existing `packages/holm-sdk` and `packages/holm-state` are not deleted now.
10. Breaking redesign is allowed where it improves the long-term contract;
    migration is conformance-driven, not API-shape preservation by default.

## Architectural center

The SDK has three independent axes:

| Axis | Initial members |
| --- | --- |
| Capabilities | auth, actions, HTTP, queries/mutations, state, realtime, collaboration, uploads, debug |
| Runtime/surface adapters | web, Node/CLI, server/Sobek, test; reserved desktop/mobile bridges |
| Framework bindings | vanilla, React, Angular, Svelte, Vue |

The durable lower contract is Holm's action/state/schema/capability registry,
not this package. Runtime adapters decide how calls cross a boundary. Framework
bindings translate immutable snapshots/subscriptions without owning transport or
server semantics.

```text
Holm action/state/schema contract
                ↓
      @holmhq/sdk capability core
                ↓
 web/HTTP · CLI/Node · Sobek · desktop/mobile bridge
                ↓
 vanilla · React · Angular · Svelte · Vue
```

## Universal App Runtime alignment

This track adopts the converged Holm surface model:

- web remains the implicit root/BFBB surface;
- `surfaces/cli/main.js` defines structured actions before any TUI framework;
- desktop remains probe-gated and uses mailbox/message-passing boundaries;
- mobile remains a reserved thin-client/native-bridge target with no offline DB
  replication contract yet;
- caller identity/capability envelopes differ by surface;
- interfaces share actions/state/schema, not one write-once UI language.

SDK action-authoring helpers must remain optional sugar over independently
serializable JSON Schema contracts.

## Reactive and realtime boundaries

Keep these semantics explicit:

| Layer | Semantics |
| --- | --- |
| Query/resource | Authoritative server state; immutable snapshot, refresh/reconcile, loading/error status |
| Realtime channel | Ephemeral events/presence/whispers; reconnect and delivery policy but no implied durable replay |
| Collaboration document | Durable op log/snapshot/reconcile plus an optional CRDT codec/provider |

Yjs, Automerge, Loro, and similar engines are optional peers/extensions. The
core must support binary payloads and codec seams without bundling a CRDT engine
into every app.

## Package and build direction

Expected shape (to be confirmed by Slice 002):

```text
src/
  core/
  state/
  actions/
  transports/
  runtimes/{web,node,sobek,test,desktop,mobile}/
  realtime/
  collaboration/
  frameworks/{react,angular,svelte,vue}/
test/
conformance/
dist/
```

Candidate public subpaths:

```text
@holmhq/sdk
@holmhq/sdk/web
@holmhq/sdk/node
@holmhq/sdk/state
@holmhq/sdk/react
@holmhq/sdk/angular
@holmhq/sdk/svelte
@holmhq/sdk/vue
@holmhq/sdk/collaboration
```

Candidate BFBB artifacts:

```text
dist/holm.js
dist/holm-web.js
dist/holm-node.js
```

Names are not frozen until architecture and build slices pass review.

## Holm source baseline

Canonical routing document:
[`koder/docs/HOLM_SOURCE_MAP.md`](../../docs/HOLM_SOURCE_MAP.md).

Highest-value sources at Holm commit
`11ceae0d88e9c800eb77916e3244fbd231ad81bb`:

- `koder/proposals/001_universal_app_runtime/INDEX.md`
- `koder/issues/486_universal_app_runtime_extraction_map/INDEX.md`
- `koder/issues/196_holm_ui_framework/INDEX.md`
- `koder/issues/341_app_member_scope_semantics/INDEX.md`
- `koder/issues/342_collaboration_crdt_strategy/INDEX.md`
- `koder/issues/485_node_lite_framework_compatibility_probe/INDEX.md`
- `koder/issues/517_realtime_channel_auth_presence/INDEX.md`
- `packages/holm-sdk/`
- `packages/holm-state/`
- `internal/hosting/{ws.go,realtime.go}`

## Slice Ledger

| Slice | Status | Ref | Depends on | Closure gate |
| --- | --- | --- | --- | --- |
| Architecture charter and contract vocabulary | planned | [`#002`](../002_architecture_contract/INDEX.md) | — | reviewed architecture + API invariants |
| Strict TypeScript toolchain and conformance harness | planned | [`#003`](../003_typescript_toolchain/INDEX.md) | `#002` | source/dist/type tests green |
| Universal core, capabilities, adapters, extensions | planned | [`#004`](../004_universal_core/INDEX.md) | `#002`, `#003` | no DOM/Node ambient leakage |
| Transport, auth, cache, uploads, errors | planned | [`#005`](../005_transport_cache_auth/INDEX.md) | `#004` | transport conformance + parity fixtures |
| Framework-neutral reactive resources | planned | [`#006`](../006_reactive_resources/INDEX.md) | `#004`, `#005` | immutable snapshot/subscription tests |
| Web/app client migration | planned | [`#007`](../007_web_app_client/INDEX.md) | `#005`, `#006` | adopted app methods + browser tests |
| Admin/operator client migration | planned | [`#008`](../008_admin_client/INDEX.md) | `#005` | audited namespace parity report |
| Runtime/surface adapter contracts | planned | [`#009`](../009_runtime_surface_adapters/INDEX.md) | `#004`, `#005` | web/node/test adapters; reserved bridge contracts |
| Action/schema and CLI surface helpers | planned | [`#010`](../010_actions_cli_surface/INDEX.md) | `#004`, `#009` | JSON Schema fixture discovery/invocation |
| Realtime extension and future presence seam | planned | [`#011`](../011_realtime_extension/INDEX.md) | `#004`, `#006`, `#009` | current channel proof + future capability gates |
| Collaboration/oplog/CRDT extension seam | planned | [`#012`](../012_collaboration_extension/INDEX.md) | `#006`, `#011` | codec/provider contract + opaque binary fixtures |
| React/Angular/Svelte/Vue bindings | planned | [`#013`](../013_framework_bindings/INDEX.md) | `#006` | framework-native subscription examples/tests |
| BFBB bundles and jsDelivr vendoring | planned | [`#014`](../014_bfbb_distribution/INDEX.md) | `#003`–`#013` as included | reproducible tracked artifacts + size report |
| Docs, migration ledger, end-to-end closeout | planned | [`#015`](../015_docs_migration_closeout/INDEX.md) | all prior slices | examples/conformance/ownership handoff complete |

## Recommended execution order

```text
002 → 003 → 004 → 005 → 006
                    ├→ 007
                    ├→ 008
004 + 005 → 009 → 010
006 + 009 → 011 → 012
006 → 013
all included capability slices → 014 → 015
```

One agent may own the repository end to end and execute slices serially on
`main`. Do not run overlapping implementation agents in this repo without
explicit worktree ownership; parallelism is expected across repositories.

## Cross-slice invariants

1. Core compiles without DOM or Node ambient libraries.
2. Runtime/platform behavior enters through explicit adapters, not global
   sniffing spread across capabilities.
3. Public resource state is immutable and subscription-based.
4. Capability negotiation is explicit; future desktop/mobile/realtime features
   are not presented as available before Holm ships them.
5. Auth/caller context is surface-specific and never inferred as universally
   cookie-based.
6. No SDK API bypasses Holm authorization or exposes raw SQLite.
7. Framework and CRDT runtimes remain optional peers.
8. Source and generated JS are both tested.
9. Every migrated Holm behavior names its source path/commit and conformance
   evidence.
10. No npm publish, production deploy, or Holm source mutation occurs without
    explicit user approval.
11. `dist/` artifacts are reproducible, content-hashed, and size-reported.
12. BFBB consumers can run from vendored files with no package install or public
    CDN at runtime.
13. MIT/license compatibility is checked for every dependency.
14. No slice silently deletes or deprecates the existing Holm packages.

## Track acceptance criteria

- [ ] All child slices are completed or explicitly reconciled as deferred with
      evidence.
- [ ] `@holmhq/sdk` has a reviewed strict-TypeScript architecture and stable
      initial public contract.
- [ ] Core, web, Node/CLI, test, state, app, and admin paths pass conformance.
- [ ] Realtime and collaboration have honest shipped-versus-future capability
      gates and extension tests.
- [ ] React, Angular, Svelte, Vue, and vanilla usage are demonstrated without a
      framework dependency in core.
- [ ] A complete BFBB ESM artifact can be vendored from a commit-pinned jsDelivr
      URL and passes a no-build browser smoke test.
- [ ] npm remains unpublished/private unless a separate explicit release
      decision changes that state.
- [ ] Existing Holm SDK/state ownership remains documented; no deletion occurs
      under this track.
- [ ] README, architecture, API, migration, and contribution guidance are
      sufficient for a new agent or human to continue without chat history.

## Non-goals

- Implementing Holm's desktop or mobile runtime in this repository.
- Implementing the missing Holm CLI action registry/server commands.
- Implementing realtime authorization/presence inside Holm core.
- Choosing or embedding one mandatory CRDT engine.
- Building a cross-platform UI DSL or component framework.
- Running arbitrary framework SSR/Node servers on Holm.
- Publishing to npm during the foundation track without an explicit user
  decision.
- Deleting `packages/holm-sdk` or `packages/holm-state` from Holm.
