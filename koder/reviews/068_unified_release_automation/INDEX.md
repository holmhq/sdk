---
status: approved
priority: P1
created: 2026-07-21
review_kind: independent_release_security_review
base_head: 35a58560145386b7b8d0bdfaf050ff2b07eabe93
verdict: APPROVE
p1: 0
p2: 0
p3: 1
p3_status: remediated_after_approval
reviewer: claude-code
---

# Review 068: Unified npm and GitHub release automation

## Scope

Independent adversarial review of the uncommitted change replacing the staged
npm flow with one protected GitHub approval and one workflow that validates,
publishes npm through OIDC, creates the GitHub Release, and verifies both.

Reviewed surfaces:

- `.github/workflows/publish.yml`
- `scripts/check-publish-workflow.mjs`
- `scripts/prepare-release-assets.mjs`
- `docs/releasing.md`
- `koder/skills/npm-release/`

The reviewer was read-only and did not modify files, GitHub/npm settings, tags,
packages, releases, credentials, or external repositories.

## Review rounds and remediation

The first adversarial pass requested changes with `P1=1 P2=3 P3=4`. It found:

- dispatch approval was not bound to `GITHUB_SHA` if a tag moved;
- dependency scripts ran while `id-token: write` was available;
- tarball-spec provenance was unproven and could fail after publication;
- floating Node 24 could break byte-identical resumption;
- workflow checker trigger/publish matching was incomplete;
- per-tag concurrency allowed cross-version races;
- existing GitHub Release metadata was under-verified; and
- retry/latest behavior needed clearer boundaries.

Remediation pinned dispatch SHA and exact Node/npm, split validate/publish/verify
jobs, confined OIDC and release write authority to the protected mutation job,
changed direct publication to directory-spec `npm publish`, repacked and compared
before mutation, made concurrency global, hardened the checker, and verified
release title/notes/state/assets.

Later passes exposed and drove fixes for:

- release notes accepted only from the untrusted validation artifact;
- newline-capable artifact metadata written to `GITHUB_OUTPUT`;
- absent-version npm output handling;
- implicit tag fetching and no live tag-ruleset assertion;
- non-exact release asset sets and checksum sets;
- approval bypass detection being post-hoc rather than pre-publish;
- checkout-free final `gh` commands lacking repository context; and
- ruleset pagination/strict bypass field handling.

The final independent gate returned **APPROVE, P1=0 P2=0 P3=1**. Its sole P3 was
a cosmetic error-reporting edge if `spawnSync` could not start; that edge was
then remediated without changing release semantics.

## Final security assessment

- Workflow triggers are exactly manual `workflow_dispatch`; all releases share
  one non-cancelling concurrency group.
- Validate and verify jobs have only `contents: read`. The protected publish job
  alone has `actions: read`, `contents: write`, `id-token: write`, and environment
  `npm-release`.
- The publish job executes no dependency install, package lifecycle, package
  import, or repository script. It uses exact Node `24.8.0` / npm `11.6.0`.
- Both source checkouts use dispatch-pinned `github.sha`, explicit tag fetching,
  no persisted credentials, and require the annotated input tag to peel to the
  same commit.
- The publish job verifies live ruleset `Immutable SDK release tags`, requires
  zero bypass actors/excludes, checks deletion/update/non-fast-forward rules,
  and checks the remote tag peel before mutations.
- Before npm publication, the workflow requires at least one `state=approved`
  `npm-release` decision from `jikkuatwork` and zero `state=skipped` decisions.
- Prepared tarball, manifest, checksums, and notes are independently rederived or
  repacked in the protected job before direct directory-spec publication.
- Existing npm versions are accepted only for same-tag resumption when version,
  latest tag, shasum, integrity, provenance, and downloaded bytes match.
- GitHub Release identity, notes, draft/prerelease state, exact asset set, and
  every asset byte are verified. Existing releases are never edited/clobbered.
- Final package imports and signature/attestation checks run without OIDC or
  release-write authority.

## Live configuration evidence

Read-only post-mutation verification recorded:

- GitHub environment `npm-release`: `can_admins_bypass=false`, required reviewer
  `jikkuatwork`, deployment policy `v*`.
- Active ruleset ID `19324891`, name `Immutable SDK release tags`, target `tag`,
  no bypass actors/excludes, and deletion/update/non-fast-forward rules for
  `refs/tags/v*`.
- Historical run `29773856653` yields `approved=0 skipped=1`; the new approval
  gate rejects that exact bypass shape.
- Upstream SHA pins verified read-only: checkout/setup-node `v7.0.0`,
  upload-artifact `v4.6.2`, download-artifact `v4.3.0`.

npm still requires an owner-side trusted-publisher update from
`npm stage publish` to **`npm publish` only**, plus Publishing access
**Require two-factor authentication and disallow tokens**. No workflow was
dispatched and no package/release version was created to test this change.

## Gate evidence

- Strict red: the upgraded workflow checker failed against the old staged flow.
- Green: `npm run test:publish-workflow`.
- `npm ci --ignore-scripts`, `npm audit --audit-level=high`, and
  `npm run release:check` passed.
- Release check retained 230 source tests, 25 dist tests, 267 reproducible
  artifacts, `100.00` changed-reachable coverage, and size
  `296327` raw / `226159` minified / `58504` gzip.
- YAML parsing and `bash -n` passed for every workflow shell block.
- Protected-job changelog-note rederivation and exact npm repack comparison pass.
- `git diff --check` passes.

## Verdict

**APPROVE.** No unresolved P1, P2, or P3 finding remains. The code and GitHub
protection side are ready. Do not dispatch a release until npm's trusted
publisher allows exactly `npm publish`; prove the unified flow only with the
next genuine release.
