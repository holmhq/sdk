---
title: Holm SDK Architecture Contract
status: approved
updated: 2026-07-14
issue: 002
holm_baseline: 11ceae0d88e9c800eb77916e3244fbd231ad81bb
---

# Holm SDK Architecture Contract

## Status and intent

This is the approved architecture contract for
[Issue `#002`](../issues/002_architecture_contract/INDEX.md). It defines the
boundaries that implementation issues must test. It does **not** claim that the
new SDK, Holm's CLI action registry, private realtime, collaboration substrate,
desktop runtime, or mobile runtime already exists.

All TypeScript in this document is **illustrative contract shape**. It is precise
enough to become type fixtures in Issue `#003`, but names and syntax are not a
published compatibility promise until implementation and review make them one.

Holm remains the runtime and protocol authority. This repository owns a portable
client implementation, not a parallel server contract. Source evidence is pinned
to Holm commit
[`11ceae0d88e9c800eb77916e3244fbd231ad81bb`](https://github.com/holmhq/holm/tree/11ceae0d88e9c800eb77916e3244fbd231ad81bb).

## Architectural thesis

`@holmhq/sdk` is a strict-TypeScript, environment-neutral kernel composed along
three independent axes:

```text
                    Holm-owned action / state / schema contracts
                                      │
                                      ▼
                 ┌─────────────────────────────────────────┐
Capabilities     │ auth · HTTP · actions · resources       │
                 │ realtime · collaboration · uploads      │
                 └────────────────────┬────────────────────┘
                                      │ operation envelopes
                                      ▼
Runtime/surface  web · Node/CLI · server/Sobek · test · reserved native bridge
adapters                              │
                                      ▼
Frameworks       vanilla · React · Angular · Svelte · Vue
```

The axes do not imply a matrix of duplicated clients:

- a **capability** defines what operation can be requested;
- a **runtime adapter** defines how that operation crosses its current boundary;
- a **surface** identifies the caller and interaction context using that runtime;
- a **framework binding** translates resource snapshots and subscriptions only.

HTTP is one adapter mechanism, not the universal center. A web surface can use
HTTP; a CLI surface can use Node HTTP or a local process adapter; Sobek can call
injected runtime APIs; a future native shell can use a mailbox. All use the same
capability, caller, serialization, error, and lifecycle rules.

## Authority and ownership

### Holm owns

- action, state/query, schema, capability, auth, storage, scope, realtime, and
  collaboration semantics implemented by the runtime;
- authorization decisions and the authoritative caller resolved from proof;
- JSON/wire endpoints and injected Sobek APIs;
- app bundle and surface rules, including root `index.html`, `api/main.js`, and
  optional `surfaces/`;
- whether a capability is actually available on a node.

### The SDK owns

- TypeScript client contracts and runtime adapter interfaces;
- capability negotiation and honest unsupported behavior;
- transport, resource, extension, cancellation, lifecycle, and error behavior;
- optional authoring helpers that emit independently valid Holm contracts;
- framework bindings and optional collaboration provider seams;
- generated ESM, declarations, source maps, manifests, and conformance fixtures.

### Neither layer may blur the boundary

- The SDK never exposes raw SQLite or bypasses Holm authorization.
- Caller claims in a client envelope are context, not proof the server must
  trust.
- Registry JSON remains usable without importing this package.
- Native loops receive messages and immutable snapshots, not shared mutable JS
  objects.
- Framework bindings do not define server semantics or a universal UI DSL.
- Desktop/mobile mocks and types do not constitute production capability.

## Vocabulary

| Term | Contract meaning |
| --- | --- |
| **Registry** | Holm-owned, plain-data descriptions of actions and, when defined by Holm, state/query schemas and capability identity. It contains no SDK object or executable closure. |
| **Capability** | A namespaced, versioned unit of behavior that a runtime or local extension can truthfully offer. |
| **Runtime adapter** | An explicit implementation of operation invocation, capability discovery, caller-proof application, boundary serialization, and runtime lifecycle. |
| **Transport** | A mechanism used by an adapter, such as HTTP, an injected Sobek object, an in-memory fake, or a mailbox. Transport is not itself a surface. |
| **Surface** | The interaction/caller context: `web`, `cli`, `server`, `desktop`, `mobile`, or `test`. A surface does not imply one transport. |
| **Caller context** | Serializable context about the invoking surface, principal kind, app/scope, and audit intent. It carries no credential secret and grants no authority by itself. |
| **Auth provider** | Adapter-owned source of cookie mode, bearer proof, injected principal, or native secure-store proof. Secrets never enter public snapshots or diagnostics. |
| **Resource** | Framework-neutral holder of an immutable, referentially stable snapshot with explicit subscription, refresh, and disposal. |
| **Extension** | A versioned package module that owns one public namespace, declares dependencies/conflicts, and participates in deterministic lifecycle. |
| **Framework binding** | Optional translation from a resource to framework-native lifecycle/reactivity. It owns no transport or canonical state. |
| **Collaboration provider** | Optional implementation of a declared collaboration model/codec. A CRDT engine is one possible provider, not the default core. |

## Core instance and public factory

The universal API uses one explicit instance factory. There is no ambient
singleton, default mutable client, or platform sniffing in core.

```ts
// Illustrative only — candidate type fixture for Issue #003.
type SurfaceKind =
  | "web"
  | "cli"
  | "server"
  | "desktop"
  | "mobile"
  | "test"

interface HolmOptions<Extensions extends readonly HolmExtension[]> {
  readonly runtime: RuntimeAdapter
  readonly caller: CallerProvider
  readonly extensions?: Extensions
  readonly diagnostics?: DiagnosticsSink
}

interface Holm {
  readonly lifecycle: LifecycleSnapshot
  readonly capabilities: CapabilityRegistry
  readonly resources: ResourceFactory

  start(): Promise<void>
  dispose(): Promise<void>
}

declare function createHolm<const E extends readonly HolmExtension[]>(
  options: HolmOptions<E>,
): Holm & ExtensionNamespaces<E>
```

Example composition:

```ts
// Illustrative only.
const holm = createHolm({
  runtime: webRuntime({
    transport: fetchTransport(),
    auth: browserSessionAuth(),
  }),
  caller: browserSessionCaller({ app: "app_123" }),
  extensions: [httpExtension(), appExtension()],
})

await holm.start()
```

Rules:

1. Raw `createHolm` requires explicit `runtime` and `caller` values. Surface
   convenience factories may choose a documented default (for example a browser
   session), but they construct the same explicit objects internally.
2. Two instances share no caller, cache, extension, listener, timer, or
   capability state unless the caller deliberately injects a shared service.
3. Runtime-specific globals occur only inside explicit subpath adapters.
4. Extensions are fixed at construction. Runtime mutation such as
   `holm.use(...)` is not supported after creation.
5. Installed namespaces are readonly. An installed method can report a missing
   runtime capability; no installed extension can silently replace another.

## Runtime adapter contract

The kernel invokes one adapter boundary rather than reaching for `fetch`,
`window`, `process`, `WebSocket`, filesystem APIs, or an injected `holm` global.
The core TypeScript configuration includes ECMAScript libraries only; DOM and
Node ambient types are adapter concerns.

```ts
// Illustrative only.
interface RuntimeAdapter {
  readonly id: string
  readonly surface: SurfaceKind
  readonly clock: Clock
  readonly scheduler: Scheduler

  start(context: RuntimeStartContext): Promise<readonly CapabilityOffer[]>
  invoke(
    request: OperationRequest,
    control: InvocationControl,
  ): Promise<OperationResponse>
  subscribeCapabilities?(
    listener: (offers: readonly CapabilityOffer[]) => void,
  ): () => void
  dispose(): Promise<void>
}

interface OperationRequest {
  readonly requestId: string
  readonly capability: CapabilityRequirement
  readonly operation: string
  readonly caller: InvocationContext
  readonly payload: WireValue
}

interface OperationResponse {
  readonly requestId: string
  readonly payload: WireValue
  readonly metadata?: JsonValue
}

interface InvocationControl {
  readonly cancellation?: CancellationSignal
  readonly timeoutMs?: number
}
```

The adapter's service set is private and typed. Extensions receive a narrow
installation context and invocation function, not an arbitrary mutable service
locator.

An adapter must:

- advertise only capabilities it can implement at that moment;
- validate/copy input before crossing its boundary and validate/copy output on
  return;
- apply auth proof without exposing it in `OperationRequest`;
- map native errors into the SDK error taxonomy;
- propagate cancellation when possible and ignore late results after local
  cancellation;
- make `start`/`dispose` idempotent under core lifecycle control;
- never authorize from a client-supplied principal claim alone.

### Runtime and surface matrix

| Adapter | Initial role | Caller/auth source | Boundary | Production status intended by foundation track |
| --- | --- | --- | --- | --- |
| Web | BFBB/browser apps and browser admin tools | same-origin member cookie or explicit token via web auth provider | Fetch/HTTP; optional WebSocket extension | Planned and conformance-required |
| Node/CLI | scripts, CLI, operators, remote clients | explicit token/operator provider; environment/secure store injected by adapter | HTTP initially; local process only when separately implemented | Planned and conformance-required |
| Server/Sobek | server-side app authoring/testing | Holm-injected app/member/agent context | injected runtime calls, never mandatory HTTP self-call | Contract and fake planned; availability follows injected Holm APIs |
| Test | deterministic unit/conformance tests | explicit synthetic caller | in-memory copied messages | Planned and required |
| Desktop | future native shell | local operator or selected member resolved by bridge | serialized mailbox | Reserved interface/mock only; no production offer |
| Mobile | future thin native client | member/native secure-store provider | serialized native bridge/remote transport | Reserved interface/mock only; no offline DB contract |

A surface is explicit metadata. Remote CLI execution cannot infer permission to
open a GUI on another node. Desktop/mobile constructors must not advertise
runtime capabilities until Holm ships and probes those runtimes.

## Capability identity and negotiation

### IDs and ownership

Capability IDs are opaque namespaced strings:

- Holm runtime contracts use the reserved `holm.*` namespace;
- first-party client-local behavior uses `sdk.*`;
- third-party extensions use a reverse-domain namespace they control;
- IDs are compared case-sensitively and are never inferred from method names.

Examples, not a final Holm protocol registry:

```text
holm.http.app
holm.http.admin
holm.actions.registry
holm.realtime.public.subscribe
holm.realtime.server.broadcast
holm.realtime.private
holm.realtime.presence
holm.app.scope
holm.collaboration.oplog
sdk.resources.query
com.example.telemetry
```

Features with materially different security or delivery semantics receive
separate IDs. In particular, public realtime subscription never implies private
channels, presence, whispers, binary guarantees, or durable replay.

### Version rule

```ts
// Illustrative only.
interface CapabilityVersion {
  readonly major: number
  readonly minor: number
}

interface CapabilityOffer {
  readonly id: string
  readonly version: CapabilityVersion
  readonly origin: "runtime" | "extension"
}

interface CapabilityRequirement {
  readonly id: string
  readonly major: number
  readonly minMinor?: number
}
```

- A major version changes compatibility.
- A minor version is additive within its major.
- A requirement matches only the same major and an offered minor greater than
  or equal to `minMinor` (default `0`).
- If several offers match, the highest minor wins.
- Unknown IDs, a missing offer, and a major/minor mismatch fail before
  invocation with distinct typed errors.
- Platform version strings do not imply capability support.

`holm.capabilities` exposes an immutable snapshot and subscription. A runtime
may refresh offers after reconnect or a future server handshake. Removal takes
effect before the next invocation and emits a diagnostic/resource invalidation
signal where relevant.

Holm does not yet expose the universal capability manifest described here. Until
it does, production adapters use conservative, conformance-generated manifests
pinned to named Holm commits and probes. They may advertise proven existing
routes, but must not infer action, private realtime, presence, scope, oplog,
desktop, or mobile support from a Holm version number.

Unsupported behavior is never an absent method on an installed namespace and
never a silent fallback. It is an `UnsupportedCapabilityError` or
`CapabilityVersionError` containing the capability, requirement, offered
versions, adapter, and surface.

## Caller context and auth proof

Caller context is resolved for **every invocation**, not captured forever when
the client is created. It is safe to serialize but is not itself authority.

```ts
// Illustrative only.
type PrincipalRef =
  | { readonly kind: "anonymous" }
  | { readonly kind: "browser-session" }
  | { readonly kind: "member"; readonly id: string }
  | { readonly kind: "operator"; readonly id?: string }
  | { readonly kind: "agent"; readonly memberId: string }
  | { readonly kind: "service"; readonly id: string }

interface CallerContext {
  readonly surface: SurfaceKind
  readonly principal: PrincipalRef
  readonly app?: { readonly id: string }
  readonly scope?: { readonly id: string; readonly type?: string }
  readonly origin?: string
}

interface InvocationContext extends CallerContext {
  readonly invocationId: string
  readonly startedAt: number
  readonly reason?: string
}

interface CallerProvider {
  current(): CallerContext | Promise<CallerContext>
  fingerprint(context: CallerContext): string
  subscribe?(listener: () => void): () => void
}
```

Principal IDs and future Holm protocol addresses are opaque strings. The SDK
must not parse identity from DNS, assume apps are actors, or assume all members
are human. This leaves room for the keypair/member model in Holm Issue `#085`
without claiming it is implemented.

Auth proof remains adapter-private:

| Surface | Context | Proof application |
| --- | --- | --- |
| Web | browser session, resolved member, or explicit anonymous context | same-origin cookie mode or explicit token; no JavaScript-readable cookie is invented |
| CLI/Node | operator, member token, agent, or service | explicit token/credential provider; never universal cookie inference |
| Server/Sobek | injected app/member/agent invocation | Holm runtime supplies authoritative context; client claims do not override it |
| Desktop | local operator or explicitly selected member | future native bridge resolves proof; reserved today |
| Mobile | remote member/agent context | future native secure-store/bridge; reserved today |
| Test | explicit synthetic principal | deterministic fake proof and assertions |

The server re-resolves and authorizes the caller. Roles and scope claims from a
remote client are hints only unless the Holm protocol explicitly authenticates
them.

All cache/resource keys include runtime source identity and caller fingerprint.
A fingerprint must be deterministic and non-secret; it may hash stable identity
fields but must never contain a cookie, token, or other credential. A
caller-provider change cancels or partitions in-flight work, removes prior
principal data from new snapshots, and forces affected resources through a new
load. This is mandatory for login/logout, selected-member changes, app changes,
and future scope changes.

## Wire values and serialization

### Accepted value model

Adapter and mailbox boundaries accept only validated `WireValue` data:

```ts
// Illustrative only.
type JsonPrimitive = null | boolean | number | string
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }

type WireValue =
  | JsonPrimitive
  | ReadonlyBytes
  | readonly WireValue[]
  | { readonly [key: string]: WireValue }

interface ReadonlyBytes {
  readonly kind: "holm.bytes"
  readonly byteLength: number
  copy(): Uint8Array
}
```

Rules:

1. Records are plain, acyclic, string-keyed objects. Arrays preserve order.
2. Numbers must be finite. `undefined`, `bigint`, symbols, functions, class
   instances, `Date`, `Map`, `Set`, errors, promises, and cyclic/shared object
   graphs are rejected unless explicitly converted to supported data.
3. Dates use an application/schema-defined ISO string; large integers use an
   application/schema-defined decimal string.
4. Bytes enter through an SDK helper that copies the source `Uint8Array`.
   `copy()` always returns caller-owned memory.
5. `$holm` is reserved in plain records. The canonical JSON transport encoding
   for bytes is `{"$holm":"bytes","base64":"AA=="}`; adapters may
   use a native binary frame only when their protocol defines equivalent
   semantics.
6. Canonical encoding sorts object keys, preserves array order, and is stable for
   capability/registry hashing and fixtures.
7. Values are validated and copied on both sides of every adapter boundary.
   Native structured clone may optimize an implementation, but no shared
   mutable reference is observable. Transferable memory requires explicit
   ownership handoff and cannot back a resource snapshot.

The action/schema registry is stricter: it is plain JSON and contains no binary
value.

### Native mailbox

A desktop, future TUI, or mobile bridge exchanges copied envelopes similar to:

```ts
// Illustrative only.
interface MailboxMessage {
  readonly protocol: "holm.sdk.mailbox/1"
  readonly kind: "request" | "response" | "event" | "cancel"
  readonly requestId: string
  readonly capability?: CapabilityRequirement
  readonly operation?: string
  readonly caller?: InvocationContext
  readonly payload?: WireValue
  readonly error?: SerializedHolmError
}
```

Mailbox invariants:

- request IDs correlate exactly one logical response; duplicate/late responses
  are ignored and diagnosed;
- cancellation is an explicit best-effort message, not mutation of a shared
  request object;
- no global event ordering or durable replay is implied; a capability must state
  ordering/sequence guarantees;
- handlers cannot carry closures, DOM/native handles, SQLite handles, or mutable
  resource objects across the boundary;
- UI trees/diffs, if a future shell uses them, layer above the shared
  action/state contract and never become a universal UI language.

## Action, state, and schema registry

The lower registry is independently serializable, validatable, discoverable,
and testable. An app may author it as JSON or ordinary JavaScript data without
installing `@holmhq/sdk`.

The converged Holm action descriptor is JSON Schema draft 2020-12 based:

```ts
// Illustrative only; wire names mirror the Holm proposal.
interface ActionDescriptor {
  readonly name: string
  readonly description?: string
  readonly input_schema: JsonValue
  readonly output_schema: JsonValue
  readonly mode: "sync" | "job"
  readonly capability?: string
}

interface ActionRegistryDocument {
  readonly schema_version: 1
  readonly actions: readonly ActionDescriptor[]
}

type ActionResult<Output extends JsonValue> =
  | { readonly mode: "sync"; readonly output: Output }
  | {
      readonly mode: "job"
      readonly job: {
        readonly id: string
        readonly status: "queued" | "running" | "succeeded" | "failed"
      }
    }
```

The exact job fields remain Holm-owned and must be refreshed when Holm implements
Issue 486 Child 4. The stable architecture rule is the discriminated `sync` or
durable `job` behavior, not the illustrative field list above.

An optional `defineActions(...)` helper may infer TypeScript input/output and
return two separate products:

1. serializable registry data; and
2. a local handler map for an appropriate authoring/runtime adapter.

The serialized product contains no SDK brand or function. Duplicate names,
invalid schemas, unsupported values, and result-mode mismatches fail before
registration. A client action namespace lists/invokes only when
`holm.actions.registry` is offered. Until Holm ships action discovery/execution,
production adapters report unsupported while test/in-memory adapters can run
conformance fixtures.

The broader shared lower contract also allows Holm-owned state/query schema
documents. This SDK does not freeze a state/query wire shape before Holm defines
it; resources may consume ordinary HTTP/injected operations meanwhile. SDK
helpers never make `holm-state`, a framework runtime, or this package a
prerequisite for registry validation.

## Framework-neutral resources

### Snapshot contract

```ts
// Illustrative only.
type ResourcePhase = "idle" | "loading" | "ready" | "error" | "disposed"

interface ResourceSnapshot<T, E = HolmError> {
  readonly revision: number
  readonly phase: ResourcePhase
  readonly data?: ReadonlyDeep<T>
  readonly error?: E
  readonly stale: boolean
  readonly refreshing: boolean
  readonly updatedAt?: number
}

interface Resource<T, E = HolmError> {
  getSnapshot(): ResourceSnapshot<T, E>
  subscribe(listener: () => void): () => void
  refresh(options?: OperationControl): Promise<ResourceSnapshot<T, E>>
  dispose(): void
}
```

Semantics:

- `getSnapshot()` returns the same object reference until an actual transition.
- Every transition atomically installs a new readonly snapshot and increments
  `revision` monotonically.
- `subscribe()` does not invoke immediately; consumers read before/after
  subscribing as their framework requires. Notification is synchronous after
  replacement. One listener failure cannot prevent other listeners and is sent
  to diagnostics.
- Unsubscribe and `dispose()` are idempotent. Disposal atomically installs a
  terminal `disposed` snapshot, notifies current listeners once, clears them,
  and releases shared work. Refresh after disposal throws `LifecycleError`.
- Initial work is `idle → loading → ready|error`.
- Refresh with prior data retains that data, sets `refreshing`, and marks stale
  according to policy. A refresh failure can retain data while moving to
  `error`; it never replaces known data with an accidental `undefined`.
- Public data is deeply readonly in types and isolated by validated cloning.
  A consumer cannot mutate canonical cache/resource state. Binary values expose
  copies only.
- Query keys are canonical JSON tuples. Shared cache/in-flight identity includes
  adapter source, capability, caller fingerprint, and key.
- Multiple resources may share one fetch/cache entry while retaining explicit
  subscription/disposal ownership. Shared work is canceled only when no
  consumer remains or a caller change invalidates it.
- Derived resources depend on snapshots/subscriptions, not a framework runtime.
- Mutations are explicit operations. Optimistic values are copied, revisioned,
  rolled back on failure, and followed by declared tag/key invalidation.
- Realtime events may invalidate or reconcile a query, but authoritative server
  load remains the source of truth unless the resource is explicitly typed as
  ephemeral.

### Transport cache versus resource state

The transport cache owns decoded response reuse (TTL, SWR, in-flight dedup,
bounded LRU, and explicit tags/prefix invalidation). A resource owns observable
loading/data/error lifecycle. A resource loader may use the transport cache, but
neither layer mutates the other's public values and both partition by caller.
Background SWR failures are observable diagnostics/events and never become
unhandled promise rejections.

### Existing `holm-state` disposition

| Existing primitive | Architecture disposition |
| --- | --- |
| `remote()` | Redesign as typed query/mutation resources; reject string-path magic, global config, admin-client coupling, and implicit write-back as universal contracts. |
| `channel()` | Move to the realtime extension as explicitly ephemeral state; do not present broadcast as authoritative persistence. |
| `guard()` | Rebuild from an auth resource plus optional web/framework navigation; redirects do not belong in core. |
| `route()` | Web/navigation adapter or app utility, not universal server state. |
| `track()` / `debug` | Optional diagnostics/history extension, excluded or disabled in production artifacts by policy. |
| `ref` / `computed` / `watch` / `effect` | Do not reproduce a framework-like signal library in core. Use resources/derived resources and framework-native bindings. |

The useful behavior remains migration evidence, but the current
`@vue/reactivity` dependency does not cross into universal core.

## Extensions and namespace ownership

```ts
// Illustrative only.
interface ExtensionRequirement {
  readonly id: string
  readonly major: number
  readonly minMinor?: number
}

interface HolmExtension<Api = unknown> {
  readonly id: string
  readonly version: CapabilityVersion
  readonly namespace: string
  readonly requiresExtensions?: readonly ExtensionRequirement[]
  readonly requiresCapabilities?: readonly CapabilityRequirement[]
  readonly conflicts?: readonly string[]

  setup(context: ExtensionSetupContext): {
    readonly api: Api
    start?(): Promise<void>
    dispose?(): Promise<void>
  }
}
```

Rules:

1. Extension IDs and namespaces are unique. Core namespaces (`lifecycle`,
   `capabilities`, `resources`, and `extensions`) are reserved.
2. One extension owns one top-level public namespace. Sub-providers register
   under that owner's registry using their own IDs; they do not overwrite the
   root.
3. Extension dependencies name extension IDs and compatible versions; runtime
   requirements separately name capabilities. Install order is a stable
   topological sort of extension dependencies; ID order breaks independent
   ties.
4. Missing/incompatible dependencies, cycles, duplicate IDs, duplicate
   namespaces, and a conflict declared by either side fail construction.
5. `setup` registers a frozen API without external effects. `start` runs after
   runtime capability discovery in dependency order. On failure, already
   started extensions dispose in reverse order.
6. Normal disposal is reverse dependency order, then runtime disposal. Cleanup
   errors are aggregated without preventing remaining cleanup.
7. Extensions cannot mutate the adapter offer set. They may offer `sdk.*` local
   capabilities and require `holm.*` runtime capabilities.
8. Installed methods remain present and typed; invoking a method whose runtime
   requirement is absent throws a typed capability error.
9. Framework bindings are consumers/adapters around resources, not extensions
   that own transport or server namespaces.

This permits a complete convenience composition while preserving narrow imports
and deterministic tests.

## Lifecycle, clocks, and cancellation

### Lifecycle

```text
created ──start/first operation──▶ starting ──success──▶ ready
                                      │
                                   failure
                                      ▼
                                    failed

created | starting | ready | failed ──dispose──▶ disposing ──▶ disposed
```

More precisely:

- `createHolm` performs only synchronous validation/composition and returns
  `created`.
- `start()` is explicit and idempotent. The first operation may call the same
  shared start path for convenience; no duplicate startup occurs.
- Startup order is runtime, capability snapshot, then extensions in dependency
  order.
- Startup failure is terminal for that instance. Started components roll back
  in reverse order; callers create a new instance to retry.
- `dispose()` is idempotent, cancels owned in-flight work, rejects new work,
  disposes extensions in reverse order, then disposes the runtime.
- Calls during disposal or after disposal fail with `LifecycleError`.
- No singleton, module cache, or framework binding owns the instance implicitly.

### Clock and scheduler

Core does not call ambient timers. A runtime supplies:

```ts
// Illustrative only.
interface Clock {
  now(): number
}

interface Scheduler {
  schedule(delayMs: number, task: () => void): { cancel(): void }
}
```

TTL, SWR, debounce, timeout, backoff, and retry policies use these services.
Tests use a fake clock/scheduler and never sleep in wall time.

### Cancellation

```ts
// Illustrative only.
interface CancellationSignal {
  readonly cancelled: boolean
  readonly reason?: string
  onCancel(listener: () => void): () => void
}
```

- Every asynchronous operation accepts an SDK cancellation signal and optional
  timeout. Web/Node subpaths provide structural bridges from native
  `AbortSignal` without adding DOM/Node types to core.
- Pre-cancelled work fails before adapter invocation.
- HTTP adapters abort requests; mailbox adapters send `cancel`; injected
  runtimes use their supported cancellation seam. Cancellation remains
  best-effort remotely, and late results are ignored locally.
- A timeout uses the injected scheduler and produces `TimeoutError`, distinct
  from caller cancellation.
- Canceling a wait for a durable `job` does not cancel the job. Job cancellation
  requires a separately negotiated Holm capability.

## Error contract and diagnostics

All expected failures normalize to `HolmError` with stable machine fields:

```ts
// Illustrative only.
interface SerializedHolmError {
  readonly name: "HolmError"
  readonly kind:
    | "capability"
    | "transport"
    | "remote"
    | "protocol"
    | "serialization"
    | "cancellation"
    | "timeout"
    | "lifecycle"
    | "extension"
    | "internal"
  readonly code: string
  readonly message: string
  readonly retryable: boolean
  readonly details?: JsonValue
  readonly status?: number
}
```

Required typed classes/codes include:

| Failure | Type |
| --- | --- |
| capability absent | `UnsupportedCapabilityError` |
| capability version incompatible | `CapabilityVersionError` |
| network/adapter failure | `TransportError` |
| non-success Holm response | `RemoteError` retaining status and Holm code |
| malformed response/envelope | `ProtocolError` |
| rejected wire value | `SerializationError` |
| caller canceled | `CancelledError` |
| deadline exceeded | `TimeoutError` |
| invalid/disposed lifecycle | `LifecycleError` |
| dependency/namespace/start failure | `ExtensionError` |

A local `cause` and stack may exist but are not serialized by default. Unknown
thrown values are wrapped; strings are not leaked as arbitrary errors.
Serialized errors omit stacks, auth proof, cookies, tokens, request bodies, and
secret headers. Diagnostics receive redacted metadata and cannot alter request
results. Diagnostics-handler failures are isolated and must not create
unhandled rejections. Cancellation is an expected control event, not a generic
error callback by default.

## Realtime, authoritative state, and collaboration

These contracts remain distinct:

| Layer | Source of truth | Delivery/storage semantics | SDK shape |
| --- | --- | --- | --- |
| Query/resource | Holm server state | fetch/reconcile, cache policy, explicit mutations | immutable resource snapshot |
| Realtime channel | ephemeral hub event | reconnect/resubscribe policy; duplicates/gaps possible; no implied replay | connection/channel extension and ephemeral snapshot |
| Collaboration document | durable op log/snapshot | idempotent ops, revisions/cursors, compaction, reconcile | collaboration provider/resource plus optional codec |

At the pinned Holm baseline, WebSocket clients can subscribe/unsubscribe and
receive server broadcasts. The runtime can broadcast, count, list, and kick.
There is no verified private-channel authorization, presence, sender exclusion,
whispers, client publish operation, per-app realtime policy, or binary wire
guarantee. The SDK therefore gates these as separate future capabilities and
never falls back from private/presence to public channels.

App scope/group privacy is also a future Holm capability. A `scope` field can be
carried in caller/document context, but the SDK cannot enforce group-private
storage or subscriptions client-side. It advertises scoped behavior only after
Holm provides server-enforced scope semantics.

Collaboration resources must declare one model:

```text
lww · lease · oplog · crdt · ephemeral
```

The oplog seam carries client operation IDs, revision/base revision, snapshot,
cursor, compaction metadata, and reconcile results. CRDT payloads may be opaque
bytes, but server auth/scope/idempotency/rate limits still apply. Yjs,
Automerge, Loro, and similar engines are optional providers/peer packages with
license, BFBB, runtime, and size evidence. No engine enters core or the complete
bundle by default.

Presence/cursors never become durable document operations, and a realtime event
that says “changed” should normally trigger reconcile rather than become the
only copy of state.

## Framework bindings

The resource contract is the only shared reactive contract:

- vanilla code calls `getSnapshot()` and `subscribe()` directly;
- React uses `useSyncExternalStore`;
- Svelte uses a tiny `toSvelteStore(resource)` adapter to provide its required
  immediate value callback;
- Vue maps snapshots to a composable/ref without requiring Vue in core;
- Angular maps snapshots to a Signal/Observable and DI-managed lifecycle.

Bindings are optional subpaths with optional peer dependencies. They must be
safe to import during an SSR/build step without touching browser globals, but
that does not promise arbitrary Next/Nuxt/SvelteKit/Angular server runtimes on
Holm. The supported foundation target is static output/SPA plus compatible
bundled handlers proven separately. Bindings render no UI components and invent
no framework-specific data semantics.

## Package and subpath contract

The package remains one npm identity, `@holmhq/sdk`, but publishing is deferred.
The export architecture is:

| Export | Responsibility | Ambient types/runtime dependencies |
| --- | --- | --- |
| `@holmhq/sdk` | `createHolm`, capabilities, errors, lifecycle, serialization, resource and extension contracts | ECMAScript only; zero runtime dependencies target |
| `@holmhq/sdk/web` | web runtime, Fetch/browser-session/navigation/bootstrap bridges, web convenience factory | DOM/web only here |
| `@holmhq/sdk/node` | Node/CLI HTTP/token/environment adapters and convenience factory | Node only here |
| `@holmhq/sdk/sobek` | injected Holm runtime adapter/authoring contract | no HTTP self-call requirement |
| `@holmhq/sdk/test` | in-memory adapter, fake clock/scheduler, protocol fixtures | test-only import |
| `@holmhq/sdk/bridge` | platform-neutral mailbox/native bridge interfaces | no production desktop/mobile constructor |
| `@holmhq/sdk/app` | member/app auth, app routes, links, uploads, surface helpers | shared contracts; runtime services injected |
| `@holmhq/sdk/admin` | privileged operator namespaces | explicit operator capability/auth required |
| `@holmhq/sdk/state` | query/mutation/derived resource implementation and resource contracts | framework-neutral |
| `@holmhq/sdk/actions` | registry JSON types/builders and list/invoke extension | production invocation capability-gated |
| `@holmhq/sdk/realtime` | channel/connection extension | WebSocket/runtime transport injected |
| `@holmhq/sdk/collaboration` | model/oplog/codec/provider seams | no CRDT engine bundled |
| `@holmhq/sdk/react` | React binding | optional React peer |
| `@holmhq/sdk/angular` | Angular binding | optional Angular peer |
| `@holmhq/sdk/svelte` | Svelte binding if needed | optional Svelte peer |
| `@holmhq/sdk/vue` | Vue binding | optional Vue peer |

The canonical framework-neutral state entry point is `@holmhq/sdk/state`. It
exports the query, mutation, derived-resource, `Resource`, and
`ResourceSnapshot` contracts defined above. The name aligns with Holm's
action/state/schema vocabulary; it does **not** preserve the legacy
`holm-state` API (`ref`, `computed`, `watch`, `effect`, `remote`, `channel`, and
related helpers). There is no initial `@holmhq/sdk/resources` alias: one concept
has one public subpath. Runtime adapters are imported explicitly; package
conditions and runtime sniffing do not silently choose one.

The root declaration graph cannot reference DOM or Node ambient types. Web and
Node declarations are compiled/type-tested separately. Framework runtimes and
CRDT engines are optional peers or separate provider packages and are absent
from root dependency/bundle graphs.

## Bundle and distribution contract

The initial tracked ESM artifact plan is:

| Artifact | Intended composition |
| --- | --- |
| `dist/holm.js` | complete browser/BFBB convenience build of approved first-party, framework-neutral capabilities, including web adapter and app/admin namespaces; no framework or CRDT runtime |
| `dist/holm-web.js` | app-focused browser build excluding admin and non-web adapters |
| `dist/holm-node.js` | Node/CLI composition excluding browser implementation/globals |

“Complete” describes the reviewed browser/BFBB composition, not a bundle that
sniffs and embeds every runtime. Sobek and native bridge contracts use package
subpaths until a separately justified artifact exists.

Every artifact must have:

- deterministic ESM, declarations where applicable, and source maps;
- a generated manifest recording package version, source commit, included
  subpaths/capabilities, SHA-256, raw/minified/gzip size, and license notice;
- source, type, declaration-consumer, and generated-bundle smoke tests;
- a clean rebuild/reproducibility check before tracked `dist/` changes land;
- explicit size budgets established from the first reviewed implementation, not
  guessed in this architecture issue.

For context only, the pinned Holm checkout's local untracked
`packages/holm-sdk/dist/holm-sdk.js` identifies itself as `v0.75.0` and measures
`86,064` raw bytes / `18,461` gzip bytes. It is a migration measurement, not a
new SDK budget or reproducibility claim.

The package stays MIT and `"private": true`. No npm publication, token, tag, or
release is part of the foundation architecture. Initial distribution uses an
immutable Git commit SHA or reviewed immutable tag through GitHub/jsDelivr.
Deployed BFBB apps vendor and optionally hash-check the file locally; they do
not rely on a public CDN at runtime and never use `@main`.

## Migration and compatibility policy

Breaking redesign is allowed, but behavior is not claimed migrated until a
conformance fixture names a Holm source path and commit.

### Existing `holm-sdk`

| Current behavior | Disposition |
| --- | --- |
| `createClient()` / `createAppClient()` | Redesign as explicit `createHolm` composition plus web/Node convenience factories. Preserve adopted behavior through route conformance, not shape alone. |
| `getClient()` default singleton | Reject; it violates instance/caller isolation. |
| HTTP methods, response unwrapping, hooks, uploads | Adopt useful behavior behind typed transport/runtime contracts after TDD and source/dist conformance. |
| TTL/SWR/dedup/LRU cache | Adopt semantics, adding caller partitioning, immutable values, per-request policy, explicit invalidation tags, and observable background errors. |
| `ApiError` | Redesign into the cross-adapter taxonomy while retaining adopted Holm status/code/details. |
| App auth, links, upload, pagination, surface URLs | Classify route-by-route in Issue `#007`; navigation/global bootstrap moves behind web services. |
| Broad admin namespace | Classify route-by-route in Issue `#008`; it cannot dictate core or imply authorization. |
| `runtime.js` environment/global probing | Reject in core; isolate compatible bootstrap/env behavior in explicit adapters. |
| single-file build | Replace with reproducible tracked artifacts/manifests after source/declaration/bundle checks. |

### Existing `holm-state`

The primitive disposition is recorded in the resource section above. Existing
tests are behavioral evidence, not a requirement to preserve Vue-backed refs,
global debug state, browser assumptions, or implicit writes.

### Migration gates

- Existing Holm packages remain live and untouched.
- Each adopted namespace gets a machine-readable adopted/redesigned/deferred/
  excluded ledger at its migration issue.
- Source and generated artifacts both pass tests.
- Holm behavior references a named commit and protocol fixture.
- No alias/deprecation/deletion occurs merely because a replacement exists.

## Baseline capability truth

| Area | Holm at `11ceae0` | New SDK at this architecture checkpoint |
| --- | --- | --- |
| App/admin HTTP | Existing zero-dependency JS client and audited wrappers are migration sources | Not implemented; planned behind web/Node transport conformance |
| Browser member auth | Existing cookie and explicit-token app flows | Not implemented; explicit web auth/caller adapters proposed |
| Reactive state | Vue-reactivity-backed experiment exists | Not implemented; framework-neutral resource redesign proposed |
| Realtime | public subscribe/unsubscribe plus server broadcasts; no verified client publish/private/presence/binary guarantee | Not implemented; public behavior to migrate, future behavior separately gated |
| CLI action registry | converged design in Proposal 001/Issue 486, no production commands/runtime found | helper/types/fakes planned; production action capability must remain unsupported |
| App scopes | Issue `#341` open | context seam only; no support claim |
| Oplog/CRDT substrate | Issue `#342` open | provider/codec seam only; no support claim |
| Desktop | proposal/probe target | reserved mailbox types/mock only |
| Mobile | opaque reserved thin-client slot | reserved bridge types/mock only; no local DB sync |
| Holm protocol mesh/keypairs | Issue `#085` open | opaque identity and adapter seams only |

## Reconciliation with Holm design sources

| Source | Architecture reconciliation |
| --- | --- |
| Proposal 001 / Issue 486 | Web stays BFBB/root; CLI actions are structured JSON; callers vary by surface; native loops use mailboxes; desktop/mobile are gated; there is no universal UI DSL or DB bypass. The SDK does not own presentation resolver or app-bundle topology. |
| Issue `#085` — Holm Protocol | HTTP is only one adapter; principal/node IDs are opaque; apps are namespaces rather than actors; no mesh/keypair capability is claimed before implementation. |
| Issue `#196` — `holm-state` / `holm-ui` | Preserve headless/server-state insights but replace Vue-backed public refs with immutable resources. Browser rendering remains optional and cannot become a cross-surface contract. |
| Issue `#341` — app scopes | Carry generic scope context and reserve capability IDs; do not hard-code “workspace” or simulate server authorization/storage isolation. |
| Issue `#342` — collaboration | Keep model declaration, durable oplog/snapshot/reconcile, ephemeral presence, and optional CRDT codecs separate. No mandatory engine. |
| Issue `#485` — framework compatibility | Support static framework output and explicit adapters; do not promise arbitrary Node/SSR/native-addon execution on Holm. |
| Issue `#517` — realtime gaps | Advertise only current public behavior; private channels, presence, sender exclusion, whispers, policy, and binary guarantees are independent future offers. |

## Umbrella invariant traceability

| `#001` invariant | Architecture enforcement |
| ---: | --- |
| 1. Core has no DOM/Node ambient libraries | Core factory, runtime adapter, and package subpath sections |
| 2. Platform behavior uses explicit adapters | Runtime adapter contract and matrix |
| 3. Resource state is immutable/subscription-based | Framework-neutral resources |
| 4. Capability negotiation is explicit | Capability identity/negotiation and baseline matrix |
| 5. Caller/auth is surface-specific | Caller context/auth proof and caller-partitioned resources |
| 6. No authorization/SQLite bypass | Authority boundary and native mailbox restrictions |
| 7. Framework/CRDT runtimes are optional | Framework, collaboration, and package sections |
| 8. Source and generated JS are tested | Bundle/distribution and migration gates |
| 9. Migrated behavior cites source/commit/evidence | Migration policy and pinned evidence |
| 10. No publication/deploy/Holm mutation without approval | Distribution contract and ownership boundary |
| 11. `dist/` is reproducible, hashed, size-reported | Bundle manifest/rebuild contract |
| 12. BFBB works from vendored files | `holm-web.js`/`holm.js` and immutable vendoring rule |
| 13. Dependencies are license-compatible | MIT contract and optional-peer evidence gate |
| 14. Existing Holm packages are not deleted | Migration gates |

## Security and operational invariants

1. Authorization is always enforced by Holm; SDK guards improve UX only.
2. Credentials never enter caller context, resource snapshots, wire diagnostics,
   cache keys in raw form, or serialized errors.
3. Admin methods in a bundle grant no authority. The runtime still requires an
   operator capability and proof.
4. Inputs and outputs cross adapters by validation and copy; prototype-bearing
   or cyclic data is rejected.
5. No SDK surface accepts a SQLite handle or exposes direct database access.
6. Remote actions are explicit and cannot open native UI implicitly.
7. Reconnect, retry, cache, and background work are bounded and disposable.
8. Future capabilities fail closed rather than degrade to a less secure class.

## Decisions delegated to later slices

The architecture intentionally does not select:

- a compiler, bundler, test runner, or CI implementation (Issue `#003`);
- endpoint payload types or complete app/admin route parity (`#005`, `#007`,
  `#008`);
- exact resource cache defaults and first size budgets (`#005`, `#006`, `#014`);
- production action endpoints/job fields until Holm implements them (`#010`);
- realtime wire additions before Holm Issue `#517` (`#011`);
- a CRDT engine (`#012`);
- Angular's final Signal-versus-Observable convenience surface (`#013`);
- a production desktop/mobile runtime or mobile replication design (`#009` and
  separate Holm probes).

These are non-blocking implementation details because the owning boundary,
capability gate, and review issue are explicit.

## Review gate

No implementation-blocking architecture question remains inside A1. Owner
approval is required for the load-bearing recommendations in
[`DECISIONS.md`](DECISIONS.md), especially:

- explicit `createHolm({ runtime, caller, extensions })` composition;
- namespaced major/minor capabilities and fail-closed negotiation;
- sealed extension namespaces and lifecycle;
- copied/validated `WireValue` and mailbox boundaries;
- immutable resource semantics and caller partitioning;
- the package subpath and three-artifact split.

Issue `#003` must not begin until that review approves or revises this contract.

## Pinned evidence

### Universal runtime and design issues

- [Proposal 001 — Universal App Runtime](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/koder/proposals/001_universal_app_runtime/INDEX.md)
- [Issue 486 — extraction map](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/koder/issues/486_universal_app_runtime_extraction_map/INDEX.md)
- [Issue 085 — Holm Protocol](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/koder/issues/085_holm_protocol/INDEX.md)
- [Issue 196 — `holm-state` / `holm-ui`](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/koder/issues/196_holm_ui_framework/INDEX.md)
- [Issue 341 — app scopes](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/koder/issues/341_app_member_scope_semantics/INDEX.md)
- [Issue 342 — collaboration/CRDT](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/koder/issues/342_collaboration_crdt_strategy/INDEX.md)
- [Issue 485 — framework compatibility](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/koder/issues/485_node_lite_framework_compatibility_probe/INDEX.md)
- [Issue 517 — realtime gaps](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/koder/issues/517_realtime_channel_auth_presence/INDEX.md)

### Existing implementation evidence

- [`packages/holm-sdk/index.js`](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/packages/holm-sdk/index.js)
- [`client.js`](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/packages/holm-sdk/client.js), [`cache.js`](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/packages/holm-sdk/cache.js), [`app.js`](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/packages/holm-sdk/app.js), and [`runtime.js`](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/packages/holm-sdk/runtime.js)
- [`errors.js`](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/packages/holm-sdk/errors.js) and [`build.sh`](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/packages/holm-sdk/build.sh)
- [`packages/holm-state/src/`](https://github.com/holmhq/holm/tree/11ceae0d88e9c800eb77916e3244fbd231ad81bb/packages/holm-state/src)
- [`internal/hosting/ws.go`](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/internal/hosting/ws.go) and [`realtime.go`](https://github.com/holmhq/holm/blob/11ceae0d88e9c800eb77916e3244fbd231ad81bb/internal/hosting/realtime.go)
