---
title: 0.2.1 exact-target release evidence
status: released
sdk_candidate: 81d5732f1ba71dcbe1d42a7fe52868dedada9e56
product_target: bb663d92361b8278ca163be4053fae54c31ca94a
version: 0.2.1
release: v0.2.1
registry_shasum: e280f25ce0fa6e08a4870b4f3e4e7f1360ac6010
workflow_run: 29773856653
npm_stage: 5194865d-de9e-4e92-b698-d0c5710e4553
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

## OIDC stage and approval evidence

- `main` was pushed through evidence commit `664ae51`; annotated tag `v0.2.1`
  has tag object `22980a8f45805ca3e7edb37275e9ec96aa227f37` and peels locally and remotely
  to exact package target `81d5732f1ba71dcbe1d42a7fe52868dedada9e56`.
- GitHub Actions run `29773856653` used ref and input `v0.2.1`, checked out the
  exact peeled target, passed identity/audit/release/cleanliness gates, and ran
  only `npm stage publish . --access public --tag latest`.
- npm stage `5194865d-de9e-4e92-b698-d0c5710e4553` was created with signed
  provenance; transparency-log index `2207354834` was reported by the workflow.
- The required-reviewer path was **not** exercised successfully. GitHub's
  approvals API records actor `holmhq-admin`, `state=skipped`, environment
  `npm-release`, with `can_admins_bypass=true`. This was an administrator bypass,
  not approval by configured reviewer `jikkuatwork`; keep it as a hardening
  finding and require a real approval on the next genuine release.
- The owner approved the npm stage before the requested staged-detail screenshot
  inspection. Post-publication verification below proves the immutable result,
  but does not retroactively count as pre-approval stage review.

## Live publication and GitHub release verification

- `@holmhq/sdk@0.2.1` is public and npm `latest` resolves to `0.2.1`.
- Registry SHA-1 is `e280f25ce0fa6e08a4870b4f3e4e7f1360ac6010`; integrity is
  `sha512-TjXE0RVgUSABqoKHPa6mAJsUd6+3pQnlGMXTPcTOSZBD4eZzSEGJnmpaMA7iQSCHleAlTe7+kWP6509OtBrMPw==`.
- The fresh registry tarball is byte-identical to the prepared tarball and has
  SHA-256 `3e48d4163577df0338d9ff4de390f5152418a629a2cc3d7f65cb6ed08a587416`.
  Its embedded `dist/manifest.json` is also byte-identical to the prepared
  manifest.
- npm exposes both publish and SLSA provenance attestations. A clean registry
  consumer's `npm audit signatures` verified one registry signature and one
  attestation.
- The registry consumer imported all 11 exports, confirmed 216 admin methods,
  and forced multipart fallback; `photo.jpg` remained `image/jpeg`, 4 bytes.
- GitHub's latest release is
  `https://github.com/holmhq/sdk/releases/tag/v0.2.1`. Downloaded tarball,
  `SHA256SUMS`, and `dist-manifest.json` compare byte-for-byte with prepared
  assets, and both checksums pass.

## Post-release hardening status

- GitHub environment admin bypass is now disabled while reviewer `jikkuatwork`
  and `v*` deployment policy remain. Active ruleset `19324891` blocks deletion
  and all updates to `refs/tags/v*`, with no bypass actors or exclusions.
- Review `#068` approves a future unified one-approval workflow that publishes
  npm directly and creates/verifies the GitHub Release. This does not alter the
  historical `0.2.1` stage evidence above.
- npm still needs the trusted-publisher action changed from `npm stage publish`
  to **`npm publish` only**, plus Publishing access **Require two-factor
  authentication and disallow tokens**. Confirm no classic/granular token or
  local npm auth exists after the owner-authenticated update.
- Prove accountable reviewer approval and the unified workflow only on a future
  genuine release; never create a dummy version.
