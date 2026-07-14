---
queue: "001"
entry: S15
phase: rereview
verdict: approve
reviewed_commit: b4cfcac2d31f04360764099e677c2c3f80604811
reviewer: codex
reviewed_at: "2026-07-14"
p1: 0
p2: 0
---

# Review 020: S15 Mutation Optimistic Invalidation Re-review

## Verdict

APPROVE. No P1 or P2 findings.

## Scope Reviewed

- Plan: `koder/plans/001_S15_mutation_optimistic_invalidation/INDEX.md`
- Original review: `koder/reviews/019_s15_mutation_optimistic_invalidation/INDEX.md`
- Fix sidecar: `/tmp/sdk-a2-blind-run/coord-05/S15-fix.json`
- Implementation commit: `470b489c3b41dc6b0cfa6c4379cc36158e63b76f`
- Fix commit: `b4cfcac2d31f04360764099e677c2c3f80604811`
- Key paths: `src/state/mutation.ts`, `test/source/state/mutation.test.ts`, `test/dist/index.test.mjs`, and generated `dist/state/mutation.js`.

## Findings

- P1: 0
- P2: 0

## Resolution Notes

- The original P2 finding is resolved. `runMutation()` now re-checks the active execution token after awaited invalidation hooks before resolving the ready snapshot.
- Source coverage now exercises reset and dispose during a pending async invalidation hook; the generated ESM smoke coverage exercises reset during the same phase.
- No new P1/P2 issue was found in the reviewed fix scope.

## Validation

| Command | Exit |
| --- | ---: |
| `npm run ci` | 0 |
| `npm run test:source -- mutation` | 0 |
| `npm run test:types` | 0 |
| `npm run test:dist` | 0 |
| `npm run size` | 0 |
| `npm run coverage` | 0 |

Coverage from `npm run coverage`:

| Metric | Percent |
| --- | ---: |
| Statements | 98.00 |
| Lines | 98.99 |
| Functions | 99.37 |
| Branches | 96.33 |
| Changed reachable | 100.00 |
