# Changelog

## Unreleased

### Fixed

- Preserve each declared upload MIME type when the web adapter falls back from
  resumable upload to multipart form data. Resumable chunk bodies remain
  `application/octet-stream`.

## 0.2.0 — 2026-07-20

Adds the audited admin/operator client as an isolated preview while preserving
all stable `0.1.x` entry points.

### Admin preview

- Added `@holmhq/sdk/admin` with explicit `createAdminClient({ runtime, caller })`
  composition and fail-closed operator caller checks in web and Node adapters.
- Generated 216 typed namespace methods from 189 route/method contracts across
  174 Holm admin audit keys, with 18 intentional exclusions and deterministic
  drift checks.
- Added shared command-gateway behavior, runtime-neutral upload services with
  operator preflight before side effects, binary attachment responses, URL
  helpers, alternate-route selection, and immutable method descriptors.
- Added the preview admin namespace to the complete `holm.js` BFBB composition;
  the narrow `holm-web.js` composition remains admin-free.

### Quality and compatibility

- Preserved the stable root, core, transports, app, web, state, and test APIs.
- Added source, type, declaration, generated-artifact, installed-package,
  coverage, size, license, and reproducibility gates for the admin surface.
- Kept Holm's existing `packages/holm-sdk` and `packages/holm-state` live and
  unchanged; no cutover or deprecation is implied.

See [the 0.2 support contract](docs/v0.2.md), [admin guide](docs/admin.md),
[capability matrix](docs/capabilities.md), and [migration ledger](docs/migration.md).

## 0.1.0 — 2026-07-18

First public release of `@holmhq/sdk`.

### Stable

- Runtime-neutral capability, caller, lifecycle, cancellation, diagnostics,
  error, and wire-value contracts.
- Typed transport requests/responses, sensitivity metadata, uploads, and
  caller-partitioned cache behavior.
- Web app composition with auth, HTTP, links, pagination, uploads, and built-in
  surface helpers.
- Framework-neutral query, mutation, derived, history, and reconciliation
  resources with immutable snapshots.
- Deterministic test runtime and clock utilities.
- Reproducible ESM, declarations, maps, BFBB bundles, hashes, size reports, and
  license reports.

### Preview and reserved

- Node and Sobek adapters are preview.
- Desktop/mobile bridge and mailbox contracts are reserved test/probe surfaces.

### Evidence

- Stable API and Holm-authority reviews completed against the accepted Holm
  baseline, with live package-source drift checked before release.
- A hash-verified vendored build powered the real Sokoban pilot in Chromium
  against Holm `0.185.1` and is serving at <https://sokoban.zyt.app>.
- Vanilla and React examples share one framework-neutral session
  resource/action model.

See [the 0.1 support contract](docs/v0.1.md), [capability matrix](docs/capabilities.md),
and [migration ledger](docs/migration.md).
