---
title: Holm SDK Architecture Decision Register
status: proposed-for-approval
updated: 2026-07-14
issue: 002
holm_baseline: 11ceae0d88e9c800eb77916e3244fbd231ad81bb
---

# Architecture Decision Register

This register is the compact review companion to
[`ARCHITECTURE.md`](ARCHITECTURE.md). Every entry is an A1 recommendation, not a
published API promise. Status remains **proposed for approval** until the owner
passes the Issue `#002` review gate.

Confidence means confidence that the boundary is correct, not confidence that a
corresponding Holm capability already ships.

## Summary

| ID | Decision | Confidence |
| --- | --- | --- |
| `D001` | Keep Holm contracts authoritative and model three independent SDK axes | High |
| `D002` | Use explicit `createHolm({ runtime, caller, extensions })`; no singleton | High |
| `D003` | Route all work through explicit runtime adapters and copied operation envelopes | High |
| `D004` | Negotiate namespaced major/minor capabilities and fail closed | High |
| `D005` | Separate surface caller context from adapter-private auth proof | High |
| `D006` | Restrict boundaries to validated JSON/bytes and serializable mailbox messages | High |
| `D007` | Standardize immutable resource snapshots and subscriptions | High |
| `D008` | Seal extension composition with one owner per namespace | High |
| `D009` | Keep action/state/schema documents SDK-independent; helpers are optional | High |
| `D010` | Make lifecycle, clocks, scheduling, and cancellation explicit | High |
| `D011` | Normalize failures into one serializable typed error taxonomy | High |
| `D012` | Keep query, realtime, and collaboration semantics separate and gated | High |
| `D013` | Isolate universal, runtime, capability, and framework package subpaths | Medium-high |
| `D014` | Ship reproducible SHA-addressed ESM artifacts while npm remains private | High |
| `D015` | Migrate by conformance evidence, not old API shape or flag-day replacement | High |

## `D001` — Authority and three axes

**Recommendation:** Holm owns action/state/schema/auth/storage/protocol truth.
The SDK independently composes capabilities, runtime/surface adapters, and
framework bindings.

**Rationale:** This permits web HTTP, CLI/Node, injected Sobek, tests, and future
mailboxes to share contracts without making HTTP or a UI framework universal.
It preserves Proposal 001's “share the model, not one UI language” rule.

**Rejected alternatives:**

- SDK-defined server truth or raw SQLite access — authorization and ownership
  conflict.
- One client class per framework/surface — duplicated semantics and drift.
- One universal UI DSL — explicitly rejected by Holm's converged proposal.

**Evidence:** Holm Proposal 001, Issue 486, and SDK Issue `#001` invariants.

## `D002` — Explicit instance factory

**Recommendation:** The primitive factory is
`createHolm({ runtime, caller, extensions })`. It creates an isolated instance;
there is no default/global client and no post-construction `use()` mutation.
Convenience factories compose the same primitive explicitly.

**Rationale:** Caller, cache, timer, listener, and capability isolation become
testable. Platform behavior cannot leak through module state. Generic extension
types can expose installed namespaces without runtime overwrites.

**Rejected alternatives:**

- Preserve `getClient()` singleton — leaks auth/configuration across consumers.
- Infer runtime/caller from globals in core — violates runtime neutrality.
- Mutable plugin installation after startup — makes namespace/lifecycle order
  nondeterministic.

**Confidence:** High.

## `D003` — Runtime adapter operation boundary

**Recommendation:** Every capability invokes one explicit `RuntimeAdapter`
using a capability requirement, operation name, per-call caller context,
validated payload, and cancellation control. Web, Node/CLI, Sobek, test, and
future mailbox implementations conform to that boundary.

**Rationale:** HTTP becomes one transport rather than the architecture. Sobek
need not call itself over HTTP. Native loops cannot share mutable objects with
JS. A common conformance suite can exercise caller propagation, serialization,
errors, cancellation, and disposal.

**Rejected alternatives:**

- Direct `fetch`/`window`/`process` usage across capability modules — ambient
  leakage.
- A giant platform switch inside core — untestable and hard to tree-shake.
- Exposing a mutable service locator — weak namespace and capability ownership.

**Confidence:** High.

