# Releasing with one protected OIDC workflow

Future npm and GitHub releases use one manual GitHub Actions workflow. After an
immutable reviewed tag exists, the owner gives a single protected GitHub approval.
One workflow validates the tag without publish authority, publishes directly to
npm through OIDC in one protected job, then verifies both registries without
publish authority.

The repository keeps no publish token: there is no `NPM_TOKEN`, no
`NODE_AUTH_TOKEN`, and no npm credential in GitHub secrets or repository files.

## One-time configuration

### GitHub environment

Environment `npm-release` must have all of these settings:

- required reviewer `jikkuatwork` (or a later explicitly approved accountable
  replacement);
- deployment refs limited to tags matching `v*`;
- **Allow administrators to bypass configured protection rules** disabled; and
- an active repository tag ruleset that blocks deletion and all updates
  (including non-fast-forward updates) for `refs/tags/v*` while still allowing
  new release tags.

Only the mutation job names this environment. Its approval is the one human
release gate. Before any registry mutation, the job queries GitHub's approvals
API and requires a `state=approved` decision from `jikkuatwork` with no
`state=skipped` administrator bypass. Re-running failed jobs may retain more
than one valid approval record, so the gate accepts one or more. Operators should independently sample the
same record after the run.

### npm trusted publisher

In `@holmhq/sdk` package settings, configure **Trusted Publisher → GitHub
Actions** with these exact values:

| npm field | Value |
| --- | --- |
| Organization or user | `holmhq` |
| Repository | `sdk` |
| Workflow filename | `publish.yml` |
| Environment name | `npm-release` |
| Allowed actions | **`npm publish` only** |

The workflow field is only `publish.yml`, not the full `.github/workflows/`
path. Fields are case-sensitive, and npm does not validate them when saved.
Remove the former `npm stage publish` permission rather than allowing both.

Set package **Publishing access** to
**Require two-factor authentication and disallow tokens**. Trusted publishing
remains available because it uses a
short-lived OIDC identity rather than a classic or granular token.

## Workflow security contract

`.github/workflows/publish.yml`:

- is manual `workflow_dispatch` only and serializes all release tags;
- uses SHA-pinned GitHub actions on GitHub-hosted `ubuntu-latest` runners;
- denies permissions by default and splits work into three jobs:
  1. **validate** has only `contents: read`, installs with
     `npm ci --ignore-scripts`, runs audit/release gates, and uploads exact
     prepared assets;
  2. **publish** alone uses environment `npm-release`, `actions: read`,
     `contents: write`, and `id-token: write`; `actions: read` is used only to
     require the accountable environment approval before mutation, and the job
     runs no dependency lifecycle/package code; and
  3. **verify** has only `contents: read` and performs clean installation,
     export imports, registry signature checks, and final cross-registry checks;
- pins Node `24.8.0` and its bundled npm `11.6.0` exactly in every relevant job;
- checks out dispatch-pinned `GITHUB_SHA`, compares it to `HEAD`, and separately
  requires the current annotated input tag to peel to that same commit;
- requires workflow ref, input tag, and `package.json` version to agree exactly;
- fails if release regeneration changes tracked files;
- creates the tarball, changelog notes, manifest copy, and `SHA256SUMS`
  deterministically, then repacks and byte-compares before publication;
- invokes exactly one directory-spec `npm publish` command and has no
  staged-publishing or token fallback path;
- verifies npm version, `latest`, shasum, integrity, provenance, and tarball
  bytes before creating the GitHub Release;
- creates the GitHub Release only from the existing tag and prepared assets;
- verifies release title, notes, state, the exact three-asset set, and every
  downloaded byte; and
- performs final installation/signature/attestation checks outside the OIDC job.

Trusted publishing requires npm 11.5.1 or later and Node 22.14.0 or later. Exact
Node `24.8.0` bundles npm `11.6.0`, satisfying those floors without installing
registry-hosted CLI code inside the OIDC-authorized job. `npm whoami` cannot test
OIDC configuration because npm exchanges the identity only during publication.

