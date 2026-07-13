# Holm SDK

**One TypeScript SDK for every Holm surface.**

Holm apps share backend actions, state, identity, storage, realtime, and
capability contracts while presenting native-feeling interfaces on the web, in
the CLI, and eventually on desktop and mobile. `@holmhq/sdk` is the portable
JavaScript layer that connects those surfaces to Holm.

> [!IMPORTANT]
> This repository is in architecture/bootstrap stage. The package is not yet
> published to npm and no production API is promised. The existing SDK under
> the Holm repository remains the working implementation during migration.

## Direction

The SDK is designed around three independent axes:

```text
Capabilities          Runtime / surface adapters       Framework bindings
────────────          ──────────────────────────       ──────────────────
auth                  web / HTTP                       vanilla
operations            CLI / Node                       React
queries + mutations   server / Sobek                   Angular
reactive state        desktop / native mailbox         Svelte
realtime              mobile / native bridge           Vue
collaboration         tests / mocks
files + uploads
```

The core stays framework-neutral and runtime-neutral. A runtime adapter decides
how operations cross a boundary; a framework binding adapts immutable resource
snapshots and subscriptions to the host framework.

```ts
const holm = createHolm({ runtime: webRuntime() })

const usage = holm.query({
  key: ['usage', range],
  load: () => holm.http.get('/api/usage', { params: { range } }),
  ttl: 30_000,
})

usage.getSnapshot()
usage.subscribe(render)
```

The API above is illustrative, not yet a frozen contract.

## Surfaces

Holm's universal app-runtime design treats interfaces as **surfaces**:

- **Web** remains the implicit BFBB surface at root `index.html`.
- **CLI** is first-class through structured, JSON-schema-backed app actions.
- **Desktop** is a future native-shell target gated by runtime probes.
- **Mobile** is a reserved future thin-client/native-bridge surface.
- **Server/Sobek** uses Holm's injected runtime and shares the same lower
  action/state contracts.

Surfaces share models and operations, not one lowest-common-denominator UI DSL.
The SDK may bind data to many UI frameworks; it does not require one renderer.

## Planned package

- npm name: `@holmhq/sdk`
- source: strict TypeScript
- output: ESM JavaScript, declaration files, source maps, and BFBB bundles
- license: MIT
- initial npm state: private/unpublished

Expected entry points and artifacts will be validated before they are frozen:

```text
@holmhq/sdk
@holmhq/sdk/web
@holmhq/sdk/node
@holmhq/sdk/state
@holmhq/sdk/react
@holmhq/sdk/angular
@holmhq/sdk/svelte
@holmhq/sdk/vue

dist/holm.js
dist/holm-web.js
dist/holm-node.js
```

A complete convenience bundle is welcome. Narrow artifacts remain useful for
runtime isolation and low-end mobile startup budgets. Framework runtimes and
heavy CRDT engines remain peer/optional dependencies rather than being embedded
in every bundle.

## BFBB and jsDelivr distribution

Publishing to npm is deliberately deferred. GitHub is sufficient for the first
versioned artifacts, and jsDelivr can serve immutable commit- or tag-pinned
files directly:

```text
https://cdn.jsdelivr.net/gh/holmhq-admin/sdk@<commit-sha>/dist/holm.js
```

A raw BFBB app should normally **vendor** the pinned artifact instead of relying
on a public CDN at runtime:

```bash
mkdir -p vendor/holm
curl -fL \
  "https://cdn.jsdelivr.net/gh/holmhq-admin/sdk@<commit-sha>/dist/holm.js" \
  -o vendor/holm/holm.js
```

```js
import { createHolm } from './vendor/holm/holm.js'
```

Do not use `@main` for deployed apps. Use an immutable commit SHA or release tag
and record the SDK version/hash alongside the vendored file.

Later npm publication is straightforward: package metadata already targets
`@holmhq/sdk`. Publication remains blocked by `"private": true` until package
ownership and release readiness are explicitly approved.

## Compatibility principles

- The action/schema/state registry is owned by Holm and remains independently
  testable; the SDK consumes and helps author it.
- Caller identity is explicit and surface-dependent.
- Native UI loops and JS communicate through serializable messages/snapshots,
  not shared mutable objects.
- Realtime ephemeral state, authoritative query state, and durable
  collaboration logs are distinct contracts.
- Yjs, Automerge, Loro, and similar engines fit through optional collaboration
  codecs/providers; no CRDT engine is silently made mandatory.
- Desktop/mobile contracts can be designed now without pretending those
  runtimes already exist.
- The existing Holm SDK and `holm-state` are migration sources, not APIs that
  must be copied unchanged.

## Project state

Start with:

- [`koder/STATE.md`](koder/STATE.md) — current handoff
- [`koder/issues/001_universal_sdk_foundation/INDEX.md`](koder/issues/001_universal_sdk_foundation/INDEX.md) — umbrella track and slice ledger
- [`koder/docs/HOLM_SOURCE_MAP.md`](koder/docs/HOLM_SOURCE_MAP.md) — pinned source references in the Holm repository
- [`koder/docs/EXECUTION.md`](koder/docs/EXECUTION.md) — active autonomous work window and mandatory review stop
- [`koder/projects/INDEX.md`](koder/projects/INDEX.md) — cross-repository ownership and write-policy registry
- [`AGENTS.md`](AGENTS.md) — repository workflow and safety rules

Implementation is expected to proceed slice by slice with strict
red → green → refactor tests. Existing code in Holm is not deleted during the
migration; ownership moves only after conformance evidence exists.

An agent should begin with `open`. The repository currently authorizes one
bounded architecture window and requires a clean `REVIEW_READY` checkpoint
before implementation starts; the agent must not roll directly into the next
slice.

## Relationship to Holm

Holm remains the runtime and protocol authority. This repository owns the
portable TypeScript SDK, generated JavaScript artifacts, framework bindings,
and adapter conformance tests. Cross-repository behavior is pinned to explicit
Holm source commits and capability contracts to prevent silent drift.

## License

MIT © 2026 Holm HQ
