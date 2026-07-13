---
queue: "001"
entry: S06
phase: review
verdict: needs_fixes
reviewed_commit: 5bd80ca5961a622073f60823a36bd93fde218914
reviewer: codex
reviewed_at: "2026-07-14"
p1: 0
p2: 1
---

# Review 010: S06 Runtime Invocation And Caller Boundary

## Verdict

`needs_fixes`

## Scope Reviewed

- Plan: `koder/plans/001_S06_runtime_invocation_caller/INDEX.md`
- Owning issue: `koder/issues/004_universal_core/INDEX.md`
- Architecture/decisions: `koder/docs/ARCHITECTURE.md`, `koder/docs/DECISIONS.md`
- Implementation sidecar: `/tmp/sdk-a2-blind-run/coord-02/S06-implement.json`
- Commit: `5bd80ca5961a622073f60823a36bd93fde218914`
- Key paths: `src/core/caller.ts`, `src/core/invoke.ts`,
  `src/core/runtime.ts`, `src/core/index.ts`,
  `test/source/core/runtime-invocation.test.ts`,
  `test/types/runtime-invocation.test.ts`,
  `test/declarations/package-consumer.test.ts`,
  `test/dist/index.test.mjs`, generated `dist/core/{caller,invoke,runtime}.*`,
  `dist/manifest.json`, and `dist/size-report.json`

## Findings

1. **P2 - Caller fingerprints are too collision-prone for the partitioning
   contract.** S06's acceptance criteria require deterministic, non-secret
   fingerprints that let later layers partition safely. The implementation
   hashes the canonical caller material with a 32-bit FNV-style hash and returns
   only eight hex characters (`src/core/caller.ts:85`,
   `src/core/caller.ts:142`). The source test then locks that narrow shape with
   `^caller:v1:[0-9a-f]{8}$` (`test/source/core/runtime-invocation.test.ts:168`).
   That gives only `2^32` possible partitions, so ordinary birthday-collision
   odds become realistic at SDK-scale principal/app/scope counts. If cache or
   resource layers use this fingerprint as the caller partition key, two
   different callers can share a partition and observe stale or unauthorized
   data. This should use a materially wider deterministic non-secret digest, and
   tests should assert the wider shape plus distinctness for representative
   caller/app/scope changes.

## Review Notes

- TDD red evidence is credible for this slice: the implementation sidecar
  records `npm run test:source -- runtime` as observed red evidence, and the
  committed source/type tests define the new S06 behavior.
- The committed behavior-focused tests cover fresh per-call caller resolution,
  copied request payload/caller context, copied response payload/metadata, late
  mutation isolation, ambient auth field exclusion from fingerprint material,
  static caller snapshot isolation, and pre-invocation capability failure.
- Auth proof semantics remain adapter-private: caller context does not expose
  token/cookie fields, and the type fixture rejects adding a `token` property to
  `CallerContext`.
- Runtime invocation stays environment-neutral and does not add production
  transports, cache/state/resources, frameworks, release/publish/tag/deploy,
  cross-repo edits, or Issue `#007+` work.
- Generated declarations, generated ESM, manifest, size report, declaration
  consumer checks, and dist smoke tests match the reviewed source behavior, but
  they include the fingerprint-width issue above.

## Validation

| Command | Exit |
| --- | ---: |
| `npm run ci` | 0 |
| `npm run test:coverage` | 0 |
| `npm run test:source -- runtime` | 0 |
| `npm run test:types` | 0 |
| `npm run test:dist` | 0 |

Coverage from `npm run test:coverage`:

| Metric | Percent |
| --- | ---: |
| Statements | 99.10 |
| Lines | 99.24 |
| Functions | 100.00 |
| Branches | 96.84 |
| Changed reachable | 100.00 |