## Release procedure

1. Finish implementation, generated artifacts, changelog, docs, and evidence.
2. Obtain the required independent SDK and fresh Holm-authority reviews.
3. Run normal, color, TAP, and TAP+color release gates from one exact target.
4. Create and push an immutable annotated tag matching `package.json`, for
   example `v0.3.0`.
5. Dispatch **Publish SDK release** with both **Use workflow from** and the `tag`
   input set to that exact tag.
6. Confirm repository, workflow, tag, peeled commit, and environment, then
   approve `npm-release` once in GitHub.
7. Wait for the job to verify npm and the GitHub Release. Success means both are
   live and byte-identical to the reviewed package.
8. Record the tag, target, run ID, npm integrity, checksums, and release URL;
   close only with clean synchronized Git.

There is no npm Staged Packages/WebAuthn approval in this flow. npm and GitHub
are still not transactionally atomic, but the workflow is safely resumable.
Do not queue multiple release tags: GitHub concurrency intentionally serializes
releases, and additional pending runs may replace an older pending run.

## Safe resumption

A run may publish npm successfully and then fail before creating the GitHub
Release. Rerun the same workflow from the same immutable tag:

- if npm does not contain the version, the job publishes it;
- if npm already contains byte-identical shasum, integrity, provenance, and
  tarball bytes, the job skips publication and resumes verification/release;
- if any npm identity or byte differs, the job stops without touching GitHub;
- if the GitHub Release already exists, the job does not edit or overwrite it;
  it verifies title, notes, state, and assets;
- a missing or mismatched asset is a stop condition, not permission to clobber
  an immutable release.

Resumption is for the current partially completed release. Once a newer release
is `latest`, do not rerun an older tag: its `latest` checks intentionally fail
rather than mutating current distribution state. Never move a pushed tag,
overwrite a version, rerun from another commit, or use a token to recover a
partial release.

## Proven history and remaining proof

Genuine `@holmhq/sdk@0.2.1` proved the repository/npm OIDC identity using
annotated tag `v0.2.1`, GitHub Actions run `29773856653`, and npm stage
`5194865d-de9e-4e92-b698-d0c5710e4553`. Registry and GitHub assets matched the
prepared tarball byte-for-byte, with verified signature and SLSA provenance.

That historical run used staged publishing and GitHub recorded environment
`state=skipped` by `holmhq-admin` because administrator bypass was enabled. It
proves OIDC publication, but not normal reviewer approval. The unified direct
publish-and-release workflow must be proven only by the next genuine release
after npm allows `npm publish`, GitHub admin bypass is disabled, and immutable
`v*` tag rules are active. Never create a dummy release for proof.

## Failure and recovery

- **OIDC authentication failure:** compare npm organization, repository,
  `publish.yml`, `npm-release`, allowed action `npm publish`, runner, and
  `id-token: write` exactly. Stop; never add a token.
- **Environment decision is skipped:** stop. Disable administrator bypass and
  require the accountable reviewer on a future genuine run.
- **Version exists with different bytes:** stop permanently for that tag/version.
  Do not overwrite it or create a GitHub Release that implies a match.
- **Tag mismatch, movement, or lightweight tag:** stop; do not weaken dispatch
  SHA/tag checks or the immutable-tag ruleset.
- **Validation or dirty regeneration failure:** fix through normal TDD and
  review, then create a new exact target/tag as appropriate.
- **npm succeeds and GitHub fails:** rerun the same tag; the byte-identity guard
  resumes without republishing.
- **Existing GitHub Release differs:** stop. Never use `--clobber`, move the tag,
  or silently replace immutable assets.
- **Unknown API/UI behavior:** stop at the reversible boundary, preserve only
  non-secret evidence, and update this guide after the behavior is understood.