## `D004` — Capability identity and negotiation

**Recommendation:** Use opaque namespaced IDs (`holm.*`, `sdk.*`, or a
third-party reverse domain) with integer `{major, minor}` versions. Requirements
match the same major and at least a minimum minor. Missing and mismatched
capabilities fail with distinct typed errors before invocation.

Runtime offers come from actual adapter support, future handshakes, or
conservative conformance manifests pinned to Holm commits. Holm version strings
never imply capability support.

**Rationale:** Additive evolution is simple and dependency-free. Granular IDs
prevent dangerous fallback, such as treating public realtime as private or
presence-capable. Future features remain honest.

**Rejected alternatives:**

- Boolean feature flags — no compatibility evolution.
- Full semver-range parser in core — unnecessary complexity/dependency.
- Optimistic method calls or version sniffing — falsely advertises capability.
- One broad `realtime` capability — conflates materially different security and
  delivery semantics.

**Confidence:** High. Exact canonical IDs remain Holm-owned when its registry is
implemented; the ownership/version rule is the decision.

## `D005` — Caller context and auth proof

**Recommendation:** Resolve serializable caller context for every invocation,
including surface, principal kind/opaque ID, app/scope, and audit intent. Keep
cookie/token/injected/native proof private to the runtime auth provider. Include
a non-secret caller fingerprint in cache/resource identity.

**Rationale:** Web sessions, CLI operators/tokens, Sobek injected callers,
future native shells, agents, and tests do not share one auth model. Holm still
resolves and authorizes the authoritative caller. Caller changes cannot reveal
prior-principal cache data.

**Rejected alternatives:**

- Universal cookie authentication — invalid outside web and wrong for explicit
  tokens.
- Put bearer proof in caller envelopes — leaks secrets into logs/snapshots.
- Trust client role/scope claims — authorization bypass.
- Capture caller once at construction — login/logout and selected-principal
  leakage.

**Confidence:** High.

## `D006` — Serialization and mailbox safety

**Recommendation:** Boundaries accept finite JSON-like values plus an SDK-owned
readonly-by-copy byte value. Reject `undefined`, bigint, functions, symbols,
class instances, dates, maps/sets, errors, cycles/shared graphs, and non-finite
numbers unless explicitly encoded. Reserve `$holm` for canonical tagged values.
Validate and copy on both sides.

Native bridges use versioned request/response/event/cancel mailbox envelopes,
request IDs, and copied values. No closures, native handles, SQLite handles, or
resource objects cross the boundary.

**Rationale:** The same data can cross HTTP, in-memory tests, Sobek, and native
loops without accidental shared mutation. Opaque CRDT updates remain possible
without forcing a CRDT engine into core.

**Rejected alternatives:**

- “Anything structured-clone accepts” — not portable to JSON/HTTP and can share
  platform assumptions.
- Base64-only public API — obscures binary intent and adds copies everywhere.
- Shared native/JS object graphs — unsafe event-loop/thread coupling.

**Confidence:** High.

## `D007` — Resource contract

**Recommendation:** Framework-neutral resources expose
`getSnapshot()`, `subscribe()`, `refresh()`, and `dispose()`. Snapshots are
readonly, referentially stable until a transition, revisioned, and caller
partitioned. They represent idle/loading/ready/error/disposed, stale/refreshing,
data, error, and timestamps. Mutations and optimistic rollback are explicit.

**Rationale:** Vanilla, React, Angular, Svelte, and Vue can consume one semantic
contract. Consumers cannot mutate canonical cache state. Realtime can signal
invalidation without becoming durable truth.

**Rejected alternatives:**

- Export Vue refs/signals from core — framework dependency and mutable public
  state.
- Make cache entries themselves the reactive API — conflates response reuse
  with observable lifecycle.
- Implicit write-back on arbitrary ref mutation — hidden side effects and poor
  conflict semantics.
- One global resource store — caller/instance leakage.

**Confidence:** High.

## `D008` — Extension graph and namespace ownership

**Recommendation:** Each extension has a unique ID/version and owns exactly one
readonly top-level namespace. Dependencies are versioned; conflicts are
explicit. Construction validates duplicates/cycles/conflicts and calculates a
stable topological order. Start follows dependency order; rollback/disposal is
reverse order. Composition is sealed after creation.

