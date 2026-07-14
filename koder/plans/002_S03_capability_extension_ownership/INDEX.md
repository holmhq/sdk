---
title: A2R S03 - Capability ownership and extension invocation seam
status: in_review
issue: 016
plan: 002
slice: S03
finding: P1-3
review: 025
owner: sdk-core
depends_on: [S01]
---

## Capability

Separate public read-only capability visibility from private runtime offer mutation, and provide a narrow lifecycle/cancellation/caller-aware extension invocation seam that prevents consumers/extensions from manufacturing `holm.*` offers.

## Authority and build-on evidence

- Required correction source: Review `#024` P1-3 and conformance review `#025`.
- Architecture/decision anchors: `koder/docs/ARCHITECTURE.md`, `koder/docs/DECISIONS.md` (runtime authority and extension boundaries).
- Existing seams cited by review `#024`:
  - `src/core/capabilities.ts`
  - `src/core/create-holm.ts`
  - `src/core/extensions.ts`

## Prerequisites

- S01 accepted (shared transport normalization expectations).

## Write ownership (bounded)

- `src/core/capabilities.ts`
- `src/core/create-holm.ts`
- `src/core/extensions.ts`
- `test/source/core/capabilities.test.ts`
- `test/source/core/extensions.test.ts`
- `test/source/core/runtime-invocation.test.ts` (only if seam assertions belong there)

## Strict TDD plan (red -> green -> refactor)

1. Red: add failing tests for public offer forging and missing narrow extension invocation contract.
2. Green: enforce private runtime updater and controlled `sdk.*` extension registration/invoke path.
3. Refactor: isolate capability view vs updater interfaces and prune duplicate checks.

## First failing test/assertion (must fail first)

- In `test/source/core/capabilities.test.ts`, assert public API cannot replace a `holm.*` offer.
- In `test/source/core/extensions.test.ts`, assert extension registration rejects non-`sdk.*` offers.
- In `test/source/core/runtime-invocation.test.ts`, assert extension invocation path carries lifecycle cancellation and caller context from core seam.

## Implementation steps

1. Split capability interfaces into:
   - read-only public view exposed to SDK consumers
   - private runtime-owned updater retained in core internals
2. Restrict extension-local offer registration namespace to `sdk.*`.
3. Add/repair narrow invocation function exposed to extensions that routes through core lifecycle/cancellation/caller context.
4. Ensure runtime remains sole authority for `holm.*` offers.

## Validation commands (real scripts/files only)

- `npm run test:source -- test/source/core/capabilities.test.ts`
- `npm run test:source -- test/source/core/extensions.test.ts`
- `npm run test:source -- test/source/core/runtime-invocation.test.ts`
- `npm run typecheck:core`

Fallback: `npm run test:source` if path forwarding unsupported.

## Diff budget

- Target <= 260 changed lines.
- No new package exports without explicit approval from independent reviewer.

## Acceptance criteria

- Tests fail then pass for capability forging and extension namespace constraints.
- Public interface is read-only for capability view.
- Runtime-only updater ownership is explicit and non-exported.
- Extension invocation seam is lifecycle/cancellation/caller-aware and tested.

## Verification evidence to attach in implementation review

- Before/after API shape note for capability view/updater split.
- Failing/pass test evidence for forging and extension invocation constraints.
- Export-surface diff proving no unintended public expansion.

## Deferred / non-goals

- Caller transition fencing (S02).
- Credential-safe diagnostics/cache identity (S04).
- Response correlation (S05).
- Integrated full gate return (S06).

## Stop rules

Stop and escalate if required changes imply:

- New externally exposed protocol contract without authority evidence.
- Decision-set changes in D001-D015.
- Holm repo edits or new runtime semantics.
