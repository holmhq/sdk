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

- This is a **candidate** runbook until the first genuine release succeeds
  end-to-end through npm OIDC. A static check or dummy package is not proof.
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
`TAG`, and the expected workflow. A successful workflow means **staged**, not
published. Confirm the logs show `npm stage publish` and no direct publication.

## Approve on npm

Guide the owner to npm's **Staged Packages** page one action at a time. Before
approval, compare the staged package against the prepared evidence:

- package is exactly `@holmhq/sdk`;
- version is exactly `VERSION` and is not already public;
- source repository, workflow, environment, commit/tag, and provenance match;
- file list, packed size, integrity, and checksums match expected artifacts;
- no unexpected package contents or dist drift exists.

Reject a mismatched stage. If correct, ask the owner to click **Approve** and
complete WebAuthn locally. Never request ceremony output. Do not claim public
success until registry verification passes.

## Verify publication and release assets

Follow `docs/releasing.md` and the active release evidence. At minimum:

1. Verify npm `latest`, exact version, shasum, integrity, and provenance.
2. Download the registry tarball into a fresh temporary directory and compare
   it byte-for-byte/checksum-for-checksum with the reviewed prepared tarball.
3. Install from the registry in a clean consumer and import every exported entry
   point; run release-specific smoke assertions.
4. Create or finalize the GitHub release only from the immutable tag and
   prepared tarball, `SHA256SUMS`, and `dist-manifest.json`.
5. Download every GitHub release asset and verify it byte-for-byte against the
   prepared artifacts.
6. Record exact commit, tag peel, workflow run, npm version/integrity, checksums,
   smoke results, and release URL without storing credentials or private data.

## Complete first-stage hardening

Only after the first genuine OIDC stage and public verification succeed:

1. Return to `@holmhq/sdk` package access in npm.
2. Confirm the trusted publisher still shows `holmhq/sdk`, `publish.yml`,
   `npm-release`, and only `npm stage publish`.
3. Select **Require two-factor authentication and disallow tokens**.
4. Click **Update Package Settings** and complete owner authentication.
5. Confirm all classic/granular access tokens are absent and local npm CLI auth
   remains removed. Do not create a token to test the new setting.

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

After the first successful genuine OIDC release, revise this runbook with the
observed GitHub/npm screens, wait states, verification commands, and recovery
facts. Replace the candidate statement in both this file and `SKILL.md` with the
proven tag and workflow run evidence only after reviewing that update. Keep one
canonical skill directory; compatibility locations must remain symlinks.
