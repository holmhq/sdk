# Web app examples

- `bfbb/` imports the tracked generated ESM module tree directly. Serve the
  repository root (or vendor the pinned `dist/` tree) and open
  `examples/bfbb/index.html`; no package manager or build step is required.
- `bfbb-vendored/` is the copied raw fixture used by the integrity gate. The
  test copies tracked `dist/` files under `vendor/holm-sdk/`, verifies their
  SHA-256 metadata from `dist/manifest.json`, rejects an altered byte, and then
  imports only local relative ESM.
- `vite/` imports `@holmhq/sdk/web` through package exports and is compiled by
  the root `npm run test:examples` command.

Both examples use `createWebApp()`, which composes an isolated web runtime,
caller provider, app extension, surface bootstrap, and upload service. The web
baseline is capability-based: modern ESM loading from vendored files,
Fetch-compatible request/response services, URL and Headers primitives for
adopted helpers, optional upload primitives only when upload helpers are used,
and static-file serving for raw fixtures. This local gate does not claim browser-vendor soak; that remains a separate pilot activity.

Deployed BFBB apps should vendor artifacts from an immutable Git SHA or reviewed
tag, keep the generated checksum metadata with the copied files, and never
`@main`.

`@holmhq/sdk/node` and `@holmhq/sdk/sobek` are shipped preview imports for
bounded adapter tests and composition, but they are not frozen for `0.1.x` and
must not be treated as production/stable support in web RC apps.

Desktop and mobile bridge exports from `@holmhq/sdk/bridge` are intentionally
reserved and not production for tests and future native shell integration. Their
current mocks are unsupported as production desktop/mobile runtimes and only
prove copied mailbox and capability boundaries.
