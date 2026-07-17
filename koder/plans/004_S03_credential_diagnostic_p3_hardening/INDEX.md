---
title: W4 S03 - Credential and diagnostic P3 hardening
status: in_review
issue: 017
plan: 004
slice: S03
type: implementation
queue_candidate: 005
owner: sdk-rc
created: 2026-07-17
updated: 2026-07-17
---

# Plan 004 S03: Credential and diagnostic P3 hardening

## User decisions captured

- Production-relevant Review `#033` advisories 1-4 must be handled before the
  private v0.1-web RC gate.
- The approved authority model remains structural sensitivity marking plus
  bounded defense-in-depth; do not silently redefine unmarked URL/query/path
  values as secrets or broaden heuristic authority beyond the approved contract.
- Credentials must not enter public diagnostics, hooks, serialized errors,
  resource snapshots, or raw cache keys.

## Capability statement

Harden credential-sensitive diagnostics and cache identity so Review `#033`
advisories 1-4 are fixed, tested, or explicitly bounded without changing the
approved structural-marking authority model.

## Source and build-on checks

- Read Review `#033` advisories 1-4, Issue `#017`, architecture error/
  diagnostics and auth-proof sections, `src/transports/sensitivity.ts`,
  `src/transports/index.ts`, `src/core/cache-key.ts`, `src/core/errors.ts`,
  `src/transports/cache.ts`, and related tests.
- Reconfirm S01/S02 gates do not expose new stable API without inventory.
- Authority drift check: read-only Holm Issue `#534` at
  `fb34d6b768f15f9bc596e0b82430e5c678fd2088`; no Holm write/test is needed.
- Confirm no new dependency is needed for hashing/redaction; if cryptographic
  behavior requires a dependency or runtime ambient, stop for owner/API review.

## Expected seams / files

- Transport sensitivity tests covering marked URL/query/path tokens, unmarked
  token obligations, manual header variants (`x-auth`, `x-signature`, `apikey`
  or equivalent), hook events, diagnostics, and serialized error details.
- Cache-key tests proving no raw credential material and documenting the chosen
  opaque-key strength/low-entropy-secret behavior.
- Error/background diagnostic tests for loader-thrown `HolmError` messages.
- Source changes likely in `src/transports/sensitivity.ts`,
  `src/transports/index.ts`, `src/core/cache-key.ts`, `src/core/errors.ts`, or
  `src/transports/cache.ts`, bounded by the tests.
- Minimal docs/comments if needed to state caller obligations for marking
  URL-borne tokens.
- Generated `dist/**` and reports for any public source change.

## Red test or docs-first proof

First add failing tests for each Review `#033` advisory 1-4:

1. Unmarked credential-like URL/query/path values remain caller responsibility,
   while marked URL-borne tokens are redacted from hooks/diagnostics/errors.
2. Manually attached sensitive header-name variants receive the same
   defense-in-depth redaction layer in hook events and diagnostics.
3. Opaque transport/cache keys do not disclose raw low-entropy bodies; if the
   current design is intentionally accepted, the test and docs must make the
   residual brute-force boundary explicit.
4. Loader-thrown `HolmError` messages cannot leak sensitive message content into
   background-error events unless the value was explicitly classified safe.

## Implementation boundary and generated artifacts

- Keep structural marking as the authority boundary; do not make broad parameter
  name guessing a correctness guarantee.
- Header-name heuristics may be defense-in-depth only and must be tested as
  such.
- Do not add a dependency, WebCrypto/Node ambient dependency to core, or
  runtime-specific secret store.
- Any public source change owns generated JS/declarations/maps/manifests and
  size/license/repro checks.
- If a safe fix requires API additions or changed stable behavior, coordinate
  with S01's API gate and stop for owner approval if breaking.

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

- [ ] Advisory 1 has explicit tests/docs for marked versus unmarked URL-borne
      token behavior; signed/magic-link style helpers mark secrets at
      construction where applicable.
- [ ] Advisory 2 header variants are redacted or explicitly accepted with a
      tested rationale that does not weaken approved behavior.
- [ ] Advisory 3 opaque-key behavior is strengthened or explicitly accepted with
      a tested, documented low-entropy-secret boundary.
- [ ] Advisory 4 background-error diagnostics do not leak sensitive
      loader-thrown `HolmError` messages.
- [ ] No raw credential appears in hooks, diagnostics, serialized errors,
      resource snapshots, or cache keys under the tested marked-sensitive paths.
- [ ] Generated artifacts and reproducibility gates pass.

## Deferred / non-goals

- Advisories 5-9, preview/reserved labels, bundle/vendoring work, RC docs, or
  integrated final review.
- Replacing the approved sensitivity model with broad URL/token-name heuristics.
- Adding heavyweight cryptography/dependency layers to universal core without
  owner approval.

## Estimate, risk, ambiguity, review posture

- Estimate: 90-120 minutes plus validation wall time.
- Risk: yellow/red; credential behavior is security-sensitive and can create API
  compatibility questions.
- Ambiguity: advisory 3 may be fixed or accepted with rationale depending on
  feasible no-dependency hashing options.
- Review posture: security-focused review required; reviewer should trace
  marked and unmarked material through hooks, errors, diagnostics, and cache
  identity.

## Stop rules

Stop if the approved structural sensitivity contract must change, a dependency
or runtime ambient API appears necessary, tests reveal an unbounded credential
leak needing larger design, stable API compatibility is affected, Holm authority
drifts, reproducibility cannot be proven, or any release/publish/tag/push/deploy
/credential/cloud/worktree/cross-repo action is needed.
