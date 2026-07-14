---
title: S16 Derived Realtime Legacy Proof Re-review
status: approve
queue: 001_a2_core_foundation
entry: S16
phase: rereview
implementation_commit: 8ff1990d7e225cb6ed822a88bf66023049455de8
review_commit: adc1917add74c79773969bb813f398fee172699d
fix_commit: bfe3fae04ee5fd28ac7bdf0896c288fe97d78b9c
verdict: APPROVE
p1: 0
p2: 0
reviewed_at: 2026-07-14
---

# S16 Re-review: Derived Realtime Legacy Proof

## Verdict

APPROVE: 0 P1, 0 P2.

## Findings

None.

## Re-review Notes

- The prior P2 is resolved: derived dependencies are now copied and frozen after validation, so subscriptions and later evaluations use the same captured dependency list even if the caller mutates its original array after construction.
- The focused regression test mutates the caller-owned dependency array and verifies that replacement resources do not affect derived evaluation or notifications, while the originally captured dependencies still drive recomputation.
- Generated `dist/state/derived.js` and `dist/manifest.json` reflect the source fix. No product source, tests, build config, queue, or state files were changed during re-review.

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
