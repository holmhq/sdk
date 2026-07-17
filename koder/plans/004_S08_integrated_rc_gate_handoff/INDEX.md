---
title: W4 S08 - Integrated RC gate and owner handoff
status: in_review
issue: 017
plan: 004
slice: S08
type: implementation
queue_candidate: 005
owner: sdk-rc
created: 2026-07-17
updated: 2026-07-17
---

# Plan 004 S08: Integrated RC gate and owner handoff

## User decisions captured

- The queue must stop at private `0.1.0-rc.1` code/artifact readiness and owner
  handoff; pilot, push, tag, publish, release, deploy, and promotion to `0.1.0`
  are separately authorized future steps.
- Integrated RC acceptance requires four CI modes with identical required
  metrics, clean reproducibility, declarations/dist/examples/size/license/API
  drift gates, independent SDK review with zero P1/P2, and fresh read-only Holm
  authority acceptance.
- Fresh Holm evidence must be read-only and pinned to a named Holm commit.

## Capability statement

Run the integrated RC validation, review, authority acceptance, clean-Git proof,
and owner handoff checklist that closes W4 implementation without starting the
pilot or release process.

## Source and build-on checks

- Build on completed S01-S07 implementation commits and their reviews if a queue
  uses per-slice review.
- Read Issue `#017`, Issue `#014` closure evidence from S05/S06, S01 API
  manifest, S03/S04 P3 disposition evidence, S07 docs/metadata, `package.json`,
  generated manifests/reports, and changed source/tests only as needed for
  integrated review.
- Authority drift check: read current committed Holm Issue `#534` with
  read-only `git -C /home/glasscube/Projects/holmhq/holm/master show
  <commit>:koder/issues/534_contract_first_holm_apps/INDEX.md`; compare against
  prior pin `fb34d6b768f15f9bc596e0b82430e5c678fd2088` and record the named
  Holm commit/version. Do not mutate or test Holm.
- Confirm Git is clean before final report except for owned review/handoff
  artifacts authorized by the queue/coordinator.

## Expected seams / files

- Integrated validation evidence, likely in a review artifact under
  `koder/reviews/` and/or final queue closeout if a future queue owns it.
- Issue `#014` status update only if S05/S06 fully satisfy its acceptance and
  the coordinator authorizes metadata closeout in the implementation window.
- Issue `#017` status/ledger update only if the owner/coordinator authorizes
  final metadata movement; otherwise leave handoff evidence for owner review.
- No product source changes unless a validation failure reveals a small owned fix
  that must be returned to the appropriate slice.
- Handoff checklist naming exact promotion/pilot next steps but not executing
  them.

## Red test or docs-first proof

Before final approval, create or require a failing integrated gate if any of the
following is absent: API drift gate, four CI modes, equal metrics, build
reproducibility, declarations, dist smoke, examples, size, license, private
package status, Issue `#014` closure evidence, Review `#033` P3 disposition,
independent SDK review, fresh Holm acceptance, clean Git, and stop-before-pilot
handoff.

## Implementation boundary and generated artifacts

- Prefer validation/review/handoff only. Product fixes discovered here should be
  small, owned, and routed back to the relevant S01-S07 seam; otherwise stop.
- No push, tag, npm publish, release, deploy, credential use, cloud/production
  mutation, worktree, or Holm write/test.
- Do not start real-app pilot, browser/vendor soak, promotion checklist
  execution, Issue `#015` broad closeout, or next roadmap issue.
- If generated output drifts, rebuild and own all affected JS, declarations,
  maps, manifests, package smokes, and size reports in the logical fix before
  rerunning gates.

## Validation commands

```bash
npm run ci
FORCE_COLOR=1 npm run ci
NODE_OPTIONS='--test-reporter=tap' npm run ci
FORCE_COLOR=1 NODE_OPTIONS='--test-reporter=tap' npm run ci
npm run build
git diff --exit-code --stat
npm run check:repro
npm run test:declarations
npm run test:dist
npm run test:examples
npm run size
npm run check:licenses
git status --short --untracked-files=all
```

Read-only Holm authority check command shape:

```bash
git -C /home/glasscube/Projects/holmhq/holm/master show <holm-commit>:koder/issues/534_contract_first_holm_apps/INDEX.md >/tmp/holm-534-rc-authority.txt
```

## Acceptance checklist

- [ ] S01-S07 are implemented, reviewed as required, and their validation gates
      are green.
- [ ] Four full CI modes pass with identical required metrics.
- [ ] API drift, declarations, dist, examples, package smoke, size, license,
      build, and reproducibility gates pass from a clean tree.
- [ ] `dist/` artifacts, manifests, source maps, declarations, and reports match
      committed source and private package status.
- [ ] Issue `#014` closure evidence exists through S05/S06 bundle and vendoring
      gates.
- [ ] Independent integrated SDK review reports zero P1/P2 findings.
- [ ] Fresh read-only Holm authority acceptance at a named Holm commit reports
      zero P1/P2 and no mapped drift contradicting v0.1-web RC claims.
- [ ] Git is clean after committed evidence.
- [ ] Owner handoff includes exact post-RC pilot/promotion checklist and an
      explicit stop before push/tag/publish/release/deploy.

## Deferred / non-goals

- Real-app pilot, browser/vendor soak, promotion to `0.1.0`, npm publication,
  tag, release, push, deploy, or production support claim.
- Broad Issue `#015` closeout, next roadmap issue, or Holm implementation.
- Fixing large late discoveries inside the gate instead of returning them to a
  bounded slice.

## Estimate, risk, ambiguity, review posture

- Estimate: 60-120 minutes plus full validation and review wall time.
- Risk: yellow/red due to full CI duration, generated artifact drift, and review
  dependency.
- Ambiguity: exact queue/review artifact paths depend on the future authorized
  W4 mode; this plan names required evidence, not orchestration mechanics.
- Review posture: independent integrated SDK review and independent/fresh
  Holm-authority acceptance are mandatory before owner handoff.

## Stop rules

Stop if any P1/P2 remains, four CI modes or metric equality fail, reproducibility
or clean Git cannot be proven, Holm authority drifts materially, Issue `#014`
acceptance is incomplete, a large product fix is needed, promotion/pilot/release
action is requested inside this gate, or any publish/tag/push/deploy/credential
/cloud/worktree/cross-repo action would be required.
