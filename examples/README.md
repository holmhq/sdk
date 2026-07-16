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

Desktop and mobile bridge exports are intentionally reserved for tests and
future native shell integration. Their current mocks are unsupported as
production desktop/mobile runtimes and only prove copied mailbox and capability
boundaries.
