---
title: W4 S07 - RC metadata, docs, upgrade and rollback contract
status: approved
issue: 017
plan: 004
slice: S07
type: implementation
queue_candidate: 005
owner: sdk-rc
created: 2026-07-17
updated: 2026-07-17
---

# Plan 004 S07: RC metadata, docs, upgrade and rollback contract

## User decisions captured

- The target is private `0.1.0-rc.1`, not publication, a tag, a release, a
  deploy, or production proof.
- v0.1-web is a scoped subset: stable root/core/transports/app/web/state/test;
  preview node/sobek; reserved bridge; unavailable admin/actions/generated CLI,
  realtime, collaboration, framework bindings, production desktop/mobile, and
  arbitrary SSR.
- Issue `#015` broad docs/migration closeout remains future; this slice writes
  only the RC-scoped docs/metadata needed for owner handoff and pilot readiness.

## Capability statement

Document and test the private v0.1-web RC support, vendoring, security,
upgrade, rollback, and compatibility contract without taking release actions or
closing broad foundation docs.

## Source and build-on checks

- Build on S01-S06 outputs, especially API manifest, preview/reserved labels,
  P3 dispositions, artifact manifests, and vendored fixture workflow.
- Read Issue `#017`, Issue `#014`, Issue `#015` non-goals, architecture
  `D013`/`D014`, `package.json`, examples README, root README if it already
  contains SDK usage, generated manifest/size/license reports, and package
  exports.
- Authority drift check: read-only Holm Issue `#534` at
  `fb34d6b768f15f9bc596e0b82430e5c678fd2088`; docs must preserve GET/POST as
  Holm's app wire contract and BFBB authored-web precedence.
- Confirm `package.json` remains private and any `0.1.0-rc.1` marker is metadata
  only unless the owner explicitly approves a version bump.

## Expected seams / files

- RC-scoped documentation under an existing docs/README/examples location or a
  compact new `koder`/docs artifact if repo convention prefers it; avoid broad
  Issue `#015` rewrite.
- Machine-readable metadata or tested docs text for `0.1.0-rc.1`, support
  matrix, stable/preview/reserved labels, immutable vendoring, hash
  verification, update/rollback, security notes, and migration boundaries.
- Docs/tests that reject mutable `@main`, publication language, unsupported
  surfaces, and pilot/browser-soak claims.
- `package.json` only if a private RC metadata field is required and reviewed;
  no publish config or release workflow.
- Generated `dist/**` only if source/build metadata changes require it.

## Red test or docs-first proof

First add a failing docs/metadata check that requires:

- `0.1.0-rc.1` to be described as private RC code/artifact state;
- exact stable/preview/reserved/unavailable support matrix;
- stable `0.1.x` compatibility rule and preview/reserved exemption;
- immutable SHA vendoring, hash verification, update, rollback, and security
  reporting notes;
- explicit no publish/tag/release/deploy/pilot/browser-soak claim;
- scoped v0.1-web docs that do not imply broad Issue `#015` closeout.

## Implementation boundary and generated artifacts

- Docs and metadata only, except small tests/scripts needed to enforce wording.
- Do not bump package version, create tags, add release workflows, publish,
  deploy, or push.
- Do not document admin, realtime, collaboration, framework bindings,
  production desktop/mobile, arbitrary SSR, or generated CLI as available.
- If docs require product behavior not implemented in S01-S06, stop and return
  to the owner/coordinator.
- Any public source/build metadata change owns generated artifacts and
  reproducibility checks.

## Validation commands

```bash
npm run test:examples
npm run test:dist
npm run test:declarations
npm run build
npm run check:repro
npm run size
npm run check:licenses
```

## Acceptance checklist

- [ ] RC docs/metadata say private `0.1.0-rc.1` and avoid all release actions.
- [ ] Support matrix exactly matches Issue `#017` stable/preview/reserved and
      unavailable lists.
- [ ] Stable `0.1.x` compatibility policy is documented: no breaking
      removal/rename/behavior change; additive only; deprecate before future
      removal; preview/reserved exempt.
- [ ] Usage examples cover stable v0.1-web/BFBB vendoring and package imports
      without claiming future surfaces.
- [ ] Vendoring, hash verification, update, rollback, and security notes use
      immutable commits/reviewed tags and reject `@main` for deployed apps.
- [ ] Docs state real app/browser soak and owner-present promotion are future
      gates.
- [ ] Broad Issue `#015` remains open and not claimed complete.

## Deferred / non-goals

- Final integrated CI/review/Holm acceptance (S08).
- Full README/API/framework/migration closeout for Issue `#015`.
- npm publication, release notes for a public release, tags, deploys, pilot
  execution, or production support claim.

## Estimate, risk, ambiguity, review posture

- Estimate: 60-90 minutes plus validation wall time.
- Risk: yellow; wording can accidentally imply a public release or broader
  support than v0.1-web.
- Ambiguity: exact metadata location should follow existing repo docs/tests; do
  not invent a release workflow.
- Review posture: docs/product review required; reviewer should check every
  support and non-goal sentence against Issue `#017`.

## Stop rules

Stop if a version bump/release action appears necessary, docs need unsupported
product promises, support matrix changes, immutable vendoring cannot be stated
honestly, Holm authority drifts, broad Issue `#015` starts to be rewritten, or
any publish/tag/push/deploy/credential/cloud/worktree/cross-repo action is
needed.
