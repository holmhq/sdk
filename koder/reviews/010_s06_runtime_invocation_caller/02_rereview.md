---
queue: "001"
entry: S06
phase: rereview
verdict: approve
reviewed_commit: 9e9dba6b4a140947551c9caf88357f0627ac2a43
prior_review_commit: aa9a789d96b994b4122d47ba005b0813868e24e1
reviewer: codex
reviewed_at: "2026-07-14"
p1: 0
p2: 0
---

# Re-review 010.02: S06 Runtime Invocation And Caller Boundary

## Verdict

`approve`

## Scope Reviewed

- Prior review: `koder/reviews/010_s06_runtime_invocation_caller/INDEX.md`
- Fix sidecar: `/tmp/sdk-a2-blind-run/coord-02/S06-fix.json`
- Fix commit: `9e9dba6b4a140947551c9caf88357f0627ac2a43`
- Changed paths: `src/core/caller.ts`,
  `test/source/core/runtime-invocation.test.ts`, generated
  `dist/core/caller.js`, `dist/core/caller.js.map`, `dist/manifest.json`,
  and `dist/size-report.json`

## Findings

No remaining P1 or P2 findings.

## Notes

- The prior fingerprint-width finding is resolved: caller fingerprints now use a
  32-hex deterministic digest, and source tests assert the wider shape plus
  distinct principal, app, scope type, and scope id partitions.
- The fix stays within S06 runtime invocation/caller scope and does not add
  forbidden transport, cache, state/resources, framework, release, deploy,
  credential, cross-repo, or Issue `#007+` work.
- Generated ESM, manifest, and size report are synchronized with the reviewed
  source behavior.

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
| Statements | 99.13 |
| Lines | 99.25 |
| Functions | 100.00 |
| Branches | 96.85 |
| Changed reachable | 100.00 |
