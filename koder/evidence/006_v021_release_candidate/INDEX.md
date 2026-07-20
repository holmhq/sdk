---
title: 0.2.1 exact-target release candidate evidence
status: ready_to_tag
sdk_candidate: 81d5732f1ba71dcbe1d42a7fe52868dedada9e56
product_target: bb663d92361b8278ca163be4053fae54c31ca94a
version: 0.2.1
release: v0.2.1
registry_shasum: pending
updated: 2026-07-21
---

# `@holmhq/sdk@0.2.1` Release Evidence

## Authorization and scope

The owner authorized a genuine `0.2.1` patch release for Issue `#018`, including
SDK commit/push, immutable annotated tag, protected OIDC staging, npm
publication, GitHub release assets, verification, and required first-stage npm
hardening. Medialab deployment and writes to Holm or any other repository remain
outside this release window.

## Exact target and review applicability

- Release/tag target: `81d5732f1ba71dcbe1d42a7fe52868dedada9e56`.
- Issue `#018` product target: `bb663d92361b8278ca163be4053fae54c31ca94a`.
- The release target descends from the product target. No `src/` file changed
  after `bb663d9`; the reviewed upload source and generated implementation are
  byte-identical. The only later change in the Issue `#018` test surface updates
  package-version assertions from `0.2.0` to `0.2.1`.
- Independent SDK Review `#066` approved the MIME remediation with
  `P1=0 P2=0 P3=0`.
- Fresh read-only Holm Review `#067` accepted it against Holm
  `9fbc0b418674d39dfa6f6b98dd2a73155ff9c523`, also with
  `P1=0 P2=0 P3=0`.
- Live Holm advanced to `3eb1c3b23e89e938fe77b940199f192d2a9efc65`
  before release, but the reviewed upload authority paths have no diff and no
  relevant working-tree changes from the Review `#067` pin.

## Strict release-identity red to green

After advancing only `package.json` and `package-lock.json` to `0.2.1`, the
release docs, generated-dist identity, and installed-package identity gates all
failed on their pinned `0.2.0` expectations. Updating the release checks/docs,
changelog, package identity assertions, and generated reports made all three
targeted gates green before the full release gate.

## Exact-target gate proof

All commands below passed from clean commit
`81d5732f1ba71dcbe1d42a7fe52868dedada9e56`; regeneration left the tree clean.

- `npm audit --audit-level=high`: zero vulnerabilities.
- `npm run release:check`: green.
- `FORCE_COLOR=1 npm run ci`: green.
- `NODE_OPTIONS='--test-reporter=tap' npm run ci`: green.
- `FORCE_COLOR=1 NODE_OPTIONS='--test-reporter=tap' npm run ci`: green.
- Each mode reports 230 source tests, 25 generated-dist tests, 267 reproducible
  dist artifacts, 72 licensed locked packages, and identical required coverage:
  `statements=98.09 lines=98.95 functions=98.65 branches=95.31
  changed_reachable=100.00`.
- Size remains `296327` raw / `226159` minified / `58504` gzip bytes.
- Installed-package smoke passes over 290 files: `213166` packed and `1300592`
  unpacked bytes.
- `npm publish --dry-run --access public --tag latest --ignore-scripts --json`
  exits zero for exactly `@holmhq/sdk@0.2.1`; no publication occurred.

## Registry, tag, environment, and credential preflight

- `@holmhq/sdk@0.2.1` returned the expected npm registry 404; npm `latest`
  remained `0.2.0`.
- Local and remote `v0.2.1` were absent before tag creation.
- GitHub environment `npm-release` requires reviewer `jikkuatwork` and permits
  only `v*` deployment refs.
- Repository publish secrets named `NPM_TOKEN`/`NODE_AUTH_TOKEN`, local npm auth
  keys, publish-auth environment variables, and repository npmrc files were all
  absent. No credential value or token-list payload was inspected or recorded.

## Prepared immutable assets

Prepared from the exact target under `/tmp/sdk-v021-release/`:

| Asset | Evidence |
| --- | --- |
| `holmhq-sdk-0.2.1.tgz` | SHA-256 `3e48d4163577df0338d9ff4de390f5152418a629a2cc3d7f65cb6ed08a587416`; npm SHA-1 `e280f25ce0fa6e08a4870b4f3e4e7f1360ac6010`; integrity `sha512-TjXE0RVgUSABqoKHPa6mAJsUd6+3pQnlGMXTPcTOSZBD4eZzSEGJnmpaMA7iQSCHleAlTe7+kWP6509OtBrMPw==`; 213166 bytes; 290 files |
| `dist-manifest.json` | SHA-256 `fa9e919a4099417f9dcc1e14398a90c483380ec3a2b15f65c51156fb354a5dc8` |
| `SHA256SUMS` | Relative checksums for the tarball and manifest; `sha256sum -c` passes |

A clean tarball consumer imported all 11 exported entry points, confirmed 216
admin descriptors, and forced the generated web upload service through the
multipart fallback. The installed `0.2.1` package preserved `photo.jpg` as
`image/jpeg` with 4 bytes.

## Release stop conditions

Push and tag only this exact target. Dispatch `publish.yml` with both workflow
ref and input equal to annotated `v0.2.1`. Reject any GitHub run, npm stage,
provenance, package identity, file list, integrity, checksum, or source-target
mismatch. Workflow success means staged, not public; public success requires npm
approval and independent registry verification.