**Rationale:** A complete convenience client and narrow capability imports can
use the same core without silent method overwrite or lifecycle leaks.
Sub-providers (for example CRDT codecs) register under the owning extension.

**Rejected alternatives:**

- Last-plugin-wins object merging — silent contract corruption.
- Global extension registry — cross-instance leakage.
- Arbitrary asynchronous registration at any time — nondeterministic API/types.

**Confidence:** High.

## `D009` — SDK-independent registry

**Recommendation:** Holm action/state/schema contracts remain plain,
independently validatable data. Actions use JSON Schema draft 2020-12 and a
discriminated `sync | job` contract. `defineActions(...)` may infer types but
must emit ordinary registry JSON separately from handlers. Production
list/invoke remains capability-gated until Holm ships it.

**Rationale:** Go, other language implementations, CLI tools, agents, and raw
apps can consume the registry. The SDK is optional sugar rather than protocol
ownership.

**Rejected alternatives:**

- Put functions/classes/SDK brands in registry documents — no independent wire
  contract.
- Implement a competing client-only action protocol — divergence from Holm.
- Claim action support from proposal text alone — design is not runtime truth.

**Confidence:** High. Exact job fields and future state/query descriptor shape
remain Holm implementation decisions.

## `D010` — Lifecycle, clock, scheduler, cancellation

**Recommendation:** Instances move through validated
`created → starting → ready → disposing → disposed` states, with terminal
startup failure and reverse-order rollback. `start()` and `dispose()` are
idempotent; first use may share the same start promise. Runtime-supplied
clock/scheduler services govern TTL, timeout, debounce, backoff, and retry.
Every asynchronous operation supports SDK cancellation and timeout; runtime
subpaths bridge native abort APIs.

**Rationale:** Deterministic tests need no wall-clock sleeps. Teardown can prove
that requests, timers, sockets, and listeners do not leak. Core requires no
ambient timer or AbortSignal type.

**Rejected alternatives:**

- Start hidden global services at import/construction — side effects and leaks.
- Use ambient timers throughout core — non-deterministic tests/platform types.
- Treat canceling a wait as canceling a durable job — incorrect remote
  semantics.

**Confidence:** High.

## `D011` — Typed error taxonomy

**Recommendation:** Normalize expected failures to serializable `HolmError`
subtypes for capability, transport, remote, protocol, serialization,
cancellation, timeout, lifecycle, and extension failures. Preserve adopted Holm
status/code/details in `RemoteError`; keep local cause/stack out of serialized
forms. Redact auth and payload secrets from diagnostics.

**Rationale:** Callers can branch consistently across HTTP, Sobek, test, and
mailbox adapters. Missing capability is distinguishable from network failure or
a remote authorization response.

**Rejected alternatives:**

- Preserve only current `ApiError(status, code, ...)` — HTTP-specific.
- Throw strings/native errors directly — unstable and often unserializable.
- Serialize stacks/causes/headers by default — secret and implementation leaks.

**Confidence:** High.

## `D012` — State/realtime/collaboration separation

**Recommendation:** Authoritative query resources, ephemeral realtime channels,
and durable collaboration documents are separate capabilities. App scope is a
server-enforced future capability. Private realtime, presence, sender
exclusion, whispers, binary guarantees, oplog, and CRDT behavior each fail
closed until offered. CRDT engines remain optional providers/peers.

**Rationale:** Pinned Holm source currently proves public subscribe/unsubscribe
and server broadcast only. Issue `#517`, `#341`, and `#342` document the missing
security/storage semantics. Separation enables broadcast-then-reconcile and
prevents lost durable state.

**Rejected alternatives:**

- Model a channel as durable state — no replay/reconcile guarantee.
- Fall private/presence back to public — security failure.
- Embed Yjs or another engine by default — premature semantics and bundle cost.
- Simulate scope authorization in the client — unenforceable.

**Confidence:** High.

## `D013` — Package export isolation

