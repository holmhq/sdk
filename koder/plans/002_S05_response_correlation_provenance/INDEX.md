---
title: A2R S05 - Response correlation and provenance safeguards
status: approved
issue: 016
plan: 002
slice: S05
finding: P2-1
review: 025
approval_review: 026
owner: sdk-core
depends_on: [S01, S02]
---

## Capability

Enforce strict request-response correlation (`requestId`) with explicit handling for mismatched, late, and duplicate mailbox responses, preserving provenance diagnostics without cross-wiring operations.

## Authority and build-on evidence

- Required correction source: Review `#024` P2-1 and plan conformance review `#025`.
- Architecture/decision anchors: message-passing and protocol error boundaries in `koder/docs/ARCHITECTURE.md` and `koder/docs/DECISIONS.md`.
- Existing seam cited by review `#024`: `src/core/invoke.ts` request/response handling.

## Prerequisites

- S01 accepted (response normalization baseline).
- S02 accepted (transition fencing interactions with in-flight responses).

## Write ownership (bounded)

- `src/core/invoke.ts`
- `src/transports/index.ts` (only if correlation plumbing requires adapter-facing metadata thread-through)
- affected generated JavaScript, declarations, and maps under `dist/`
- `test/source/core/runtime-invocation.test.ts`
- `test/source/transport/transport-contract.test.ts` (only if adapter contract assertion belongs there)

## Strict TDD plan (red -> green -> refactor)

1. Red: add failing tests for mismatched requestId acceptance and duplicate/late mailbox response handling.
2. Green: reject mismatch with `ProtocolError`; ignore+diagnose duplicate/late responses.
3. Refactor: simplify correlation guard path and consolidate diagnostics emission.

## First failing test/assertion (must fail first)

- In `test/source/core/runtime-invocation.test.ts`, assert response with `requestId` different from request throws `ProtocolError` and does not resolve as success.
- Add assertion that duplicate response for same request is ignored after first terminal resolution and produces diagnostic event.
- Add assertion that late response after cancellation/transition is ignored and diagnosed.

## Implementation steps

1. Add explicit requestId equality guard at response acceptance boundary in `src/core/invoke.ts`.
2. Maintain per-request terminal state to reject duplicate or late arrivals.
3. Emit deterministic diagnostics for mismatch/late/duplicate without exposing secrets.
4. Preserve existing adapter API shape unless tests prove contract expansion is required.

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

- Target <= 180 changed lines.
- No new public API exports unless independently approved.

## Acceptance criteria

- Correlation mismatch fails with `ProtocolError` in tests.
- Duplicate and late responses are ignored and diagnosed deterministically.
- No cross-operation response leakage remains in invocation path.
- Generated package output matches source and the affected size gate passes.

## Verification evidence to attach in implementation review

- Fail->pass evidence for mismatch/duplicate/late assertions.
- Log/diagnostic snippets showing deterministic event categories.
- Modified line references in `src/core/invoke.ts` for guard logic.

## Deferred / non-goals

- Credential redaction/cache identity (S04).
- Capability ownership control plane (S03).
- Final integrated gating and authority return (S06).

## Stop rules

Stop and escalate if required behavior needs:

- Protocol semantics absent from pinned authority sources.
- Cross-repo changes or decision resets outside D001-D015.
