# Holm SDK

**Build a Holm app without rebuilding the connection to Holm.**

`@holmhq/sdk` gives TypeScript and JavaScript apps one dependable way to work
with Holm: identity, app APIs, uploads, cached requests, and reactive server
state—across a plain web page today and additional Holm surfaces over time.

Holm is an application runtime: it hosts an app's interface and backend behavior
under one security and identity model. The SDK is the app-side layer that makes
that model pleasant to use.

## Why Holm SDK

A Holm app can start with `fetch()`. The difficulty arrives later: auth changes,
request errors, stale data, caller-safe caching, uploads, cleanup, testing, and
another interface that needs the same behavior.

The SDK turns those repeated integration decisions into a small, tested
contract. You spend more time on what makes the app useful and less time
maintaining a private client library inside every project.

What is different here:

- **Holm-aware by design.** Identity, capabilities, and app behavior follow
  Holm's contracts rather than a generic REST abstraction.
- **One model, many interfaces.** Plain JavaScript and frameworks can consume
  the same immutable state without putting a UI framework into the SDK.
- **Small apps stay small.** BFBB apps can vendor verified ESM files and run
  without a package manager or public CDN in production.
- **Boundaries stay honest.** Web support is stable; preview and future surfaces
  are named as such instead of being implied by a “universal” label.
- **Built to be trusted.** Types, generated artifacts, public API drift, size,
  licenses, reproducibility, and package contents are checked together.

## Is it for you?

You will probably care about this SDK if you are:

- building a browser or BFBB app on Holm;
- tired of duplicating auth, HTTP, cache, upload, and error handling;
- sharing server-backed state between vanilla UI and a framework;
- testing Holm-facing code without a live server for every test;
- building operator tooling against Holm's audited admin routes; or
- planning more than one app surface and want a stable lower contract now.

## When it may not fit

This release is intentionally not a general-purpose API client, a UI component
library, or a replacement for Holm itself. It may not be the right tool if you
need a frozen/stable admin API, generated CLI actions, production realtime or
collaboration, a first-party React/Angular/Svelte/Vue binding, or a production
desktop/mobile runtime today. The admin client is released as preview while its
standardized operation-input contract receives real operator feedback.

Those limits are explicit in the [capability matrix](docs/capabilities.md).

## Quick start

```bash
npm install @holmhq/sdk
```

```ts
import { createWebApp } from '@holmhq/sdk/web'

const holm = createWebApp()

try {
  const member = await holm.app.auth.me()
  const projects = await holm.app.http.get('/api/projects')

  console.log({ member, projects })
} finally {
  await holm.dispose()
}
```

That is enough for a same-origin Holm web app. Add `@holmhq/sdk/state` when the
UI should subscribe to server-backed data instead of manually coordinating
loading, refresh, stale, and error state.

Prefer a no-build app? Vendor the complete ESM tree from an immutable Git SHA or
reviewed tag; never use `@main` in a deployed app. The
[vendoring guide](docs/vendoring.md) gives the copy, integrity, update, and
rollback workflow.

## See the idea in practice

- [Vanilla and React examples](examples/README.md) use the same session
  resource/action model.
- [Sokoban](https://sokoban.zyt.app) is a real Holm app using a hash-pinned,
  vendored build for auth, app HTTP, leaderboard queries, and score mutations.

## Release status

`0.2.1` preserves the stable **web/BFBB** contract, includes the audited
`@holmhq/sdk/admin` operator client as preview, and preserves declared upload
MIME types in web multipart fallback. The stable entry points remain root,
`core`, `transports`, `app`, `web`, `state`, and `test`; admin, Node, and Sobek
are preview, and the native bridge is reserved.

Read the [0.2 support contract](docs/v0.2.md), the
[admin/operator guide](docs/admin.md), or the [migration ledger](docs/migration.md)
if you are moving from Holm's existing `holm-sdk` or `holm-state` packages.
Those packages remain live during migration. Future npm and GitHub releases use
one protected GitHub approval with direct OIDC publishing and end-to-end
artifact verification; see the [release guide](docs/releasing.md).

## For coding agents

> **If you are an AI/LLM coding agent, read
> [`docs/agent-guide.md`](docs/agent-guide.md) before generating integration
> code or changing this repository.**

That guide contains the technical mental model, package boundaries, resource and
caller rules, auth/cache edge cases, exact validation commands, generated-file
ownership, and links to deeper evidence. The README intentionally does not
duplicate those details.

## License

MIT © 2026 Holm HQ
