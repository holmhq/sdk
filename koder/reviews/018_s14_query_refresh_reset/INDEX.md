---
queue: "001"
entry: S14
phase: review
verdict: approve
reviewed_commit: 42bd0b8e15124409f48da5896788348b69674ad9
reviewer: codex
reviewed_at: "2026-07-14"
p1: 0
p2: 0
---

# Review 018: S14 Query Refresh And Caller Reset

## Verdict

APPROVE. No P1 or P2 findings.

## Scope Reviewed

- Plan: `koder/plans/001_S14_query_refresh_reset/INDEX.md`
- Owning issue: `koder/issues/006_reactive_resources/INDEX.md`
- A2 rules: `koder/docs/EXECUTION.md` and `koder/docs/BLIND_ORCHESTRATION.md`
- Implementation sidecar: `/tmp/sdk-a2-blind-run/coord-05/S14-implement.json`
- Commit: `42bd0b8e15124409f48da5896788348b69674ad9`
- Key paths: `src/state/query.ts`, `src/state/resource.ts`, `src/state/index.ts`, state source tests, type tests, dist smoke tests, generated `dist/state/**`, manifest, and size report.

## Findings

- P1: 0
- P2: 0

## Review Notes

- Query resources expose idle/loading/ready/error/disposed snapshots, stale refresh, retained data on refresh/error, force replacement, cancellation, current-load sharing, and disposal behavior through the framework-neutral `@holmhq/sdk/state` surface.
- Caller and source resets cancel in-flight work, clear prior data before reloading, repartition cache keys by caller fingerprint/source identity, and do not retain prior principal/runtime data in reachable snapshots.
- Multiple subscribers share deduplicated refresh work and receive deterministic cleanup through the resource lifecycle; cache key construction remains internal to the query resource.
- No `@holmhq/sdk/resources` or legacy resource subpath was introduced, no Holm state schema was invented, and the slice does not cross into mutations, derived resources, realtime, framework bindings, release/publish/tag/deploy, credentials, cross-repo edits, or Issue `#007+` work.
- Generated declarations, ESM artifacts, manifest, package exports, and size report are synchronized with reviewed source by validation; core ambient checks continue to compile without DOM or Node types.

## Validation

| Command | Exit |
| --- | ---: |
| `npm run ci` | 0 |
| `npm run test:source -- state` | 0 |
| `npm run test:types` | 0 |
| `npm run test:dist` | 0 |
| `npm run size` | 0 |
| `npm run test:coverage` | 0 |

Coverage from `npm run test:coverage`:

| Metric | Percent |
| --- | ---: |
| Statements | 98.08 |
| Lines | 99.12 |
| Functions | 99.31 |
| Branches | 96.73 |
| Changed reachable | 100.00 |
