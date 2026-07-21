# Holm SDK Unified npm + GitHub Release Runbook

## Status

- OIDC repository identity is proven by genuine `@holmhq/sdk@0.2.1`, annotated
  tag `v0.2.1`, GitHub Actions run `29773856653`, and verified npm provenance.
- The historical `0.2.1` workflow staged npm first. GitHub recorded
  `holmhq-admin` with environment decision `state=skipped` because administrator
  bypass was enabled. That is not reviewer approval.
- The unified direct-publish workflow is pending proof by the next genuine
  release. Never create a dummy version merely to prove it.

## Intended operator experience

After implementation, reviews, and an immutable tag are ready, the owner takes
one release action: approve GitHub environment `npm-release`. One workflow then:

1. validates the dispatch-pinned commit and annotated tag without publish
   authority;
2. runs audit and the canonical release gate without OIDC access;
3. prepares and transfers the tarball, manifest, checksums, and changelog notes;
4. publishes directly to npm in the sole protected OIDC job;
5. verifies npm bytes, integrity, and provenance before creating the GitHub
   Release from the existing tag; and
6. verifies installation, signatures, release metadata, and every asset in a
   final job without publish authority.

There is no npm Staged Packages approval in this flow.

## Authority and limits

Read completely on every release:

- `koder/STATE.md`
- `koder/docs/EXECUTION.md`
- `docs/releasing.md`
- `.github/workflows/publish.yml`
- `package.json`
- the active exact-target evidence and reviews only

Treat the live workflow and npm/GitHub state as executable authority. Require
explicit owner authorization for push, tag, workflow dispatch, environment
approval, settings changes, or release creation. A broad “publish this release”
authorization may cover those named SDK-release actions, but never Holm writes,
other repositories, deployment, credentials, or unrelated production changes.

Never:

- create a dummy version;
- move or replace a pushed tag;
- overwrite an npm version or GitHub asset;
- add `NPM_TOKEN`/`NODE_AUTH_TOKEN` or direct token fallback;
- bypass environment protection;
- weaken a failed exact-target gate; or
- use a mutable branch as release identity.

## One-time configuration

The identity must remain exact:

| Boundary | Required value |
| --- | --- |
| GitHub repository | `holmhq/sdk` |
| Workflow | `publish.yml` |
| Environment | `npm-release` |
| Deployment refs | `v*` tags |
| Required reviewer | current accountable owner-approved reviewer |
| Administrator bypass | disabled |
| Repository tag ruleset | block deletion and all updates to `refs/tags/v*` |
| npm package | `@holmhq/sdk` |
| npm allowed action | **`npm publish` only** |
| npm Publishing access | **Require two-factor authentication and disallow tokens** |

Use the browser interaction contract for settings:

1. give one small action at a time;
2. inspect the result before the next action;
3. restate the exact setting before an irreversible click;
4. never ask for a password, OTP, WebAuthn response, token, cookie, or recovery
   material; and
5. record outcomes, not screenshots or private browser payloads.

A settings update is not a release. Do not dispatch a workflow merely to test
configuration.

## Load live facts

Inspect without repairing automatically:

```bash
git status --short --untracked-files=all
git branch --show-current
git log --oneline -5
git rev-list --left-right --count '@{u}'...HEAD
node -p "require('./package.json').name + '@' + require('./package.json').version"
gh workflow view publish.yml
gh api repos/holmhq/sdk/environments/npm-release \
  --jq '{can_admins_bypass, protection_rules, deployment_branch_policy}'
```

Report only whether auth keys or auth environment-variable names are present;
never print npm configuration values, headers, token lists, or secret payloads.

## Gate a genuine release

Before tagging, require all of the following:

- real product demand and owner-approved release scope;
- a new SemVer version absent from npm;
- strict red → green → refactor implementation evidence;
- current changelog, docs, generated `dist/`, declarations, maps, manifest,
  license report, and size report;
- normal, color, TAP, and TAP+color gates from one exact target with matching
  required metrics;
- independent SDK review and fresh read-only Holm-authority acceptance for the
  release-bearing target, with no release-blocking finding;
- clean `main`, known upstream drift, and target available on `origin/main`;
- prepared package smoke and deterministic release assets; and
- no npm publish credential in repository files, GitHub secrets used by the
  workflow, local npm auth, or auth environment variables.

Set only non-secret identity values:

```bash
PACKAGE="$(node -p "require('./package.json').name")"
VERSION="$(node -p "require('./package.json').version")"
TAG="v$VERSION"
TARGET="$(git rev-parse HEAD)"
```

Distinguish an expected npm 404 from network/auth failure. If the version is
already public during initial preparation, stop; it is not a test fixture.

## Create and verify the immutable tag

