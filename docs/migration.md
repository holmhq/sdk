# Holm SDK and state migration ledger

This ledger prevents two repositories from silently claiming the same API. It
classifies every public top-level surface of Holm's existing JavaScript SDK and
state package; it is not a removal plan.

## Source verification

- Runtime/protocol authority: `holmhq/holm`
- Live read-only verification: `3d229a414a0379d0a24221e975b8b4f1588f494d`
- Previously accepted web-release Holm-authority checkpoint: `748cbe5`
- `git diff 748cbe5..3d229a4 -- packages/holm-sdk packages/holm-state` is empty.
- Main SDK export source: `packages/holm-sdk/index.js`
- State export source: `packages/holm-state/src/index.js`

“Adopted” means behavior has a corresponding `@holmhq/sdk` contract and tests;
“redesigned” means the responsibility moved behind a stricter contract;
“deferred” remains owned by the Holm package; “rejected” is intentionally not
preserved.

## `packages/holm-sdk` public exports

| Existing surface | Disposition | `@holmhq/sdk` destination or reason |
| --- | --- | --- |
| `VERSION` | redesigned | Package/version metadata and the immutable release ref are authoritative; no mutable runtime constant is exported. |
| `createAppClient()` | adopted | `createWebApp()` plus `app.auth`, `app.http`, `app.links`, `app.paginate`, `app.upload`, and `app.surface`. |
| `createClient()` | adopted/redesigned as preview | `createAdminClient({ runtime, caller })` plus generated `admin.*` namespaces. Runtime and operator caller are explicit; no ambient singleton/auth inference is preserved. |
| `getClient()` | rejected | A process-global singleton conflicts with isolated runtimes, callers, caches, and lifecycle disposal. |
| `ApiError` | redesigned | `HolmError`, `ProtocolError`, `TransportError`, `RemoteError`, `UploadError`, serialization, and safe diagnostics. |
| `createCache()` | redesigned | `createTransportCache()` with canonical caller/source partitioning, invalidation, deduplication, SWR, and diagnostics. |
| `createMockAdapter()` / `mockAdapter` | adopted | `createInMemoryRuntimeAdapter()` and deterministic test services under `@holmhq/sdk/test`. |
| `createDebugClient()` | redesigned | Typed diagnostics sinks, resource history, in-memory runtime adapters, and explicit caller services; credentials are not read implicitly from globals. |
| `createAnalyticsHook()` / `createLoggingHook()` / `createMemoryAnalytics()` | deferred/redesigned | Generic diagnostics hooks are shipped; beacon/product analytics policy remains application-owned. |

### App namespace (`packages/holm-sdk/app.js`)

| Existing namespace | Disposition | Evidence/destination |
| --- | --- | --- |
| `auth` (`me`, login/QR, anonymous, magic link, logout) | adopted | `@holmhq/sdk/app` auth contract and route conformance audit. |
| `http` | adopted/redesigned | Typed transport requests, envelopes, sensitivity metadata, caller-partitioned cache, and explicit invalidation. |
| `surface` | adopted | Finite built-in surface bootstrap and URL helpers. |
| `links` | adopted | List/get/create/update/delete/import contracts and upload composition. |
| `upload()` | adopted/redesigned | Runtime-specific upload services with progress and cancellation seams. |
| `paginate()` | adopted | Framework-neutral async pagination helper. |

The exact app route inventory remains pinned in
`koder/evidence/003_issue007_app_routes/route-audit.json`. Existing Holm app
wire behavior remains GET/POST-authoritative even though the low-level typed
HTTP client can represent other methods used by adopted routes.

### Admin namespace (`packages/holm-sdk/admin.js`)

The `0.2.0` preview classifies all 174 audited inventory keys from
`packages/holm-sdk/admin.audit.js`, 189 expanded route/method contracts, 216
unique method names, and 18 intentional exclusions
at the named Holm verification commit. `@holmhq/sdk/admin` preserves route and
command-envelope behavior while redesigning invocation around one typed
operation object, explicit operator caller context, adapter-private auth,
runtime-neutral uploads, SDK bytes, and immutable generated descriptors.

This is conformance-led migration, not shape compatibility. For example,
`apps.get({ path: { id } })` replaces positional path arguments, deploy callers
provide prepared upload files rather than a universal ZIP/`FormData` helper,
and attachment bytes use `ReadonlyBytes`. See [admin.md](admin.md) and
`koder/evidence/004_issue008_admin_routes/route-audit.json`.

### Other Holm SDK modules

| Source module | Disposition |
| --- | --- |
| `client.js` HTTP/auth/hooks/envelopes/uploads | adopted and split across `core`, `transports`, and runtime adapters. |
| `cache.js` | redesigned as caller/source-partitioned transport caching. |
| `runtime.js` | redesigned as explicit web, Node, Sobek, test, and reserved bridge adapters. |
| `types.js` | redesigned as strict TypeScript declarations and declaration-consumer tests. |
| `errors.js` | redesigned into the typed error hierarchy. |
| `entry.js` / `build.sh` | redesigned as reproducible ESM, declarations, maps, BFBB compositions, size/license reports, and `dist/manifest.json`. |
| `admin.js` and its namespaces | adopted/redesigned as the isolated preview `@holmhq/sdk/admin` entry point with generated route parity. |
| `deploy.js` | redesigned as injected, runtime-neutral upload input; deployment policy and authorization remain Holm-owned. |
| `analytics.js` | deferred except for general diagnostics seams. |
| `debug.js` | redesigned without ambient credential discovery. |
| `mock.js` and fixtures | redesigned under stable test utilities. |

## `packages/holm-state` public exports

| Existing surface | Disposition | `@holmhq/sdk` destination or reason |
| --- | --- | --- |
| `ref()` | rejected as SDK-owned UI primitive | Local mutable UI state belongs to the chosen framework; SDK resources expose immutable snapshots. |
| `computed()` | redesigned | `createDerivedResource()` derives immutable resource state without Vue. |
| `watch()` | redesigned | `Resource.subscribe()` is the framework-neutral observation boundary. |
| `effect()` | rejected as a global primitive | Effects remain framework/application-owned; SDK lifecycle is explicit and disposable. |
| `remote()` | redesigned | `createQueryResource()` and `createMutationResource()` separate reads, writes, optimistic state, invalidation, and caller changes. |
| `channel()` | deferred / extension-owned | Authenticated realtime transport and presence are unavailable; `createRealtimeReconcileHook()` only reconciles authoritative resources. |
| `guard()` | deferred | Auth policy and redirects remain application/framework concerns over `app.auth` and session resources. |
| `route()` | redesigned / deferred | Web navigation helpers are shipped; a universal reactive router is intentionally not. |
| `track()` | redesigned | `createResourceHistory()` and diagnostics provide bounded observation; app-local undo/redo remains app-owned. |
| `debug` | redesigned | Diagnostics and resource history are stable; timeline import/playback is not copied into universal core. |

The detailed legacy state evidence is in
`koder/evidence/002_issue006_state_legacy/INDEX.md`.

## Ownership and cutover

Existing Holm `packages/holm-sdk` and `packages/holm-state` remains live and
unmodified by this release. No file is deleted, redirected, or silently
re-exported. New web and operator clients may adopt `@holmhq/sdk`; old package
cutover, template changes, and deprecation notices require separate Holm-side
work and evidence.
