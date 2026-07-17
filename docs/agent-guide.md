# Technical guide for coding agents

Read this document before generating code with `@holmhq/sdk` or changing this
repository. It is the compact technical route; follow its links only when the
task needs deeper evidence.

## Mental model

Holm is the protocol authority. The SDK is a portable TypeScript client and
state layer, not a second backend protocol and not a universal UI framework.
The durable stack is:

```text
Holm action / state / schema / capability contracts
                    ↓
       @holmhq/sdk core + app capabilities
                    ↓
 web · preview Node · preview Sobek · reserved native bridge
                    ↓
       vanilla UI or framework-owned adapters
```

Non-negotiable boundaries:

- Core has no DOM or Node ambient types. Runtime APIs enter through adapters.
- Public resources expose immutable snapshots and subscriptions.
- Explicit caller identity is surface-dependent; cache/state partitions
  must not leak between callers.
- Holm authorization is never bypassed and the SDK never exposes direct SQLite.
- Native loops communicate through serializable messages, not shared mutable
  objects.
- Framework runtimes and CRDT engines remain optional; no universal UI DSL is
  shipped.

## Pick the right import

| Need | Import |
| --- | --- |
| Browser app composition | `@holmhq/sdk/web` |
| Auth/HTTP/links/pagination/upload API types | `@holmhq/sdk/app` |
| Query, mutation, derived resources | `@holmhq/sdk/state` |
| Requests, cache, response/error helpers | `@holmhq/sdk/transports` |
| Capability/runtime/lifecycle contracts | `@holmhq/sdk/core` |
| Deterministic fakes | `@holmhq/sdk/test` |
| Node or Sobek adapter | `@holmhq/sdk/node`, `@holmhq/sdk/sobek` (preview) |
| Native mailbox probe | `@holmhq/sdk/bridge` (reserved, not production) |

Check [capabilities.md](capabilities.md) before promising a product surface.

## Standard web composition

```ts
import { createWebApp, createWebCaller } from '@holmhq/sdk/web'

const caller = createWebCaller({
  appId: 'your-app-id',
  origin: window.location.origin,
})
const holm = createWebApp({ caller })

const member = await holm.app.auth.me()
const data = await holm.app.http.get('/api/your-resource')

await holm.dispose()
```

`createWebApp()` owns an isolated runtime, extension graph, app API, and
lifecycle. Do not create a process-global default client.

## Resource contract

A query owns authoritative server state:

```ts
import { createQueryResource } from '@holmhq/sdk/state'

const resource = createQueryResource({
  key: ['projects'],
  source: { id: 'your-app', surface: 'web' },
  caller,
  load: () => holm.app.http.get('/api/projects'),
})

const unsubscribe = resource.subscribe(() => render(resource.getSnapshot()))
await resource.refresh()
```

Snapshots are immutable and have explicit phases (`idle`, `loading`, `ready`,
`error`, `disposed`), stale/refreshing flags, revision, data, and error.
Mutations use `createMutationResource()` and declare invalidation/reconciliation
rather than mutating query snapshots. Dispose resources and subscriptions with
the owning UI lifecycle.

React should adapt this contract with `useSyncExternalStore`; it should not put
React into SDK core. See `examples/shared/session-contract.ts`, `examples/vite`,
and `examples/react`.

## Auth, sensitivity, and caching

- Web defaults to same-origin browser-session identity.
- Provide one caller object to both `createWebApp()` and caller-partitioned
  resources.
- Call `holm.app.http.invalidateCache()` and refresh auth-backed resources after
  external auth transitions. Logout redirect-follow errors can occur after the
  cookie was already cleared; re-probe session state.
- Mark signed URLs, tokens, sensitive query/path values, headers, and bodies
  with transport sensitivity metadata. Redaction heuristics are defense in
  depth, not the authority.
- Never log credentials or private payloads in diagnostics, tests, docs, or
  durable agent artifacts.

## Generated artifacts and BFBB

`dist/` is tracked because BFBB apps vendor ESM directly. A public source change
owns its JavaScript, declarations, maps, license/size reports, and
`dist/manifest.json` in the same commit. Run:

```bash
npm run build
npm run ci
```

Do not hand-edit `dist/`. `npm run check:repro` proves regeneration is clean.
BFBB consumers must copy the whole module tree from an immutable source and
verify hashes; see [vendoring.md](vendoring.md).

## Change workflow

Product changes use strict red → green → refactor:

1. add the smallest failing source/type/dist/example test;
2. run it and observe the intended failure;
3. implement the contract without broadening runtime assumptions;
4. regenerate `dist/` when public source or release metadata changes;
5. run `npm run ci` and inspect `git diff`; and
6. review stable API, protocol, auth, and credential-sensitive changes at the
   appropriate boundary.

Useful gates:

```bash
npm run typecheck:core
npm run test:types
npm run test:source
npm run test:declarations
npm run test:dist
npm run test:examples
npm run test:coverage
npm run check:licenses
npm run size
npm run check:repro
```

## Authority and migration

The authoritative Holm checkout is external to this repository and read-only
unless the owner explicitly authorizes a change. Pin protocol claims to a Holm
commit. Existing Holm packages remain operational; consult
[migration.md](migration.md) before claiming an old namespace is replaced.

For release scope and compatibility, read [v0.1.md](v0.1.md). For current repo
handoff, read `koder/STATE.md`; `koder/` is operator memory and is not part of
the npm package contract.
