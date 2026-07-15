---
title: A2R S03 - Capability ownership and extension invocation seam
status: implemented
issue: 016
plan: 002
slice: S03
finding: P1-3
review: 025
approval_review: 026
implementation_commit: a9623012835ee17b47fb6acdbd2d9eb555e01c7c
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
- affected public barrel files under `src/`
- `src/transports/response.ts` and `scripts/size.mjs` for the measured
  response-module split required by the live size gate
- affected generated JavaScript, declarations, and maps under `dist/`
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

## Validation commands

The source runner does not currently narrow by forwarded file path, so run it
once rather than repeating nominally targeted commands.

- `npm run test:source`
- `npm run typecheck:core`
- `npm run build`
- `npm run test:declarations`
- `npm run test:dist`
- `npm run size`

S03 is not implementation-complete until generated package output matches the
source API and all commands above pass.

## Change discipline

- Keep the correction scoped to the capability/extension contract and its
  generated package surface.
- No new package exports without contract evidence.

## Acceptance criteria

- Tests fail then pass for capability forging and extension namespace constraints.
- Public interface is read-only for capability view.
- Runtime-only updater ownership is explicit and non-exported.
- Extension invocation seam is lifecycle/cancellation/caller-aware and tested.
- Tracked package JavaScript, declarations, maps, and public barrels expose the
  same read-only contract as source.
- The affected artifact size gate passes.

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
