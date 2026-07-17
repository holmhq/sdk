# Changelog

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
