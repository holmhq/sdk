---
queue: "001"
entry: S15
phase: review
verdict: needs_fixes
reviewed_commit: 470b489c3b41dc6b0cfa6c4379cc36158e63b76f
reviewer: codex
reviewed_at: "2026-07-14"
p1: 0
p2: 1
---

# Review 019: S15 Mutation Optimistic Invalidation

## Verdict

NEEDS_FIXES. No P1 findings. One P2 finding.

## Scope Reviewed

- Plan: `koder/plans/001_S15_mutation_optimistic_invalidation/INDEX.md`
- Owning issue: `koder/issues/006_reactive_resources/INDEX.md`
- A2 rules: `koder/docs/EXECUTION.md` and `koder/docs/BLIND_ORCHESTRATION.md`
- Implementation sidecar: `/tmp/sdk-a2-blind-run/coord-05/S15-implement.json`
- Commit: `470b489c3b41dc6b0cfa6c4379cc36158e63b76f`
- Key paths: `src/state/mutation.ts`, `src/state/resource.ts`, `src/state/index.ts`, mutation source tests, mutation type tests, dist smoke tests, generated `dist/state/**`, manifest, and size report.

## Findings

- P1: 0
- P2: 1

### P2: Reset/dispose during async invalidation lets `execute()` resolve stale success

`runMutation()` checks `isActive(token)` before committing the executor result, but it does not check again after awaiting `emitInvalidation()`. If `onInvalidate` is asynchronous and the caller resets or disposes the mutation while that hook is pending, `cancelActive()` clears the active token and moves the resource to `idle`/`disposed`, yet the original `execute()` promise still resolves with the earlier ready snapshot when the hook finishes.

This breaks the mutation lifecycle/cancellation contract for the post-commit invalidation phase: consumers can observe a resolved successful execution after they explicitly reset or disposed the resource, and the returned snapshot no longer represents the resource state. The existing reset/dispose tests cover cancellation while the executor is pending, but they do not cover cancellation while an async invalidation hook is pending.

Evidence against the generated artifact:

```text
node --input-type=module -e "<async invalidation hook; call reset() before hook resolves>"
=> {"resetPhase":"idle","finalPhase":"idle","resolved":true,"promisePhase":"ready","cancelled":false}
```

Expected direction: after `await emitInvalidation(...)`, fence on `isActive(token)` before returning `ready`, mirroring the pre-commit check, and add source/dist coverage for reset/dispose during a pending async invalidation hook. The exact cancellation reason can follow the existing reset/dispose behavior.

## Review Notes

- Optimistic payload/result copying, rollback to prior canonical data, retained data on non-optimistic errors, invalidation normalization, invalidation hook diagnostics, custom error inference, and declaration output are otherwise coherent with the S15 plan.
- The public surface remains the canonical `@holmhq/sdk/state` subpath; no `@holmhq/sdk/resources` or legacy resource export was introduced.
- No app/admin taxonomy, endpoint-specific mutation API, framework hook, release/publish/tag/deploy, credential, cross-repo edit, or Issue `#007+` behavior was introduced.
- Generated declarations, ESM artifacts, manifest, package exports, and size report are synchronized with reviewed source by validation; core ambient checks continue to compile without DOM or Node types.

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
| Branches | 96.39 |
| Changed reachable | 100.00 |
