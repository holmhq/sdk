# Web app examples

- `bfbb/` imports the tracked generated ESM module tree directly. Serve the
  repository root (or vendor the pinned `dist/` tree) and open
  `examples/bfbb/index.html`; no package manager or build step is required.
- `vite/` imports `@holmhq/sdk/web` through package exports and is compiled by
  the root `npm run test:examples` command.

Both examples use `createWebApp()`, which composes an isolated web runtime,
caller provider, app extension, surface bootstrap, and upload service. Deployed
BFBB apps should vendor artifacts from an immutable commit or tag, never
`@main`.

`@holmhq/sdk/node` and `@holmhq/sdk/sobek` are shipped preview imports for
bounded adapter tests and composition, but they are not frozen for `0.1.x` and
must not be treated as production/stable support in web RC apps.

Desktop and mobile bridge exports from `@holmhq/sdk/bridge` are intentionally
reserved and not production for tests and future native shell integration. Their
current mocks are unsupported as production desktop/mobile runtimes and only
prove copied mailbox and capability boundaries.
