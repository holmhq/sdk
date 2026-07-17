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

Stable v0.1-web imports:

```text
@holmhq/sdk
@holmhq/sdk/core
@holmhq/sdk/transports
@holmhq/sdk/app
@holmhq/sdk/web
@holmhq/sdk/state
@holmhq/sdk/test
```

Vendored BFBB usage:

```bash
SDK_REF=<immutable-commit-sha-or-reviewed-tag>
mkdir -p vendor/holm-sdk
curl -fL "https://cdn.jsdelivr.net/gh/holmhq/sdk@${SDK_REF}/dist/holm.js" \
  -o vendor/holm-sdk/holm.js
printf '%s  %s\n' '<sha256-from-dist-manifest>' 'vendor/holm-sdk/holm.js' \
  > vendor/holm-sdk/holm.js.sha256
sha256sum -c vendor/holm-sdk/holm.js.sha256
```

```js
import { createHolm } from './vendor/holm-sdk/holm.js'
```

Deployed BFBB apps should vendor artifacts from an immutable Git SHA or reviewed
tag and keep the generated checksum metadata with the copied files. Use an
immutable Git SHA or reviewed tag for updates. Never use `@main` for deployed
apps. Rollback means restoring the previously vendored SDK files and their
recorded checksum metadata. Report suspected SDK integrity or
credential-redaction issues privately through the owner-approved security
channel.

`@holmhq/sdk/node` and `@holmhq/sdk/sobek` are shipped preview imports for
bounded adapter tests and composition, but they are not frozen for `0.1.x` and
must not be treated as production/stable support in web RC apps.

Desktop and mobile bridge exports from `@holmhq/sdk/bridge` are intentionally
reserved and not production for tests and future native shell integration. Their
current mocks are unsupported as production desktop/mobile runtimes and only
prove copied mailbox and capability boundaries.
