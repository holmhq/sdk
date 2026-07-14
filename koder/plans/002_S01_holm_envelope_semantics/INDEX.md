---
title: A2R S01 - Holm envelope semantics and /api/cmd conformance
status: in_review
issue: 016
plan: 002
slice: S01
finding: P1-1
review: 025
owner: sdk-core
---

## Capability

Establish source-pinned, executable conformance for Holm response envelope handling in SDK transports, including success `{data,meta}`, failure `{error:{code,message,details}}`, response-header preservation, and explicit `/api/cmd` HTTP-200 command-envelope handling.

## Authority and build-on evidence

- Required correction source: `koder/reviews/024_a2_holm_authority_conformance/INDEX.md` (P1-1) and `koder/reviews/025_a2r_remediation_plan_conformance/INDEX.md`.
- Holm authority map: `koder/docs/HOLM_SOURCE_MAP.md` (runtime/protocol authority constraints).
- Existing SDK seams cited by review `#024`: `src/transports/index.ts` around response parsing and command-envelope paths.
- Migration-evidence dependency: `koder/issues/005_*` ledger updates are required output of this slice before closure.

## Prerequisites

- No implementation prerequisites.
- Must not begin S02-S06 implementation until this slice is independently reviewed and accepted.

## Write ownership (bounded)

- `src/transports/index.ts`
- `test/source/transport/transport-contract.test.ts`
- `test/source/transport/upload.test.ts`
- `test/source/core/runtime-invocation.test.ts` (only if command envelope normalization assertions belong there)
- `koder/issues/005_holm_packages_migration_provenance/INDEX.md` (ledger evidence section only)

Do not edit files outside this set in S01 implementation.

## Strict TDD plan (red -> green -> refactor)

1. Red: add failing assertions proving current transport behavior is non-conformant.
2. Green: implement minimal parsing/normalization and header/meta propagation to satisfy assertions.
3. Refactor: isolate envelope normalization helpers, preserve adapter/runtime contracts, and simplify without behavior drift.

## First failing test/assertion (must fail first)

- Add a failing test in `test/source/transport/transport-contract.test.ts` asserting successful Holm envelope:
  - input payload: `{ data: { ok: true }, meta: { request_id: "r1" } }`
  - expected response data surfaced as `{ ok: true }`
  - expected metadata preserved on response shape (or contract-defined metadata field)
  - expected headers required by contract remain accessible.
- Add a failing test for error envelope:
  - input payload: `{ error: { code: "forbidden", message: "Denied", details: { scope: "x" } } }`
  - expected typed protocol error mapping includes code/message/details.
- Add failing `/api/cmd` test:
  - HTTP 200 command envelope with command/error semantics is interpreted via Holm rules, not generic success fallback.

## Implementation steps

1. Locate transport response decode path in `src/transports/index.ts` and document exact branch points in comments near modified lines.
2. Introduce/adjust a normalization helper that distinguishes:
   - success envelope with `data`
   - failure envelope with `error`
   - command envelope branch for `/api/cmd` behavior
3. Ensure response headers are preserved across normalized response object and available to downstream consumers.
4. Ensure metadata mapping preserves Holm `meta` fields without fabricating undocumented fields.
5. Keep behavior stable for non-Holm payloads where compatibility is already covered by existing tests.

## Validation commands (real scripts/files only)

- `npm run test:source -- test/source/transport/transport-contract.test.ts`
- `npm run test:source -- test/source/transport/upload.test.ts`
- `npm run test:source -- test/source/core/runtime-invocation.test.ts`
- `npm run typecheck:core`

If any targeted `test:source -- <path>` forwarding is unsupported, run `npm run test:source` and record that in implementation evidence.

## Diff budget

- Target <= 220 changed lines across source+tests+ledger note.
- New helper functions <= 2 unless existing helper can be extended safely.

## Acceptance criteria

- Added tests fail before implementation and pass after.
- Transport decodes Holm success/error envelopes and preserves authority-required metadata/headers.
- `/api/cmd` command envelope behavior is explicitly covered by tests.
- Issue `#005` ledger clearly distinguishes adopted Holm behavior vs deferred redesign, pinned to source evidence.
- Independent slice review reports zero P1/P2 findings for this slice.

## Verification evidence to attach in implementation review

- Failing and passing test snippets for the three new assertions.
- Exact command list and exits.
- File list confined to declared ownership.
- Source pin references from Holm map used for assertions.

## Deferred / non-goals

- Caller partition resets (S02).
- Capability ownership and extension invocation seam (S03).
- Credential redaction/cache identity hardening (S04).
- Response-ID correlation logic (S05).
- Full-suite integration return gate (S06).

## Stop rules

Stop and escalate if any required behavior would:

- Invent new Holm protocol semantics not present in pinned evidence.
- Require changes to `koder/docs/DECISIONS.md` decisions D001-D015.
- Require editing Holm repository or product implementation outside declared ownership.
- Require queue execution or owner authorization changes.
