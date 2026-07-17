# Vendored BFBB fixture

This fixture is copied by `scripts/verify-dist-integrity.mjs` into a temporary
static directory with `dist/` artifacts vendored under `vendor/holm-sdk/`.
It imports `./vendor/holm-sdk/holm.js` with relative ESM only, so a deployed raw
BFBB app needs no package manager, build step, Node runtime, or runtime CDN.

Vendor from an immutable Git SHA or reviewed tag and keep the generated
`dist/manifest.json` checksum metadata with the copied files. Never deploy from
mutable `@main` URLs.
