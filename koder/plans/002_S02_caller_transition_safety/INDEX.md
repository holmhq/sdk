---
title: A2R S02 - Caller transition safety and partition fencing
status: approved
issue: 016
plan: 002
slice: S02
finding: P1-2
review: 025
approval_review: 026
owner: sdk-core
depends_on: [S01]
---

## Capability

Enforce deterministic caller transition safety so browser-session/token/operator/agent/app/scope changes synchronously fence prior caller state across cache, queries, mutations, and in-flight work without moving authorization logic into SDK.

## Authority and build-on evidence

- Required correction source: Review `#024` P1-2 and plan conformance review `#025`.
- Architecture/decision anchors: `koder/docs/ARCHITECTURE.md`, `koder/docs/DECISIONS.md` (caller partition and authority boundaries).
- Existing seams cited by review `#024`:
  - `src/core/caller.ts`
  - `src/state/query.ts`
  - `src/state/mutation.ts`
  - `src/transports/index.ts` (in-flight fencing integration points)

## Prerequisites

- S01 accepted, because response normalization behavior feeds cache/query mutation consistency.

## Write ownership (bounded)

- `src/core/caller.ts`
- `src/state/query.ts`
- `src/state/mutation.ts`
- `src/transports/index.ts` (only transition/in-flight guard wiring)
- `test/source/state/caller-reset.test.ts`
- `test/source/state/query.test.ts`
- `test/source/state/mutation.test.ts`
- `test/source/transport/cache-invalidation.test.ts` (if transition invalidation is asserted there)

## Strict TDD plan (red -> green -> refactor)

1. Red: add failing transition tests for principal changes and late-result fencing.
2. Green: implement provider-owned epoch/fingerprint and synchronous reset/abort behavior.
3. Refactor: centralize transition orchestration and remove duplicated reset logic.

## First failing test/assertion (must fail first)

- In `test/source/state/caller-reset.test.ts`, assert that changing caller principal (e.g., token A -> token B) immediately increments transition epoch and invalidates prior partition visibility.
- In `test/source/state/query.test.ts`, assert old-caller query results are not delivered after transition.
- In `test/source/state/mutation.test.ts`, assert mutation completion from old caller cannot commit state post-transition.

## Implementation steps

1. Add/repair deterministic caller partition fingerprint/epoch calculation in `src/core/caller.ts` using non-secret identity dimensions.
2. Wire synchronous transition broadcast to state/query/mutation and transport in-flight fences.
3. Ensure transition applies across browser sessions, explicit tokens, operators, agents, app id, and future scope inputs already represented in caller model.
4. Reject stale in-flight completions by transition epoch check before committing observable state.

## Validation commands (real scripts/files only)

- `npm run test:source -- test/source/state/caller-reset.test.ts`
- `npm run test:source -- test/source/state/query.test.ts`
- `npm run test:source -- test/source/state/mutation.test.ts`
- `npm run test:source -- test/source/transport/cache-invalidation.test.ts`
- `npm run typecheck:core`

Fallback if path forwarding is unsupported: `npm run test:source`.

## Diff budget

- Target <= 260 changed lines across owned files.
- No new runtime package/module creation.

## Acceptance criteria

- Red tests for transitions fail first, then pass.
- Old-caller cache/query/mutation data cannot survive transition boundaries.
- Late responses from pre-transition operations are fenced and non-committing.
- Changes remain within declared ownership and preserve SDK authority boundary.

## Verification evidence to attach in implementation review

- Failing/pass evidence for caller-reset/query/mutation tests.
- Transition matrix listing covered principal dimensions.
- Exact modified-line mapping for epoch/fence checks.

## Deferred / non-goals

- Envelope/meta/`/api/cmd` semantics (S01).
- Capability registry ownership changes (S03).
- Credential redaction/cache-key hardening (S04).
- Request/response correlation checks (S05).
- Integrated final return gate (S06).

## Stop rules

Stop and escalate if remediation requires:

- New auth/authorization semantics currently owned by Holm runtime.
- Persistent storage model changes or direct SQLite access.
- Decision changes outside D001-D015.
- Cross-repo edits in Holm.
