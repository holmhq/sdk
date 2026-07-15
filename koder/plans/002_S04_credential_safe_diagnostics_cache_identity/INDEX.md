---
title: A2R S04 - Credential-safe diagnostics and cache identity
status: implemented
issue: 016
plan: 002
slice: S04
finding: P1-4
review: 025
approval_review: 026
implementation_commit: ca5e895f8ad7e701a463e0c4006aa35886982859
owner: sdk-core
depends_on: [S01]
---

## Capability

Eliminate credential leakage to diagnostics/observability/cache identity by structural sensitivity tracking and redaction, while preserving deterministic non-secret partitioning behavior.

## Authority and build-on evidence

- Required correction source: Review `#024` P1-4 and conformance review `#025`.
- Security/architecture anchors: `koder/docs/ARCHITECTURE.md`, `koder/docs/DECISIONS.md`.
- Existing seams cited by review `#024`:
  - `src/transports/index.ts` (`redactTransportRequest`, auth-header handling)
  - `src/core/cache-key.ts`
  - `src/transports/cache.ts`

## Prerequisites

- S01 accepted (transport envelope handling baseline stable).

## Write ownership (bounded)

- `src/transports/index.ts`
- `src/core/cache-key.ts`
- `src/transports/cache.ts`
- `src/transports/sensitivity.ts` (shared structural marker/redaction implementation)
- affected generated JavaScript, declarations, and maps under `dist/`
- `test/source/core/diagnostics.test.ts`
- `test/source/transport/cache.test.ts`
- `test/source/transport/cache-invalidation.test.ts` (only if identity partition assertions belong there)

## Strict TDD plan (red -> green -> refactor)

1. Red: add failing tests proving arbitrary auth headers and sensitive query/path tokens leak into diagnostics or cache keys.
2. Green: implement structural sensitivity model; redact/hash before emitting diagnostics or deriving public cache identity.
3. Refactor: centralize sensitivity classification utilities and remove heuristic-only branches.

## First failing test/assertion (must fail first)

- `test/source/core/diagnostics.test.ts`: custom auth header name/value appears in redacted diagnostic payload today; assert it must be absent/redacted.
- `test/source/transport/cache.test.ts`: sensitive query/path token currently appears in cache key; assert cache key contains only sanitized/opaque representation.
- Add assertion that observational cache hooks do not receive raw sensitive request material.

## Implementation steps

1. Extend transport request metadata model to carry explicit sensitive header/query/path markers.
2. Always redact exact auth-provider header and any sensitivity-marked key-value pairs before diagnostics/event emission.
3. Replace raw canonical-operation embedding in cache key derivation with sanitized/hashed identity components.
4. Ensure transport cache update hooks receive redacted request metadata only.

## Validation commands

The source runner does not currently narrow by forwarded file path, so run it
once, then validate the distributable surface in the same implementation.

- `npm run test:source`
- `npm run typecheck:core`
- `npm run build`
- `npm run test:declarations`
- `npm run test:dist`
- `npm run size`

## Diff budget

- Target <= 280 changed lines.
- No addition of secret-storage persistence surfaces.

## Acceptance criteria

- Failing leakage tests pass with structural redaction in place.
- Cache keys and observability outputs exclude raw credentials/secrets.
- Deterministic partition behavior remains, using non-secret identity material.
- Generated package output matches source and the affected size gate passes.

## Verification evidence to attach in implementation review

- Synthetic secret header/query/path test evidence (fail->pass).
- Example redacted diagnostics snapshot (sanitized).
- Cache key sample showing opaque/sanitized material only.

## Deferred / non-goals

- Capability ownership split (S03).
- Caller transition behavior (S02).
- Response correlation enforcement (S05).
- Integrated return gate (S06).

## Stop rules

Stop and escalate if required correction needs:

- New credential management subsystem design beyond existing SDK scope.
- Decision or policy changes outside D001-D015.
- Holm runtime behavioral changes.
