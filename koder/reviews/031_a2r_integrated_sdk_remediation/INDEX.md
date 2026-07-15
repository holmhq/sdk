---
issue: 016
type: code-review
verdict: approved_with_p2
reviewed_commit: af846d708c35f04e542f10026a642621a1f79d22
p1: 0
p2: 1
p3: 0
reviewer: codex-independent
date: 2026-07-16
---

# A2 integrated SDK remediation review (S03-S05)

## Scope

Independent integrated review of SDK-side remediations in:
- `a962301` (S03 capability extension ownership distribution)
- `ca5e895` (S04 credential-safe diagnostics/cache identity)
- `af846d7` (S05 runtime response correlation/provenance)

Reviewed against issue/plans/review inputs:
- `koder/issues/016_a2_authority_conformance_remediation/INDEX.md`
- `koder/plans/002_S03_capability_extension_ownership/INDEX.md`
- `koder/plans/002_S04_credential_safe_diagnostics_cache_identity/INDEX.md`
- `koder/plans/002_S05_response_correlation_provenance/INDEX.md`
- `koder/reviews/024_a2_holm_authority_conformance/INDEX.md`
- `koder/reviews/030_a2r_s03_capability_extension_ownership_rereview_2/INDEX.md`

Constraints honored: no product/source/test/generated edits; no Holm-repo inspection; review-only artifact output.

## Findings

### P2-1: CI gate is non-green due to coverage parser failure under current Node

- **Classification:** P2
- **Location:** `scripts/coverage.mjs:123`
- **Observed behavior:** `npm run ci` fails at `test:coverage` with:
  `Error: Node test coverage report did not include an all files row.`
- **Impact:** Required integrated validation gate is red, preventing clean completion evidence for Issue 016 despite remediation logic/tests passing in earlier CI stages.
- **Required fix:** Make coverage parsing resilient to current Node coverage table shape (or pin/guard supported Node/runtime format) so `npm run ci` is green and reproducible on the project’s supported runtime matrix.

No additional P1/P2/P3 defects were identified in S03-S05 code paths from this review pass.

## Passing checks

### S03 capability extension ownership

- Public capability surface remains read-only via `CapabilityView`; runtime mutation seam is split into non-barrel `CapabilityRuntimeUpdater` (`src/core/capabilities.ts`, `src/core/index.ts`, package exports).
- Runtime updater construction remains internal (`createCapabilityRuntimeUpdater` present in module but not re-exported through package barrels).
- Extension offer registration enforces `sdk.` namespace boundary and reserved runtime namespace protection (`src/core/extensions.ts`).
- Lifecycle/cancellation/caller-aware invocation semantics remain wired through runtime invocation paths and tests (`src/core/runtime-invocation.ts`, relevant source tests).
- Dist/declaration surface reflects source split without exposing runtime mutation APIs (`dist/core/index.js`, `dist/core/index.d.ts`, exports map in `package.json`).

### S04 credential-safe diagnostics/cache identity

- Request diagnostics use structural redaction (`src/transports/sensitivity.ts`) across URL/params/headers/body with sensitive markers and sensitive-header policy.
- Cache events and diagnostics emit redacted request metadata only (`src/transports/cache.ts`).
- Canonical cache identity is opaque and deterministic (`canonicalTransportKey` -> `createOpaqueTransportKey`) with sensitivity normalization and auth partition handling (`src/transports/index.ts`, `src/transports/sensitivity.ts`).
- Raw secret-bearing auth proofs are not surfaced via redaction helpers and observational diagnostics paths.

### S05 response correlation/provenance

- Response decode path preserves canonical `ProtocolError` typing for malformed or mismatched wire responses (`src/transports/response.ts`).
- Runtime response tracking behavior in tests covers mismatch rejection, duplicate/late ignore semantics, and lifecycle race handling (`test/source/core/runtime-invocation.test.ts`).
- No export-layer regression observed in root/core/transports barrels or package exports.

### Universal/distribution invariants

- Package remains private (`package.json: "private": true`).
- Core typecheck/tests and dist/declaration tests pass in CI progression before coverage parser failure.
- Reproducibility, license, and size checks reached and passed prior to final CI failure point in this run.

## Validation

Commands executed:

1. `git rev-parse HEAD` -> `af846d708c35f04e542f10026a642621a1f79d22` (matches expected base)
2. `git status --short --untracked-files=all` -> clean before review write
3. `npm run ci` -> **failed** (coverage parser error at `scripts/coverage.mjs:123`)
4. Focused read-only probes:
   - `git log --oneline --decorate -n 6`
   - `rg -n ... src test dist package.json scripts` (targeted S03-S05/export/redaction/protocol probes)
   - `sed -n ...` on key source/export/manifest files

## Verdict

**NOT APPROVED (approved_with_p2):** 0 P1, 1 P2, 0 P3.

Implementation intent for S03-S05 appears materially present and coherent in source/dist/export surfaces, but required integrated validation is not green due to the coverage-gate parser failure. Per review contract, approval requires zero P1 and zero P2.

## Required next action

1. Remediate `scripts/coverage.mjs` parsing/runtime compatibility so `npm run ci` is green on supported Node.
2. Re-run full CI and attach fresh green evidence.
3. Request follow-up independent confirmation that P2-1 is closed.
