---
queue: "001"
entry: S11
phase: rereview
verdict: approve
reviewed_implementation_commit: 6a8496eae585ea7d1ef09271701b7d4e65d201b0
reviewed_fix_commit: eb8812522cc34a3358bf7692fa3005840e0ed84f
reviewer: pi
reviewed_at: "2026-07-14"
p1: 0
p2: 0
---

# Re-review 015: S11 Cache Invalidation And Diagnostics

## Verdict

`APPROVE` / `PASS`

## Scope Reviewed

- Plan: `koder/plans/001_S11_cache_invalidation_diagnostics/INDEX.md`
- Initial review: `koder/reviews/015_s11_cache_invalidation_diagnostics/INDEX.md`
- Fix sidecar: `/tmp/sdk-a2-blind-run/coord-04/S11-fix.json`
- Fix commit: `eb8812522cc34a3358bf7692fa3005840e0ed84f`
- Key paths: `src/transports/cache.ts`, `src/core/diagnostics.ts`, S11 cache/diagnostics source/type/dist coverage, and generated `dist/{manifest.json,transports/cache.*}` evidence.

## Re-review Notes

- The original P2 is resolved: tag/prefix/request invalidation now matches in-flight load metadata and advances per-key generations, so pre-invalidation fills cannot repopulate entries even when `removed` is `0`.
- S11 essentials remain intact: immutable public cache responses, deterministic tag/prefix/request and mutation invalidation, endpoint-agnostic typed invalidation, cache hooks, secret-safe diagnostic redaction, and observable SWR background errors without unhandled rejections.
- The fix stays within Issue `#005`/S11 scope; no endpoint taxonomy, resource/state APIs, release, deploy, tag, credentials, cross-repository edits, or Issue `#007+` work was introduced.
- Generated ESM/declaration artifacts and manifest are synchronized by validation.

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
| Lines | 99.08 |
| Functions | 99.70 |
| Branches | 97.21 |
| Changed reachable | 100.00 |