1. Confirm `TARGET` is reviewed and on `origin/main`.
2. Confirm the active GitHub ruleset prevents deletion and all updates to
   `refs/tags/v*`.
3. Create annotated `TAG` at `TARGET` with a release-specific message.
4. Require `git cat-file -t "refs/tags/$TAG"` to equal `tag`.
5. Require `git rev-parse "$TAG^{}"` to equal `TARGET`.
6. Push without force, fetch/inspect the remote tag, and verify its peel again.

Never delete, recreate, or move a pushed release tag.

## Dispatch one release workflow

Re-read `.github/workflows/publish.yml`. It must remain:

- manual only and globally serial across release tags;
- SHA-pinned and GitHub-hosted with exact Node `24.8.0` / npm `11.6.0`;
- dispatch-SHA pinned, with the live annotated tag required to peel to that SHA;
- split into unprivileged validate, protected publish, and unprivileged verify
  jobs;
- bound to `npm-release` only in the publish job;
- limited to `actions: read`, `contents: write`, and `id-token: write` only in
  that job; `actions: read` verifies the accountable environment decision, and
  the job runs no dependency lifecycle or package import code;
- direct directory-spec `npm publish` only, with no stage or token path; and
- resumable only when an existing npm package is byte-identical.

Dispatch from the same immutable tag supplied as input:

```bash
gh workflow run publish.yml --ref "$TAG" -f tag="$TAG"
```

Locate the exact run by dispatch time, title, tag ref, and peeled target. Do not
choose a run merely because it is newest. Before asking for approval, restate:

- repository `holmhq/sdk`;
- workflow **Publish SDK release**;
- exact `TAG` and `TARGET`; and
- environment `npm-release`.

The owner approves that environment once. Before publishing, the workflow uses
`actions: read` to require at least one `state=approved` decision from
`jikkuatwork` and zero `state=skipped` decisions; repeated valid approvals from
a failed-job rerun remain acceptable. Independently inspect the immutable record:

```bash
gh api "repos/holmhq/sdk/actions/runs/$RUN_ID/approvals" \
  --jq '.[] | {state, actor: .user.login, environments: [.environments[].name]}'
```

Any missing, unexpected, or skipped decision is a stop condition. Monitor only
the exact run:

```bash
gh run watch "$RUN_ID" --exit-status
```

## Verify completion

Workflow success should already prove both registries. Independently sample live
state before reporting success:

1. npm exact version and `latest` equal `VERSION`;
2. npm shasum/integrity match prepared metadata;
3. npm provenance exists;
4. registry tarball bytes match the prepared tarball;
5. a clean registry consumer imports every export and `npm audit signatures`
   verifies signature/attestation;
6. annotated local and remote tag peels equal `TARGET`;
7. GitHub latest release is `TAG`; and
8. downloaded tarball, `SHA256SUMS`, and `dist-manifest.json` match prepared
   assets byte-for-byte.

Record run ID/URL, target/tag peel, npm integrity/checksums, and GitHub release
URL without storing credentials.

## Safe resumption

The process is not transactionally atomic. If npm succeeds and GitHub fails,
rerun the same workflow from the same tag.

The workflow may continue only when the public npm version's shasum, integrity,
provenance, and downloaded bytes match the locally prepared package. It then
skips npm publication and creates/verifies the missing GitHub Release. If a
GitHub Release already exists, its title, notes, state, and assets are
verification-only. Resume only the current partial release; an older tag must
not displace a newer npm/GitHub `latest`.

Stop on any mismatch. Never repair by moving the tag, publishing another payload
under the same version, editing/clobbering release assets, or adding a token.

## Failure rules

- **OIDC failure:** compare npm repository/workflow/environment/action and job
  permissions exactly; never fall back to a token.
- **Approval unavailable or skipped:** leave/cancel the run and repair
  protection; do not bypass it.
- **Version exists with different bytes:** stop permanently for that version.
- **Tag mismatch/lightweight tag:** stop; establish a new reviewed target when
  appropriate rather than weakening checks.
- **Validation or regeneration drift:** fix through normal TDD, regenerate, and
  renew target-specific review.
- **npm live, GitHub absent:** rerun the same immutable tag; do not republish.
- **GitHub asset mismatch:** stop; do not use `--clobber`.
- **Unknown UI/API behavior:** stop at the reversible boundary and preserve
  non-secret evidence.

## Close

At handoff:

- update release evidence, `koder/STATE.md`, and `koder/docs/EXECUTION.md`;
- preserve any unproven or blocked configuration item;
- use the repository `close` skill;
- commit/push only reviewed intentional work; and
- finish clean and synchronized.

After the next genuine direct release, replace “pending proof” with its exact
tag, target, run, npm integrity, and GitHub release evidence. Keep
`koder/skills/npm-release/` canonical; compatibility skill paths must remain
symlinks.
