---
title: S16 Derived Realtime Legacy Proof Review
status: needs_fixes
queue: 001_a2_core_foundation
entry: S16
phase: review
implementation_commit: 8ff1990d7e225cb6ed822a88bf66023049455de8
verdict: NEEDS_FIXES
p1: 0
p2: 1
reviewed_at: 2026-07-14
---

# S16 Review: Derived Realtime Legacy Proof

## Verdict

NEEDS_FIXES: 0 P1, 1 P2.

## Findings

- P2: Freeze or copy the derived dependency list at construction. In
  `src/state/derived.ts:44` and `src/state/derived.ts:150`,
  `normalizeDependencies()` validates `options.dependencies` but returns the
  caller-owned array by reference. `createDerivedResource()` then subscribes to
  the initial entries once at `src/state/derived.ts:52`, while every later
  evaluation maps the still-mutable `dependencies` reference at
  `src/state/derived.ts:82`. A JavaScript caller, or a TypeScript caller that
  keeps a mutable array and passes it as readonly, can push, splice, or replace
  entries after construction. That makes the derived resource evaluate against
  dependencies it did not subscribe to, or keep subscriptions to dependencies it
  no longer evaluates. This breaks the S16 requirement that derived resources
  manage dependencies correctly and is inconsistent with the local defensive
  normalization pattern used for query keys, diagnostics handlers, and mutation
  invalidation arrays. Copy and freeze the dependency tuple during
  normalization, keep the subscriptions aligned with that captured list, and
  add a source test proving post-construction mutation of the caller array
  cannot affect derived evaluation or notification behavior.

## Scope Checked

- S16 plan, queue row, Issue `#006`, A2 execution constraints, source map, and
  implementation sidecar.
- Implementation commit `8ff1990d7e225cb6ed822a88bf66023049455de8`.
- `src/state/derived.ts`, `src/state/diagnostics.ts`,
  `src/state/reconcile.ts`, `src/state/query.ts`, state exports, changed tests,
  declaration consumer, dist smoke, generated declarations, manifest, size
  report, and legacy ledger.

## Notes

- Realtime reconcile hooks remain public-capability-gated, non-durable, and do
  not claim private channels, presence, collaboration, or durable replay.
- `@holmhq/sdk/state` remains the canonical public state subpath; no
  `@holmhq/sdk/resources` or legacy resource export was introduced.
- Universal core/source and generated state artifacts show no DOM or Node
  ambient leakage in the focused grep checks.
- Legacy `holm-state` disposition is pinned to Holm commit
  `11ceae0d88e9c800eb77916e3244fbd231ad81bb` and keeps existing Holm packages
  live and unmodified.
- TDD red evidence is limited to the implementation sidecar's
  `npm run test:source -- state` observed flag; the committed S16 behavior,
  declaration, dist, ledger, and coverage checks are otherwise coherent.

## Validation

| Command | Exit |
| --- | ---: |
| `npm run ci` | 0 |
| `npm run test:source -- state` | 0 |
| `npm run test:declarations` | 0 |
| `npm run test:dist` | 0 |
| `npm run size` | 0 |
| `npm run coverage` | 0 |

Coverage from `npm run coverage`: statements 98.11%, lines 99.03%, functions
99.43%, branches 96.35%, changed_reachable 100.00%.
