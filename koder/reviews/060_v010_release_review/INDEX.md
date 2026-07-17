---
status: accepted
reviewer: pi/gpt-5.5
date: 2026-07-18
target_commit: 396f991c48334225fa262805ca4e25bba964c01d
base_commit: 064052195d2026e6975af2991bafa87719d5240c
range: 0640521..396f991
---

# Fresh independent release review — @holmhq/sdk 0.1.0

## Verdict

APPROVE. P1=0, P2=0, P3=0.

I reviewed the public-release delta for package/publication safety, generated artifact/version/license integrity, stale RC assumptions, README/docs usability, migration/capability honesty, whole-tree BFBB vendoring, vanilla/React session behavior, lifecycle disposal, tests that could pass incorrectly, and credential/security risk. I did not implement, commit, push, tag, publish, use credentials, or mutate external state.

## Findings

None.

## Package and release facts

- Target verified: `git rev-parse HEAD` = `396f991c48334225fa262805ca4e25bba964c01d`; branch `main`.
- Package identity is public `@holmhq/sdk@0.1.0`; package-lock root also records `0.1.0` (`package.json:2-3`, `package-lock.json:2-9`).
- Package is not private, sets public scoped publish access, and gates publication through `prepublishOnly -> npm run release:check` (`package.json:75-88`).
- Tarball dry-run: `holmhq-sdk-0.1.0.tgz`, 255 files, 175600 packed bytes, 992851 unpacked bytes. Top-level contents are exactly `CHANGELOG.md`, `LICENSE`, `README.md`, `dist/`, `docs/`, `examples/`, `package.json`; no internal/unallowed paths observed.
- Generated artifact metadata records `@holmhq/sdk 0.1.0`, MIT notices, `private: false`, 232 manifest artifacts, 232 license-report artifacts, and size status `pass` with 50254 gzip bytes total (`dist/manifest.json`, `dist/license-report.json`, `dist/size-report.json`).
- Runtime dependency surface remains empty for the universal package; `scripts/check-package.mjs:26-30` enforces no runtime dependencies and the release gate.

## Review notes

- README and release docs state the bounded stable web/BFBB scope, stable entry points, preview Node/Sobek, reserved bridge, npm install path, and agent guide route (`README.md:59`, `README.md:95-107`; `docs/v0.1.md:3-27`).
- Capability and migration docs are honest about unavailable admin/generated actions/realtime/collaboration/framework bindings/desktop-mobile and keep Holm `packages/holm-sdk` / `packages/holm-state` live during migration (`docs/capabilities.md:32-38`; `docs/migration.md:1-19`, `docs/migration.md:98-102`).
- Vendoring guidance requires the whole `dist/` tree, immutable npm/SHA/tag sources, `dist/manifest.json` verification, no deployed `@main`, auth-transition cleanup, host-route checks, and complete rollback without mixing versions (`docs/vendoring.md:4-16`, `docs/vendoring.md:46-60`, `docs/vendoring.md:103-134`).
- Shared vanilla/React example model invalidates app HTTP cache and resets/reloads auth state on logout including redirect-follow errors, while both UIs consume the same immutable resource contract; disposal is explicit in shared model and UI lifecycles (`examples/shared/session-contract.ts:45-74`, `examples/vite/src/main.ts:34-39`, `examples/react/src/main.tsx:12-27`, `test/source/examples/session-contract.test.ts:1-93`).
- Package/tests cover tarball allowlisting, export smoke from an installed tarball, whole-tree BFBB integrity, altered-byte rejection, docs release labels, package-export compatibility, and stable ESM isolation from preview/reserved runtimes (`scripts/check-package.mjs:51-88`, `scripts/check-package.mjs:117-177`, `scripts/verify-dist-integrity.mjs:20-84`, `scripts/test-examples.mjs:58-129`, `test/dist/index.test.mjs:195-284`).
- Credential/security scan found only synthetic test tokens/secrets used to assert redaction; no credentials or private payloads in changed release docs/package metadata.

## Command exits

| Command | Exit |
| --- | ---: |
| `git diff --check 0640521..396f991` | 0 |
| `npm run test:docs` | 0 |
| `npm run test:dist` | 0 |
| `npm run test:examples` | 0 |
| `npm run test:package` | 0 |
| `npm pack --dry-run --json --ignore-scripts` | 0 |

Primary full `npm run ci` was reported green in the task brief; I did not rerun it.

## Gate recommendation

P1=0/P2=0. Proceed with owner-authorized push/tag/GitHub release/npm publication from exactly `396f991c48334225fa262805ca4e25bba964c01d`, subject to the separate owner-present release action and credential controls. Do not release from a different commit without rerunning the release/package gates.
