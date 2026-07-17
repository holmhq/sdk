---
title: W4 S04 - Remaining edge-contract P3 disposition
status: approved
issue: 017
plan: 004
slice: S04
type: implementation
queue_candidate: 005
owner: sdk-rc
created: 2026-07-17
updated: 2026-07-17
---

# Plan 004 S04: Remaining edge-contract P3 disposition

## User decisions captured

- Review `#033` advisories 5-9 must not linger ambiguously into the v0.1-web RC.
- Safe defects should be fixed and tested; intentional behavior should be
  documented with rationale.
- Stable entry-point compatibility remains protected by S01; preview/reserved
  boundaries remain protected by S02.

## Capability statement

Resolve the remaining Review `#033` edge-contract advisories so every advisory
is either fixed, tested, documented, or explicitly accepted before RC gating.

## Source and build-on checks

- Read Review `#033` advisories 5-9, S01/S02/S03 outputs if implemented,
  `src/test/index.ts`, `src/core/extensions.ts`, `src/core/correlation.ts`,
  relevant source tests, type tests, and docs/examples as needed.
- Authority drift check: read-only Holm Issue `#534` at
  `fb34d6b768f15f9bc596e0b82430e5c678fd2088`; confirm no GET/POST contract
  change affects request-ID or extension namespace decisions.
- Confirm no new dependency, version bump, queue/state/execution edit, or
  release action is needed.

## Expected seams / files

- Test title/wording fix for the overstated sensitivity test (advisory 5).
- Test-only surface fix or accepted rationale for live internal arrays returned
  behind readonly getters in `src/test/index.ts` (advisory 6).
- Extension namespace validation tests/source fix for `__proto__`,
  `constructor`, and any equivalent object-prototype hazards (advisory 7).
- Request-ID reuse semantics documentation/test for the 1024-entry terminal
  duplicate window (advisory 8).
- Whitespace-padded response request-ID behavior test and decision: normalize
  safely if compatible, or keep fail-closed and document why (advisory 9).
- Generated `dist/**` and reports for any public source change.

## Red test or docs-first proof

First add failing assertions or docs checks that enumerate advisories 5-9 by
number and expected disposition:

- The sensitivity test title no longer claims a property it does not test.
- Test adapter readonly getters cannot expose mutable internal arrays, or the
  test-only risk is explicitly accepted in a durable note.
- Prototype-reserved extension namespace names fail construction.
- Request-ID duplicate-window behavior is documented as intentional fail-closed
  semantics.
- Padded response `requestId` behavior is either accepted fail-closed or
  normalized consistently with tests.

## Implementation boundary and generated artifacts

- Keep changes small and contract-focused; do not redesign extension graphs,
  request correlation, terminal tracking capacity, or test adapters beyond the
  advisory dispositions.
- If an advisory disposition requires a breaking stable API change, stop for
  owner/API review.
- Public source changes own generated JS, declarations, maps, dist manifest,
  size/license/repro checks.
- Documentation can be minimal if a test names the behavior precisely; avoid
  broad Issue `#015` closeout docs.

## Validation commands

```bash
npm run test:source
npm run test:types
npm run test:declarations
npm run test:dist
npm run build
npm run check:repro
npm run test:coverage
npm run size
npm run check:licenses
```

## Acceptance checklist

- [ ] Advisory 5 fixed by accurate test wording or equivalent proof.
- [ ] Advisory 6 fixed or explicitly accepted as test-only with rationale and no
      stable API exposure.
- [ ] Advisory 7 namespace hazard fixed or rejected with a tested rationale;
      prototype-reserved names cannot corrupt extension ownership.
- [ ] Advisory 8 request-ID reuse semantics documented and tested as
      intentional fail-closed behavior.
- [ ] Advisory 9 padded response `requestId` behavior is tested and either
      normalized or explicitly accepted fail-closed.
- [ ] A compact disposition note or test names all nine Review `#033` advisories
      as fixed/tested/accepted after S03+S04.
- [ ] Generated artifacts and reproducibility gates pass.

## Deferred / non-goals

- Credential advisories 1-4 except as consumed from S03.
- Bundle/vendoring/docs/final RC gate work.
- Changing terminal window size, adding idempotent retry semantics, or changing
  Holm's request envelope contract without authority evidence.

## Estimate, risk, ambiguity, review posture

- Estimate: 60-90 minutes plus validation wall time.
- Risk: yellow; prototype namespace and request-ID behavior can be subtle but
  should remain small.
- Ambiguity: padded request-ID normalization versus fail-closed acceptance is a
  product/API compatibility decision if existing tests conflict.
- Review posture: focused edge-contract review; reviewer should verify every
  Review `#033` P3 has an explicit final disposition.

## Stop rules

Stop if a breaking stable API change is required, advisory disposition cannot be
made explicit, request-ID semantics conflict with live Holm authority, a new
dependency is requested, reproducibility is missing, or any release/publish/tag
/push/deploy/credential/cloud/worktree/cross-repo action is needed.
