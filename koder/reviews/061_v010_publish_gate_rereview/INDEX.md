---
status: accepted
reviewer: pi/gpt-5.5
date: 2026-07-18
base_commit: 396f991c48334225fa262805ca4e25bba964c01d
target_commit: 9d855c501b56a3e7ea46100bc1b4b34bc979a958
range: 396f991..9d855c5
---

# Narrow 0.1.0 publish-gate rereview

## Verdict

APPROVE. P1=0, P2=0, P3=0.

I reviewed only the release-blocker fix from `396f991c48334225fa262805ca4e25bba964c01d` to `9d855c501b56a3e7ea46100bc1b4b34bc979a958`: the diff, `scripts/check-package.mjs`, and Review `#060`. I did not edit product code, commit, push, tag, publish for real, use credentials, or mutate external state.

## Findings

None.

## Assessment

- `9d855c5` changes only the installed-tarball smoke path in `scripts/check-package.mjs` plus the prior Review `#060` artifact.
- The fix is scoped: it passes a copied environment with `npm_config_dry_run: "false"` only to the internal `npm pack` and local `npm install` subprocesses used by `runInstalledPackageSmoke()`.
- The override is safe because those subprocesses are `shell: false`, run fixed no-publish commands, pack/install a local tarball under `.tmp/package-smoke`, use `--ignore-scripts`, `--no-audit`, and `--no-fund`, and do not have a registry publication operation.
- The outer `npm publish --dry-run --access public` remained a dry-run and reported `+ @holmhq/sdk@0.1.0`.
- The check is stronger, not weaker: inherited dry-run no longer causes the installed-tarball smoke to skip tarball creation, while the original package allowlist, required files, export target, size, dependency, identity, access, and prepublish checks remain intact.
- Review `#060` approved the prior product commit with P1=0/P2=0/P3=0; this rereview found no new release-blocking issue in the narrow publish-gate delta.

## Command exits

| Command | Exit | Evidence |
| --- | ---: | --- |
| `git rev-parse HEAD` | 0 | `9d855c501b56a3e7ea46100bc1b4b34bc979a958` |
| `git diff --check 396f991..9d855c5` | 0 | no output |
| `npm_config_dry_run=true npm run test:package` | 0 | package release check passed; installed export smoke green |
| `npm publish --dry-run --access public` | 0 | remained dry-run; reported `+ @holmhq/sdk@0.1.0` |

## Release-gate recommendation

P1=0/P2=0. The `9d855c501b56a3e7ea46100bc1b4b34bc979a958` fix closes the dry-run release blocker without weakening package checks. Proceed only with the separate owner-present release action and credential controls; do not publish from a different commit without rerunning the release gate.
