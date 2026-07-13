---
queue: "001"
entry: S10
phase: review
verdict: needs_fixes
reviewed_commit: 04cab727ad12c8360f6b1c6a8c152babbb635d8f
reviewer: pi
reviewed_at: "2026-07-14"
p1: 0
p2: 1
---

# Review 014: S10 Caller Partitioned Cache

## Verdict

`needs_fixes` — P1: 0, P2: 1

## Scope Reviewed

- Plan: `koder/plans/001_S10_caller_partitioned_cache/INDEX.md`
- Owning issue: `koder/issues/005_transport_cache_auth/INDEX.md`
- A2 architecture/decisions: `koder/docs/ARCHITECTURE.md`, `koder/docs/DECISIONS.md`, and `koder/docs/EXECUTION.md`
- Implementation sidecar: `/tmp/sdk-a2-blind-run/coord-04/S10-implement.json`
- Commit: `04cab727ad12c8360f6b1c6a8c152babbb635d8f`
- Key paths: `src/core/cache-key.ts`, `src/transports/cache.ts`, `test/source/transport/cache.test.ts`, declaration/type/dist consumer tests, and generated `dist/{core,transports}/**` artifacts.

## Findings

### P2 — `clear()`/`delete()` can be undone by pending SWR/in-flight writes

`src/transports/cache.ts` exposes public `delete()` and `clear()` but they only remove entries/scheduled-key bookkeeping. They do not cancel or fence the already scheduled SWR task and they do not prevent an in-flight loader for the same key from calling `store()` later. A stale read can schedule a background refresh, `clear()` can report an empty cache, and `scheduler.runDue()` then reloads and stores the cleared response again. The same race exists for `delete()` with a pending refresh/load.

This makes the cache invalidation primitives nondeterministic and weakens the caller/source-partition safety expected by S10/Issue `#005`: callers cannot rely on clearing or deleting prior-principal/stale data before later reads. Fix by canceling scheduled refresh handles and/or adding per-key/global generation fencing so loads that started before `delete()`/`clear()` cannot repopulate invalidated entries.

## Review Notes

- Clean/synced `main` was confirmed at implementation commit `04cab727ad12c8360f6b1c6a8c152babbb635d8f` before review; post-validation status remained clean and synchronized before the review artifact was written.
- The implementation sidecar records red evidence for `npm run test:source -- cache`; committed behavior tests cover deterministic keys, caller/source partitioning, TTL/SWR, in-flight dedupe, bounded LRU, background-error observation, immutability, per-request `no-store`/`reload`, declarations, type fixtures, and dist smoke.
- The slice otherwise stays within approved Issue `#005`/S10 scope: no owner-decision cache defaults, app/admin endpoint work, upload/resource APIs, `@holmhq/sdk/resources`, framework/runtime expansion, direct SQLite, release/publish/tag/deploy behavior, credentials, or cross-repo edits were found.
- Generated declarations, ESM artifacts, manifest, size report, package subpath exports, and source maps are synchronized with the reviewed source by validation.

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
| Statements | 98.72 |
| Lines | 99.27 |
| Functions | 99.66 |
| Branches | 97.36 |
| Changed reachable | 100.00 |
