---
title: 0.2.0 exact-target release candidate evidence
status: blocked
sdk_candidate: 189eaa6261b9c357a6a61bf813cd9fcd1eeb372a
product_target: 96485b7d2922893efb3477cd174a3017e3de10ce
version: 0.2.0
blocker: npm authentication returns E401
updated: 2026-07-20
---

# `@holmhq/sdk@0.2.0` Release Candidate

## Exact target

- Release/tag target: `189eaa6261b9c357a6a61bf813cd9fcd1eeb372a`.
- Admin product/fix target: `96485b7d2922893efb3477cd174a3017e3de10ce`.
- Independent SDK Review `#063`: approved, `P1=0 P2=0 P3=1` advisory.
- Fresh Holm-authority Review `#064`: accepted against Holm
  `9a02784b5b8004ed946003cb650b1325f29763a1`, `P1=0 P2=0 P3=1` advisory.

## Final gate proof

- Normal `npm run release:check`, FORCE_COLOR CI, TAP CI, and TAP+color CI pass
  from the exact target with identical required metrics:
  `statements=98.09 lines=98.95 functions=98.65 branches=95.31
  changed_reachable=100.00`.
- 230 source tests and 24 generated-dist tests pass.
- Reproducibility passes for 267 dist artifacts.
- Installed-package smoke imports all 11 package entry points and confirms 216
  admin methods.
- Package check: 289 files, 210,860 packed bytes, 1,294,541 unpacked bytes.
- `npm audit --audit-level=high`: zero vulnerabilities.
- `npm publish --dry-run --access public --json`: exit 0; publication remained a
  dry-run and targeted public `latest`.

## Prepared immutable assets

Regenerate from the exact target if `/tmp` is unavailable; do not substitute a
later package-bearing commit.

| Asset | Evidence |
| --- | --- |
| `holmhq-sdk-0.2.0.tgz` | SHA-256 `e76d14c1dec50789d45f891fe44367635b7d7353b8187053b9fc45c488542c8a`; npm shasum `6fb216caa5502a80f0b568119b0727d6ba96d46c`; 210,860 bytes |
| `dist-manifest.json` | SHA-256 `6cd9a6c7b3ca68e3ec52fd26e58c86099f494262d6dd5a8f75633847f6550998` |
| `SHA256SUMS` | Contains relative checksums for both assets; `sha256sum -c` passes |

The prepared tarball at `/tmp/sdk-v020-release/` installs cleanly and imports
root, core, transports, app, admin, web, state, node, sobek, bridge, and test.

## Blocker and continuation

`npm whoami` returns `E401 Unauthorized`. An npm credential entry exists but is
not accepted by the registry. No tag, GitHub release, or real npm publication
has occurred; this avoids a partial release.

Owner action: authenticate npm for the publishing account (for example
`npm login --auth-type=web`) and confirm `npm whoami` succeeds. Then continue
from this exact release target: recheck Git/tag/version absence, publish, verify
registry shasum/install, create the annotated tag and GitHub release assets, and
close with a clean synchronized repository.

Do not claim the full live Holm `packages/holm-sdk/test.js` suite is green:
Review `#064` records one unrelated stale generated inventory document while all
admin route authority tests pass.
