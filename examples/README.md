# Examples

These examples show three ways to consume the same release without making a UI
framework part of SDK core.

- `bfbb/` imports the tracked complete browser ESM composition directly. Serve
  the repository root and open `examples/bfbb/index.html`.
- `bfbb-vendored/` is the offline integrity fixture. The test copies the whole `dist/` module graph,
  verifies `dist/manifest.json`, rejects an altered byte,
  and imports only local relative ESM.
- `vite/` is the vanilla TypeScript app. It imports package exports, renders an
  auth query resource, and exposes refresh/sign-out actions.
- `react/` renders the same model with React and `useSyncExternalStore`; React
  remains an example-only development dependency, not an SDK dependency.
- `shared/session-contract.ts` is the same semantic session resource/action contract
  used by both `vite/` and `react/`.

Run every fixture and production build from the repository root:

```bash
npm install
npm run build
npm run test:examples
```

The shared model composes `app.auth.me()`, `app.auth.logout()`, app HTTP cache
invalidation, `createQueryResource()`, and `createMutationResource()`. Both UIs
consume immutable snapshots; neither owns transport or auth semantics. The
logout cleanup also refreshes session state when Holm has already cleared the
cookie but a followed redirect reports an error.

## Supported imports

Stable `0.1.x` imports:

```text
@holmhq/sdk
@holmhq/sdk/core
@holmhq/sdk/transports
@holmhq/sdk/app
@holmhq/sdk/web
@holmhq/sdk/state
@holmhq/sdk/test
```

`@holmhq/sdk/node` and `@holmhq/sdk/sobek` are preview imports and are not frozen
for `0.1.x`. `@holmhq/sdk/bridge` is reserved, unsupported, and not production
for a desktop or mobile runtime; its mailbox mocks are for tests and future native
shell integration only. Desktop and mobile production support is unavailable.

## BFBB vendoring

A BFBB app must vendor the full relative ESM tree from an immutable Git SHA,
reviewed tag, or immutable npm version. Never deploy from `@main`, and do not require a public
CDN at runtime. Follow [the vendoring guide](../docs/vendoring.md) for the copy,
SHA-256 verification, update, and rollback workflow.

The real [Sokoban pilot](https://sokoban.zyt.app) is additional vanilla evidence:
it consumes a hash-pinned vendored SDK tree and exercises auth, app HTTP,
query/mutation resources, and browser behavior against Holm.
