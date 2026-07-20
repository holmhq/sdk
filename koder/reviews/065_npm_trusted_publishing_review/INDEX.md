---
status: pass
reviewer: harnex-cx-cr-065
date: 2026-07-20
base_commit: bbe2bb0e2afd69c11fab5af22d387e18dcfefb2f
target_commit: f1780e815d35f01218136c8f7c670d856af3d644
range: bbe2bb0..f1780e8
verdict: approve_with_p3_setup_advisory
p1: 0
p2: 0
p3: 1
---

# Review 065: npm trusted publishing workflow

## Verdict and counts

P1=0, P2=0, P3=1. The workflow is safe to push and structurally safe to register as a stage-only npm trusted publisher after the `npm-release` GitHub environment is protected. Do not approve any staged package until GitHub environment protection and the npm trusted-publisher fields below are exact.

## Finding

### P3-1: `npm-release` exists without protection rules

External setup evidence says the GitHub environment `npm-release` exists but has no protection rules yet. The workflow binds the job to that environment (`.github/workflows/publish.yml:23-24`), and the guide says to add required reviewers and tag/branch protection (`docs/releasing.md:13-18`). Without those rules, any repository actor who can dispatch the workflow and provide a valid annotated tag/version can mint the environment-scoped OIDC identity and stage a package. This is not P1/P2 because the workflow only runs `npm stage publish` (`.github/workflows/publish.yml:83-84`) and npm still requires browser WebAuthn approval before the package becomes public (`docs/releasing.md:75-77`). Add GitHub environment reviewers/protection before npm registration or before approving any staged package.

## Security and correctness assessment

- Publication is manual and stage-only: only `workflow_dispatch` with required `tag` input exists (`.github/workflows/publish.yml:4-10`), and the only npm submission is `npm stage publish . --access public --tag latest` (`.github/workflows/publish.yml:83-84`).
- I found no direct `npm publish`, no `npm stage approve`, and no `NPM_TOKEN`/`NODE_AUTH_TOKEN` fallback; the checker bans those patterns (`scripts/check-publish-workflow.mjs:40-47`).
- OIDC scope is minimal: permissions are `contents: read` plus `id-token: write` (`.github/workflows/publish.yml:12-14`), with exact `environment: npm-release` (`.github/workflows/publish.yml:23-24`).
- Runner/toolchain meet the stated floors: GitHub-hosted `ubuntu-latest`, Node 24, release cache disabled, and exact npm `11.15.0` with a version assertion (`.github/workflows/publish.yml:23,35-45`).
- Action refs are immutable SHA pins. Read-only authority checks confirmed `actions/checkout` `v7.0.0` -> `9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0` and `actions/setup-node` `v7.0.0` -> `820762786026740c76f36085b0efc47a31fe5020`, matching `.github/workflows/publish.yml:28-36`.
- The `tag` input is passed through `RELEASE_TAG`, not interpolated into shell source (`.github/workflows/publish.yml:47-50`); it is regex-constrained before git/npm use and later expansions are quoted (`.github/workflows/publish.yml:51-65`).
- Branch/lightweight/stale-target bypasses are covered by package-version equality, annotated-tag object check, HEAD-versus-peeled-tag equality, clean checkout status, and already-published-version rejection (`.github/workflows/publish.yml:57-67`).
- Audit, stale generated output, and stale package state do not bypass gates: the job runs `npm ci`, `npm audit --audit-level=high`, `npm run release:check`, then requires `git diff --exit-code` and clean status (`.github/workflows/publish.yml:69-81`).
- `prepublishOnly` still retains the canonical release gate (`package.json:91-92`), and `test:publish-workflow` is wired into full CI (`package.json:89,103`; `.github/workflows/ci.yml:29-30`).
- npm OIDC auto-detection should be used: no npm auth token variable is present, `id-token: write` is present, and the guide correctly notes OIDC is exchanged only during publish/stage operations (`docs/releasing.md:60-63`). `setup-node` only configures the registry here; it does not add a long-lived token.
- The checker is meaningful drift coverage: it asserts required workflow/guide strings (`scripts/check-publish-workflow.mjs:16-35,52-65`) and bans the main unsafe token/publish/approval/action-tag patterns (`scripts/check-publish-workflow.mjs:40-47`). It is still text-based, so future workflow diffs need human review rather than treating the checker as a formal YAML proof.
- The guide is operationally honest about setup fields, WebAuthn staging approval, first-use limitations, token revocation, failure recovery, and provenance (`docs/releasing.md:20-41,60-63,75-86,88-105`).

## Setup recommendation

Protect GitHub environment `npm-release` first, then configure npm Trusted Publisher -> GitHub Actions for `@holmhq/sdk` with exactly:

| npm field | Value |
| --- | --- |
| Organization or user | `holmhq` |
| Repository | `sdk` |
| Workflow filename | `publish.yml` |
| Environment name | `npm-release` |
| Allowed actions | `npm stage publish` only |

After the first successful OIDC stage, set npm package publishing access to "Require two-factor authentication and disallow tokens" and revoke remaining classic/granular publish tokens.

## Actual commands and exits

- `git rev-parse HEAD` -> exit 0, `f1780e815d35f01218136c8f7c670d856af3d644`.
- `git diff --check bbe2bb0..f1780e8` -> exit 0, no output.
- `npm run test:publish-workflow` -> exit 0, checker passed.
- `git ls-remote --tags https://github.com/actions/checkout.git refs/tags/v7.0.0` and `git ls-remote --tags https://github.com/actions/setup-node.git refs/tags/v7.0.0` -> exit 0, returned the pinned SHAs above.
- `git status --short --untracked-files=all` before writing this review -> exit 0, no product dirt.

## Exact-target gate

The reviewed HEAD exactly matched target commit `f1780e815d35f01218136c8f7c670d856af3d644`; base `bbe2bb0e2afd69c11fab5af22d387e18dcfefb2f` and range `bbe2bb0..f1780e8` matched the task. If HEAD or the target range changes, this review does not apply.
