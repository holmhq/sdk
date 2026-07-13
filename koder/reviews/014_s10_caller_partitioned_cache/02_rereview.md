---
queue: "001"
entry: S10
phase: rereview
verdict: approve
reviewed_implementation_commit: 04cab727ad12c8360f6b1c6a8c152babbb635d8f
reviewed_fix_commit: 02f0f636d8dd9d8801485496fdff04de4008991e
reviewer: pi
reviewed_at: "2026-07-14"
p1: 0
p2: 0
---

# Re-review 014: S10 Caller Partitioned Cache

## Verdict

`APPROVE` / `PASS`

## Scope Reviewed

- Initial review: `koder/reviews/014_s10_caller_partitioned_cache/INDEX.md`
- Fix sidecar: `/tmp/sdk-a2-blind-run/coord-04/S10-fix.json`
- Fix commit: `02f0f636d8dd9d8801485496fdff04de4008991e`
- Key paths: `src/core/cache-key.ts`, `src/transports/cache.ts`, `test/source/transport/cache.test.ts`, and generated `dist/{manifest.json,transports/cache.*}` evidence.

## Re-review Notes

- The original P2 is resolved: `delete()` and `clear()` cancel scheduled refresh handles, drop in-flight bookkeeping, and generation-fence pending refresh/load completions so pre-invalidation work cannot repopulate invalidated entries.
- Added source coverage exercises scheduled SWR cancellation, delete-during-background-refresh, and delete-during-direct-in-flight-load behavior.
- S10 essentials remain intact: deterministic caller/source-partitioned GET keys, no auth/header secret material in keys, TTL/SWR, in-flight dedupe, bounded LRU, per-request `default`/`reload`/`no-store` policies, and no endpoint/resource coupling.
- The fix stays within Issue `#005`/S10 scope; no release, deploy, tag, credentials, cross-repository edits, resource APIs, app/admin migration, or Issue `#007+` work was introduced.
- Generated ESM/declaration artifacts are synchronized by validation.

## Validation

| Command | Exit |
| --- | ---: |
| `npm run ci` | 0 |
| `npm run test:coverage` | 0 |
| `npm run test:source -- cache` | 0 |
| `npm run test:types` | 0 |
| `npm run test:dist` | 0 |
| `npm run test:declarations` | 0 |
| `npm run size` | 0 |

Coverage from `npm run test:coverage`:

| Metric | Percent |
| --- | ---: |
| Statements | 98.38 |
| Lines | 99.05 |
| Functions | 99.66 |
| Branches | 97.09 |
| Changed reachable | 100.00 |