**Recommendation:** Keep `@holmhq/sdk` environment-neutral. Use explicit
subpaths for `web`, `node`, `sobek`, `test`, `bridge`, `app`, `admin`, `state`,
`actions`, `realtime`, `collaboration`, and framework bindings.
`@holmhq/sdk/state` is the canonical clean-break entry point for framework-neutral
query, mutation, derived-resource, `Resource`, and `ResourceSnapshot` APIs. It
does not preserve the legacy `holm-state` exports, and there is no initial
`@holmhq/sdk/resources` alias. Root declarations reference neither DOM nor Node
ambient types. Frameworks and CRDTs are optional peers/separate providers.

**Rationale:** Consumers import only intended runtimes/capabilities. `state`
aligns with Holm's action/state/schema product vocabulary, while resource
remains the precise API/type vocabulary inside that entry point. Universal core
compiles in constrained environments, while BFBB and framework paths stay
ergonomic. Explicit imports avoid runtime sniffing and accidental bundle cost.

**Rejected alternatives:**

- Root re-exports every concrete runtime — ambient type/bundle contamination.
- One file selected by global sniffing — ambiguous and untestable.
- Preserve legacy `holm-state` exports under `/state` — accidental API-shape
  compatibility without migration evidence.
- Publish both `/state` and `/resources` initially — duplicate public contracts
  and needless alias maintenance.

**Confidence:** Medium-high. Review should confirm the breadth/naming of public
subpaths before Issue `#003`; implementation may omit a subpath until its owning
slice exists but must not collapse boundaries.

## `D014` — Artifact and distribution strategy

**Recommendation:** Plan three tracked ESM compositions:

- `dist/holm.js`: complete browser/BFBB first-party convenience build;
- `dist/holm-web.js`: app-focused browser build without admin/non-web adapters;
- `dist/holm-node.js`: Node/CLI build without browser implementation.

No artifact bundles framework or CRDT runtimes. Every artifact gets a source
map/build manifest with commit, included capabilities, SHA-256, raw/minified/
gzip sizes, and license. Rebuilds and source/declaration/bundle tests gate
commits. Distribution uses immutable GitHub/jsDelivr SHA/tag URLs and local
vendoring. npm stays private/unpublished.

**Rationale:** BFBB apps need one easy local file; constrained/runtime-specific
consumers need isolation. Hashes and immutable addresses prevent generated-file
drift without requiring npm or runtime CDN access.

**Rejected alternatives:**

- One “universal” bundle containing/sniffing every runtime — size and ambient
  leakage.
- Only tiny modules — poor BFBB ergonomics.
- CDN `@main` imports — mutable production dependency.
- Publish npm during foundation work — explicitly unauthorized.

**Confidence:** High for distribution invariants, medium-high for exact artifact
composition. First implementation establishes reviewed size budgets.

## `D015` — Conformance-led migration

**Recommendation:** Existing Holm SDK/state packages stay operational. Each
behavior is classified adopted, redesigned, deferred, or excluded, with a source
path/commit and source plus generated-artifact conformance evidence. Do not
preserve old shape by default and do not delete/deprecate at replacement time.

**Rationale:** The old SDK contains valuable HTTP/cache/upload/admin behavior,
but also browser/global assumptions and a singleton. `holm-state` contains useful
resource ideas but is Vue-coupled and conflates ephemeral channels with state.
A route/behavior ledger prevents silent loss without cementing accidental APIs.

**Rejected alternatives:**

- Mechanical TypeScript port — preserves fragmentation and ambient leakage.
- Greenfield rewrite with no parity ledger — silent regressions.
- Flag-day deletion/redirection — violates migration ownership and current Holm
  consumers.

**Confidence:** High.

## Alternatives retained for later slices

These are deliberately delegated rather than unresolved architecture blockers:

- build/test tooling and exact compiler/bundler (`#003`);
- endpoint payload inventory and cache defaults (`#005`, `#007`, `#008`);
- exact action job fields until Holm implements the registry (`#010`);
- realtime auth/presence/binary wire additions until Holm `#517` (`#011`);
- a concrete CRDT provider (`#012`);
- Angular binding convenience and first measured bundle budgets (`#013`,
  `#014`).

## Review question

**Approve `D001`–`D015` as the implementation contract, or identify revisions
required before Issue `#003`, with particular attention to `D004` capability
versioning, `D008` sealed extension namespaces, and `D013`/`D014` package and
artifact boundaries.**
