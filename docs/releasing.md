# Releasing with npm trusted publishing

Future npm releases use **stage-only** trusted publishing from GitHub Actions.
The workflow exchanges a GitHub OIDC identity for a short-lived npm credential,
stages an immutable package, and requires a maintainer to approve it on
[npmjs.com](https://www.npmjs.com) with WebAuthn before it becomes public.

This repository keeps no publish token: there is no `NPM_TOKEN`, no
`NODE_AUTH_TOKEN`, and no npm credential in GitHub secrets or repository files.

## One-time setup

### GitHub environment

Create the GitHub environment `npm-release`. Add required reviewers and tag or
branch protection appropriate to the organization. Disable **Allow
administrators to bypass configured protection rules** so a running deployment
cannot be mistaken for reviewer approval. The publishing job names this
environment exactly, so npm can bind its OIDC trust to the same deployment
boundary.

### npm trusted publisher

After `.github/workflows/publish.yml` exists on the default branch, open
`@holmhq/sdk` package settings on npm and configure **Trusted Publisher → GitHub
Actions** with these exact values:

| npm field | Value |
| --- | --- |
| Organization or user | `holmhq` |
| Repository | `sdk` |
| Workflow filename | `publish.yml` |
| Environment name | `npm-release` |
| Allowed actions | `npm stage publish` only |

The workflow field is only `publish.yml`, not the full `.github/workflows/`
path. Fields are case-sensitive, npm does not validate them when saved, and one
package can have only one trusted publisher.

After the first successful OIDC stage, set package **Publishing access** to
**Require two-factor authentication and disallow tokens**. Trusted publishers
continue to work because they use OIDC rather than traditional tokens. Revoke
all granular/classic publish tokens.

## Workflow security contract

`.github/workflows/publish.yml`:

- is manual `workflow_dispatch` only;
- runs on a GitHub-hosted `ubuntu-latest` runner;
- grants `contents: read` and the required `id-token: write` permission;
- uses SHA-pinned GitHub actions;
- disables dependency caching in the release job;
- uses Node 24 and exact npm `11.15.0` (the minimum staged-publishing release);
- checks out the requested immutable tag and requires it to be annotated;
- requires `vMAJOR.MINOR.PATCH` to equal `package.json` version;
- refuses an already-published version;
- runs locked install, audit, and `npm run release:check`;
- fails if release regeneration changes tracked files; and
- can only call `npm stage publish`, never direct publish or automated approval.

Trusted publishing itself requires npm 11.5.1 or later and Node 22.14.0 or
later. Staged publishing requires npm 11.15.0 or later. `npm whoami` cannot test
OIDC configuration because npm exchanges the identity only during publish or
stage operations.

## First proven OIDC release

Genuine `@holmhq/sdk@0.2.1` proved OIDC staging and publication on 2026-07-21:
annotated tag `v0.2.1` peels to
`81d5732f1ba71dcbe1d42a7fe52868dedada9e56`, GitHub Actions run
`29773856653` created npm stage `5194865d-de9e-4e92-b698-d0c5710e4553`, and npm
published signed provenance. Registry and GitHub release assets matched the
prepared tarball byte-for-byte.

The run also exposed one hardening gap: GitHub's approvals API recorded
`holmhq-admin` with `state=skipped`, not `state=approved`, because environment
admin bypass was enabled. The OIDC path is proven; the normal required-reviewer
path is not. Disable admin bypass and require an actual approval on the next
genuine release. Never create a dummy release to test it.

## Release procedure

1. Finish implementation, generated artifacts, docs, and migration evidence.
2. Obtain required independent SDK and Holm-authority reviews.
3. Run the normal, color, TAP, and TAP+color release gates from one exact target.
4. Create and push an immutable annotated tag matching `package.json`, for
   example `v0.3.0`.
5. In GitHub Actions, run **Stage npm release** and enter that exact tag.
6. Confirm the workflow checks out the peeled tag target, passes all gates, and
   reports a staged npm package. Query the run approvals API and require
   `state=approved` from the expected reviewer; `state=skipped` is an admin
   bypass, not approval.
7. On npmjs.com, use account avatar → **Staged Packages** (not the package
   **Settings** tab). Review package name, version, files, integrity/provenance,
   and source workflow, then click **Approve** and complete WebAuthn.
8. Verify npm `latest`, registry shasum/integrity, signature/attestation, and a
   clean registry install of every entry point.
9. Create or finalize the separate GitHub release with tarball, `SHA256SUMS`,
   and `dist-manifest.json`; download and compare every asset byte-for-byte.
10. Complete package-access and GitHub-environment hardening, then commit/push
    release state and close only with clean, synchronized Git.

The staging workflow does not create tags, GitHub releases, or public package
versions, and npm approval does not create a GitHub Release. After npm approval,
it is expected for npm to show the new version while GitHub temporarily shows
the previous release until step 9. Explain that interval before approval and do
not call the overall release complete until both registries verify. The workflow
cannot approve its own staged package.

## Failure and recovery

- **OIDC authentication failure:** compare npm's configured organization,
  repository, `publish.yml`, and `npm-release` values exactly. Confirm the job
  has `id-token: write` and uses a GitHub-hosted runner.
- **Version already exists:** never overwrite it. Bump to a new reviewed version
  and create a new tag.
- **Tag mismatch or lightweight tag:** stop; create the correct annotated tag
  from the reviewed target rather than weakening the workflow.
- **Validation or dirty regeneration failure:** do not stage. Fix through normal
  red → green → refactor and review, then use a new exact target/tag.
- **Staged package is wrong:** reject it on npmjs.com. Never approve first and
  attempt to repair the immutable public version afterward.
- **Approval unavailable:** leave or reject the stage; do not fall back to a
  long-lived bypass-2FA token merely to continue.
- **GitHub protection says skipped:** stop before npm approval. Record the run,
  disable administrator bypass with owner authorization, and do not call the
  required-reviewer gate proven.
- **npm is new but GitHub still shows the prior release:** do not rerun staging
  or move the tag. Verify npm, then create the separate GitHub Release from the
  existing immutable tag and verify its assets.

GitHub trusted publishing automatically supplies npm provenance for this public
package from this public repository. No explicit `--provenance` flag is needed.
