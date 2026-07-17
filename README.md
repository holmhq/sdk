# Holm SDK

**One TypeScript SDK for every Holm surface.**

Holm apps share backend actions, state, identity, storage, realtime, and
capability contracts while presenting native-feeling interfaces on the web, in
the CLI, and eventually on desktop and mobile. `@holmhq/sdk` is the portable
JavaScript layer that connects those surfaces to Holm.

> [!IMPORTANT]
> This repository is at a private `0.1.0-rc.1` code/artifact checkpoint for the
> scoped v0.1-web SDK. The package remains private and unpublished; the existing
> SDK under the Holm repository remains live during migration. This checkpoint is
> not an npm publication, tag, GitHub release, deployment, production proof,
> pilot result, browser/vendor soak claim, or promotion to `0.1.0`.

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
import { createWebApp } from '@holmhq/sdk/web'

const holm = createWebApp()
const member = await holm.app.auth.me()
const usage = await holm.app.http.get('/api/usage', {
  params: { range: 'month' },
})

await holm.dispose()
```

The package remains pre-release and private, but the stable v0.1-web slice
above is executable and covered by source, declaration-consumer,
generated-artifact, raw BFBB, Vite build, RC docs/metadata, size, license, and
reproducibility checks. See [`docs/v0.1-web-rc.md`](docs/v0.1-web-rc.md) for
the private `0.1.0-rc.1` code/artifact checkpoint contract, including support,
compatibility, vendoring, update, rollback, and security notes. A real
app/browser soak and owner-present promotion to `0.1.0` are future gates;
Issue `#015` remains open for broader README/API/framework/migration closeout.

## Surfaces

Holm's universal app-runtime design treats interfaces as **surfaces**:

- **Web** is the stable BFBB surface at root `index.html`; BFBB authored root
  `index.html` takes precedence over generated presentation.
- **CLI** action generation is unavailable in v0.1-web; Node adapter support is
  preview only.
- **Desktop** is reserved future native-shell work; current bridge mocks are not
  production desktop support.
- **Mobile** is a reserved future thin-client/native-bridge surface.
- **Server/Sobek** uses Holm's injected runtime and is shipped as preview in
  this RC.

Surfaces share models and operations, not one lowest-common-denominator UI DSL.
Holm app wire behavior remains GET/POST; the SDK does not invent a parallel
wire contract. Future framework bindings may adapt resources to host frameworks,
but no framework binding is available in v0.1-web.

## Planned package

- npm name: `@holmhq/sdk`
- source: strict TypeScript
- output: ESM JavaScript, declaration files, source maps, and BFBB bundles
- license: MIT
- initial npm state: private/unpublished

Stable v0.1-web entry points are frozen for `0.1.x` compatibility:

```text
@holmhq/sdk
@holmhq/sdk/core
@holmhq/sdk/transports
@holmhq/sdk/app
@holmhq/sdk/web
@holmhq/sdk/state
@holmhq/sdk/test
```

Preview entry points `@holmhq/sdk/node` and `@holmhq/sdk/sobek` are shipped and
tested but not frozen. `@holmhq/sdk/bridge` is reserved for mailbox/mock and
future native-shell integration only. Admin, actions/generated CLI, realtime,
collaboration, framework bindings, production desktop/mobile, and arbitrary SSR
are unavailable in v0.1-web.

Generated artifacts include tracked ESM JavaScript, declarations, maps, manifest,
size, and license reports under `dist/`, including `dist/holm.js` and
`dist/holm-web.js` for BFBB/web vendoring.

`@holmhq/sdk/state` is the canonical clean-break entry point for immutable
query, mutation, and derived-resource APIs. It does not preserve the legacy
`holm-state` exports; `Resource` remains the precise API/type vocabulary inside
the `/state` entry point.

A complete convenience bundle is welcome. Narrow artifacts remain useful for
runtime isolation and low-end mobile startup budgets. Framework runtimes and
heavy CRDT engines remain peer/optional dependencies rather than being embedded
in every bundle.

## BFBB and jsDelivr distribution

Publishing to npm is deliberately deferred. GitHub is sufficient for the first
versioned artifacts, and jsDelivr can serve immutable Git SHA- or reviewed
tag-pinned files directly:

```text
https://cdn.jsdelivr.net/gh/holmhq/sdk@<commit-sha>/dist/holm.js
```

A raw BFBB app should normally **vendor** the pinned artifact instead of relying
on a public CDN at runtime:

```bash
mkdir -p vendor/holm
curl -fL \
  "https://cdn.jsdelivr.net/gh/holmhq/sdk@<commit-sha>/dist/holm.js" \
  -o vendor/holm/holm.js
```

```js
import { createHolm } from './vendor/holm/holm.js'
```

Never use `@main` for deployed apps. Use an immutable Git SHA or reviewed tag
and record the SDK version plus SHA-256 hash from `dist/manifest.json` alongside
the vendored file. Verify the copied file with `sha256sum -c` before committing
an app update. Rollback means restoring the previously vendored SDK files and
their recorded checksum metadata. The runtime app should load the local vendored
copy; the CDN URL is only a download source for preparing that copy. Report
suspected SDK integrity or credential-redaction issues privately through the
owner-approved security channel; do not publish secrets or private payloads.

Later npm publication is straightforward: package metadata already targets
`@holmhq/sdk`. Publication remains blocked by `"private": true` until package
ownership and release readiness are explicitly approved.

## Credential diagnostics contract

Transport diagnostics and hooks redact structurally marked sensitive URL, query,
path, header, and body material. URL-borne credentials remain caller-owned: if a
helper or app constructs signed URLs, magic links, invite paths, or query tokens,
it must set `sensitive.url` or the relevant `sensitive.params` markers when
creating the transport request. Header-name matching is only defense-in-depth;
explicit structural sensitivity markers are the authority boundary.

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

## Developer commands

The repository uses local npm scripts for source, generated-artifact, size,
license, and reproducibility checks. The canonical local and CI gate is:

```bash
npm run ci
```

Useful narrower checks are:

```bash
npm run build            # regenerate tracked dist/ JS, declarations, maps, and manifest
npm run typecheck:core   # prove core stays free of DOM/Node ambient types
npm run test:types       # prove runtime-specific ambient types stay opt-in
npm run test:source      # run source-level tests through the TS harness
npm run test:declarations # type-test package declarations from a consumer fixture
npm run test:dist        # smoke-test generated ESM artifacts
npm run test:examples    # execute raw BFBB import + build the Vite example
npm run test:holm-smoke  # optional read-only /api/me smoke via HOLM_SMOKE_URL
npm run test:coverage    # enforce native node:test coverage and compact measured metrics
npm run coverage         # alias for test:coverage
npm run check:licenses   # verify package privacy and MIT-compatible locked licenses
npm run size             # write raw/minified/gzip artifact sizes and enforce budgets
npm run check:repro      # regenerate dist/ reports and fail on drift
```

CI runs these same checks and never publishes, tags, or deploys the package.

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

An agent should begin with `open`. The active autonomous window is recorded in
`koder/docs/EXECUTION.md`; do not continue beyond its stop gate or into release
work without explicit approval.

## Relationship to Holm

Holm remains the runtime and protocol authority. This repository owns the
portable TypeScript SDK, generated JavaScript artifacts, framework bindings,
and adapter conformance tests. Cross-repository behavior is pinned to explicit
Holm source commits and capability contracts to prevent silent drift.

## License

MIT © 2026 Holm HQ
