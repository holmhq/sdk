# Holm SDK npm Release Runbook

## Contents

1. [Status and authority](#status-and-authority)
2. [Interaction contract](#interaction-contract)
3. [Load live facts](#load-live-facts)
4. [Route the request](#route-the-request)
5. [Gate a genuine release](#gate-a-genuine-release)
6. [Create the immutable tag](#create-the-immutable-tag)
7. [Stage through GitHub OIDC](#stage-through-github-oidc)
8. [Approve on npm](#approve-on-npm)
9. [Verify publication and release assets](#verify-publication-and-release-assets)
10. [Complete first-stage hardening](#complete-first-stage-hardening)
11. [Failure and recovery](#failure-and-recovery)
12. [Close and mature this skill](#close-and-mature-this-skill)

## Status and authority

- This runbook is **proven for OIDC staging and publication** by genuine release
  `@holmhq/sdk@0.2.1`, annotated tag `v0.2.1` at
  `81d5732f1ba71dcbe1d42a7fe52868dedada9e56`, GitHub Actions run
  `29773856653`, and npm stage `5194865d-de9e-4e92-b698-d0c5710e4553`.
- The first run did not prove the normal required-reviewer path: GitHub recorded
  `holmhq-admin` with approval `state=skipped` because environment admin bypass
  was enabled. Treat that as a hardening finding, never as reviewer approval.
- Treat `docs/releasing.md` as the detailed release source of truth. Read it
  completely on every release. Treat `.github/workflows/publish.yml` and live
  npm/GitHub state as executable authority.
- Read `koder/STATE.md` and `koder/docs/EXECUTION.md` before acting. Load only the
  active release issue, plan, evidence, and reviews they identify.
- Require explicit owner authorization for release-side external mutations:
  pushing commits or tags, dispatching the workflow, approving an environment,
  approving an npm stage, changing npm settings, or creating a GitHub release.
- Never create a dummy version, move an immutable tag, overwrite a published
  version, weaken a failed gate, or fall back to a long-lived npm token.
- Keep Holm and every repository other than this SDK read-only unless the owner
  separately authorizes a write.

## Interaction contract

When an owner must use GitHub or npm in a browser:

1. Give exactly **one small action** at a time.
2. Wait for the owner to report the result or provide a screenshot.
3. Inspect that result before giving the next action.
4. Before an irreversible click, restate the expected package, version, tag, or
   setting and ask for only that click.
5. Never ask the owner to paste a token, password, OTP, recovery code, security
   key response, cookie, or WebAuthn material into chat.
6. Never automate the owner's WebAuthn ceremony or bypass the protected GitHub
   environment. Record outcomes, not private browser payloads or screenshots.
7. Name the exact destination before asking for a click. npm's staged queue is
   under the account-avatar **Staged Packages** item, not the package's
   **Settings** tab.
8. If the owner advances past a requested inspection, do not retroactively claim
   it happened. Re-read live state, verify every still-verifiable invariant, and
   record the skipped checkpoint as a process deviation.

Use read-only CLI/API checks around browser steps when available. npm does not
currently expose the package's trusted-publisher configuration through public
`npm view`; accept the owner's UI transcription until a real OIDC stage proves
that binding.

## Load live facts

Read these files before selecting a phase:

- `koder/STATE.md`
- `koder/docs/EXECUTION.md`
- `docs/releasing.md` in full
- `.github/workflows/publish.yml`
- `package.json`
- the active release evidence and exact-target reviews only

Inspect, without repairing drift automatically:

```bash
git status --short --untracked-files=all
git branch --show-current
git log --oneline -5
git rev-list --left-right --count '@{u}'...HEAD
node -p "require('./package.json').name + '@' + require('./package.json').version"
gh workflow view publish.yml
```

Do not print npm configuration values, authentication headers, environment
values, or token-list payloads. It is safe to report only whether expected auth
keys or auth environment-variable names are present.

## Route the request

- **Setup or audit:** verify the GitHub environment, trusted publisher, token
  absence, and local logout. Do not dispatch a workflow.
- **Prepare a release:** proceed through exact-target gates, then stop before
  each external mutation unless release authorization already covers it.
- **Stage a reviewed release:** re-run live preflight; do not rely on a previous
  session's clean tree, reviews, tag, or unpublished-version result.
- **Resume a pending stage:** identify the exact GitHub run and npm staged
  package before continuing. Never assume the newest item is the intended one.
- **Troubleshoot:** preserve the failed run/stage as evidence and use the failure
  rules below. Do not substitute direct `npm publish`.
- **Already-published current version:** stop. A future real change needs a new
  reviewed version and tag; the current version is not a test fixture.

The configured one-time identity must remain exact:

| Boundary | Required value |
| --- | --- |
| GitHub repository | `holmhq/sdk` |
| GitHub environment | `npm-release` |
| Deployment refs | tags matching `v*`; the workflow further requires exact `vMAJOR.MINOR.PATCH` |
| npm organization/user | `holmhq` |
| npm repository | `sdk` |
| npm workflow filename | `publish.yml` |
| npm environment | `npm-release` |
| npm allowed action | **`npm stage publish` only** |

The environment must have an accountable required reviewer. Read the current
approved reviewer from live GitHub and `koder/STATE.md`; do not silently replace
that identity.

## Gate a genuine release

Do not tag or dispatch until all of these are true:

- The release satisfies actual product demand and has an owner-approved scope.
- `package.json` has a new semver version and the matching version is absent
  from npm. Distinguish an expected not-found result from network/auth failure.
- Implementation followed repository TDD requirements; docs, changelog,
  generated `dist/`, declarations, maps, package smoke, size, license, audit,
  and reproducibility outputs are current.
- Normal, color, TAP, and TAP-with-color release gates passed from one exact
  target with matching required metrics.
- Independent SDK review and fresh read-only Holm-authority acceptance apply to
  that exact target, with no unresolved release-blocking findings.
- The tree and index are clean, the branch is `main`, upstream drift is known,
  and the reviewed target is available on `origin/main`.
- Prepared tarball, manifest, checksums, expected entry-point imports, and
  release notes are pinned to that exact target.
- No npm publish credential exists in repository files, GitHub secrets used by
  this workflow, local auth configuration, or auth environment variables.

Run `npm run release:check` and every additional exact-target mode required by
current release evidence. If regeneration dirties the tree, stop and fix it
through normal review; never stage stale output.

Set and print only non-secret release identity values:

```bash
PACKAGE="$(node -p "require('./package.json').name")"
VERSION="$(node -p "require('./package.json').version")"
TAG="v$VERSION"
TARGET="$(git rev-parse HEAD)"
```

Check npm and local/remote tag state immediately before tagging. If the version
is already public, stop. If the tag already exists, verify its annotated object,
peeled target, review evidence, and remote state before deciding whether this is
an authorized resume; never move or recreate a pushed release tag.

## Create the immutable tag

After the owner authorizes the genuine release and the gate is green:

1. Confirm `TARGET` is the exact reviewed commit and is on `origin/main`.
2. Create an annotated `TAG` at `TARGET`, with a release-specific message.
3. Verify `git cat-file -t "refs/tags/$TAG"` returns `tag` and its peeled target
   equals `TARGET`.
4. Push the immutable tag without force.
5. Fetch/inspect the remote tag and verify its peeled target again.

Never use a lightweight tag, `--force`, tag deletion/replacement, or a mutable
branch as the package identity.

## Stage through GitHub OIDC

Re-read `.github/workflows/publish.yml` before dispatch. It must remain manual,
stage-only, SHA-pinned, GitHub-hosted, bound to `npm-release`, and limited to
`contents: read` plus `id-token: write`. It must contain no direct publish,
automated stage approval, or token fallback.

The protected environment accepts only `v*` tag refs, so dispatch the workflow
**from the same immutable tag** supplied as its input. In the GitHub UI, set
**Use workflow from** to `TAG`; with explicit dispatch authorization, run only:

```bash
gh workflow run publish.yml --ref "$TAG" -f tag="$TAG"
```

Verify the dispatch ref and input are identical before approving the environment.
Locate the exact run by workflow, dispatch time, actor, and run title/input;
record its immutable run ID and URL. Do not select a run merely because it is
newest. Monitor that run with `gh run watch RUN_ID --exit-status`.

When it waits on `npm-release`, use the browser interaction contract. Ask the
owner to approve only after confirming the run is for `holmhq/sdk`, the exact
`TAG`, and the expected workflow. After the environment decision, inspect its
immutable API record rather than inferring approval from a running job:

```bash
gh api "repos/holmhq/sdk/actions/runs/$RUN_ID/approvals" \
  --jq '.[] | {state, actor: .user.login, environments: [.environments[].name]}'
```

Require `state=approved` from the expected accountable reviewer. `state=skipped`
means an administrator bypassed protection; it is not approval. Stop before npm
approval, record the deviation, and harden the environment rather than calling
the reviewer gate proven. The `v0.2.1` run demonstrated that a skipped decision
can still let the job stage successfully when `can_admins_bypass` is enabled.

A successful workflow means **staged**, not published. Confirm the logs show
`npm stage publish`, signed provenance, a stage ID, and no direct publication.
Expect `npm stage publish` to invoke `prepublishOnly`, so the canonical release
gate may run a second time during staging.

## Approve on npm

Guide the owner through account avatar → **Staged Packages** one action at a
time. Do not send them to the package **Settings** tab for the staged queue;
Settings owns trusted-publisher and package-access controls. Before approval,
compare the staged package against the prepared evidence:

- package is exactly `@holmhq/sdk`;
- version is exactly `VERSION` and is not already public;
- source repository, workflow, environment, commit/tag, and provenance match;
- file list, packed size, integrity, and checksums match expected artifacts;
- no unexpected package contents or dist drift exists.

Reject a mismatched stage. If correct, ask the owner to click **Approve** and
complete WebAuthn locally. Never request ceremony output. Do not claim public
success until registry verification passes. If approval happens before the
requested inspection, say so explicitly and perform the strongest possible
post-publication byte, identity, provenance, and smoke verification; those checks
do not rewrite history into a pre-approval review.

## Verify publication and release assets

Follow `docs/releasing.md` and the active release evidence. npm publication and
the GitHub Release are separate external mutations: neither `npm stage publish`
nor npm stage approval creates a GitHub Release. It is therefore expected for
npm to show the new version while GitHub still shows the previous release
between steps 3 and 4. Explain that temporary divergence before npm approval,
and do not call the overall release complete until both sides verify.

At minimum:

1. Verify npm `latest`, exact version, shasum, integrity, and provenance.
2. Download the registry tarball into a fresh temporary directory and compare
   it byte-for-byte/checksum-for-checksum with the reviewed prepared tarball.
3. Install from the registry in a clean consumer, import every exported entry
   point, run release-specific smoke assertions, and run `npm audit signatures`
   to verify the registry signature and attestation.
4. Create or finalize the GitHub release only from the immutable tag and
   prepared tarball, `SHA256SUMS`, and `dist-manifest.json`.
5. Download every GitHub release asset and verify it byte-for-byte against the
   prepared artifacts; query `repos/holmhq/sdk/releases/latest` to verify the
   latest release. Do not request unsupported `gh release view --json isLatest`.
6. Record exact commit, tag peel, workflow run, npm version/integrity, checksums,
   smoke results, and release URL without storing credentials or private data.

Keep the irreversible `gh release create --verify-tag ...` call separate from
subsequent verification commands. If a verification command fails after create,
re-read live release state before retrying; the release may already exist.

## Complete first-stage hardening

Only after the first genuine OIDC stage and public verification succeed:

1. Return to `@holmhq/sdk` package access in npm.
2. Confirm the trusted publisher still shows `holmhq/sdk`, `publish.yml`,
   `npm-release`, and only `npm stage publish`.
3. Select **Require two-factor authentication and disallow tokens**.
4. Click **Update Package Settings** and complete owner authentication.
5. Confirm all classic/granular access tokens are absent and local npm CLI auth
   remains removed. Do not create a token to test the new setting.
6. Inspect GitHub environment `npm-release`. Require the named reviewer and tag
   policy to remain exact, and disable **Allow administrators to bypass
   configured protection rules** (live API field `can_admins_bypass`) with
   explicit owner authorization. A future genuine release—not a dummy—must
   prove an actual `state=approved` reviewer decision.

Perform those browser actions one at a time. If the first OIDC stage has not
succeeded, leave publishing access at its existing setting and preserve this
follow-up in `koder/STATE.md`.

## Failure and recovery

- **OIDC failure:** compare organization, repository, `publish.yml`,
  `npm-release`, allowed action, runner, and `id-token: write` exactly. Stop;
  never add `NPM_TOKEN` or publish directly.
- **Version exists:** never overwrite it. Prepare a new genuine version through
  implementation, gates, and reviews.
- **Wrong/lightweight/stale tag:** stop. Do not weaken checks or move a pushed
  tag; establish a new reviewed release target when necessary.
- **Validation or regeneration failure:** do not stage. Fix, regenerate, rerun
  all affected gates, and renew reviews when the target changes.
- **Environment approval unavailable:** leave or cancel the run. Do not bypass
  protection.
- **Environment decision is `state=skipped`:** an admin bypass occurred. Do not
  report reviewer approval or continue to npm approval; preserve the exact run
  and harden `can_admins_bypass` before a future genuine release.
- **npm is current but GitHub still shows the prior release:** this is expected
  only during the documented post-publication/pre-GitHub-release interval.
  Verify npm first, create the GitHub Release from the existing tag, and verify
  assets; never rerun staging or move the tag to reconcile the display.
- **Wrong staged package:** reject it on npm. Never approve then repair an
  immutable public version.
- **WebAuthn unavailable:** leave or reject the stage. Never issue a bypass-2FA
  token merely to continue.
- **Unknown UI or API behavior:** stop at the reversible boundary, capture only
  non-secret evidence, and update the runbook after the behavior is understood.

## Close and mature this skill

At release hand-off:

- update release evidence, `koder/STATE.md`, and `koder/docs/EXECUTION.md`;
- preserve the next stop gate rather than beginning unrelated capability work;
- use the repository `close` skill and finish with clean Git;
- report remote drift separately and push only when authorized.

The first successful genuine OIDC release is recorded above. Future releases
should update this runbook only for newly observed behavior, without erasing the
`v0.2.1` proof or its admin-bypass caveat. Keep one canonical skill directory;
compatibility locations must remain symlinks.
