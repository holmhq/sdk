---
queue: "001"
entry: S11
phase: review
verdict: needs_fixes
reviewed_commit: 6a8496eae585ea7d1ef09271701b7d4e65d201b0
reviewer: pi
reviewed_at: "2026-07-14"
p1: 0
p2: 1
---

# Review 015: S11 Cache Invalidation And Diagnostics

## Verdict

`needs_fixes` — P1: 0, P2: 1

## Scope Reviewed

- Plan: `koder/plans/001_S11_cache_invalidation_diagnostics/INDEX.md`
- Owning issue: `koder/issues/005_transport_cache_auth/INDEX.md`
- A2 rules: `koder/docs/ARCHITECTURE.md`, `koder/docs/DECISIONS.md`, and `koder/docs/EXECUTION.md`
- Implementation sidecar: `/tmp/sdk-a2-blind-run/coord-04/S11-implement.json`
- Commit: `6a8496eae585ea7d1ef09271701b7d4e65d201b0`
- Key paths: `src/transports/cache.ts`, `src/core/diagnostics.ts`, S11 source/type/declaration/dist tests, and generated `dist/{core,transports}/**` artifacts.

## Findings

### P2 — Tag/prefix mutation invalidation does not fence in-flight cache fills

`src/transports/cache.ts` fences `delete()`, `clear()`, and request-key invalidation by advancing per-key/global generations, but tag/prefix invalidation only scans currently stored `entries`. An initial cacheable GET that is still in flight has no stored `CacheEntry`, so `invalidateForMutation({ partition, tags: [...] })` or `invalidateForMutation({ partition, prefixes: [...] })` returns `removed: 0` and does not advance that load's generation. When the old loader resolves, `storeIfCurrent()` still writes it into the cache.

This leaves mutation invalidation nondeterministic for a reachable race: a domain mutation can explicitly invalidate an affected tag/prefix, then a pre-mutation GET response can populate the cache after the invalidation. That violates the S11 requirement that tag/prefix and mutation invalidation be deterministic. Track in-flight load metadata by key/tags/request/partition and fence matching tag/prefix invalidations, or otherwise advance a matching generation so pre-invalidation loads cannot store stale results.

## Review Notes

- Clean/synced `main` was confirmed at implementation commit `6a8496eae585ea7d1ef09271701b7d4e65d201b0` before review; validation left the tree clean and synchronized.
- Implementation sidecar records red evidence for `npm run test:source -- cache`; committed tests cover immutable public cache copies, tag/prefix/request invalidation for stored entries, diagnostics redaction, hook isolation, background SWR error observation, type fixtures, declaration consumers, and dist smoke.
- The implementation otherwise stays within S11/Issue `#005` scope: no endpoint taxonomy, Issue `#007+` implementation, `@holmhq/sdk/resources`, direct SQLite, framework/runtime expansion, publication/release/tag/deploy/credential work, or cross-repository edits were found.
- Generated declarations, ESM artifacts, manifest, size report, and source maps are synchronized with the reviewed source by validation.

## Validation

| Command | Exit |
| --- | ---: |
| `npm run ci` | 0 |
| `npm run test:coverage` | 0 |
| `npm run test:source -- cache` | 0 |
| `npm run test:source -- diagnostics` | 0 |
| `npm run test:dist` | 0 |
| `npm run test:types` | 0 |
| `npm run test:declarations` | 0 |
| `npm run size` | 0 |

Coverage from `npm run test:coverage`:

| Metric | Percent |
| --- | ---: |
| Statements | 98.26 |
| Lines | 99.07 |
| Functions | 99.70 |
| Branches | 97.19 |
| Changed reachable | 100.00 |
