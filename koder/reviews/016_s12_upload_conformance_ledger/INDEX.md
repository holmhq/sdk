---
queue: "001"
entry: S12
phase: review
verdict: needs_fixes
reviewed_commit: f9f3cd588af0d53e8c1842060bc605efd63925fa
reviewer: pi
reviewed_at: "2026-07-14"
p1: 0
p2: 1
---

# Review 016: S12 Upload Seam And Migration Ledger

## Verdict

`needs_fixes` — P1: 0, P2: 1

## Scope Reviewed

- Plan: `koder/plans/001_S12_upload_conformance_ledger/INDEX.md`
- Owning issue: `koder/issues/005_transport_cache_auth/INDEX.md`
- A2 rules: `koder/docs/ARCHITECTURE.md`, `koder/docs/DECISIONS.md`, and `koder/docs/EXECUTION.md`
- Implementation sidecar: `/tmp/sdk-a2-blind-run/coord-04/S12-implement.json`
- Commit: `f9f3cd588af0d53e8c1842060bc605efd63925fa`
- Key paths: upload core/web/Node helpers, S12 source/type/declaration/dist tests, generated `dist/{transports,web,node}/**`, and `koder/evidence/001_issue005_transport_uploads/INDEX.md`.

## Findings

### P2 — Final upload handoff can ignore caller cancellation

`src/transports/upload.ts` checks cancellation before/after session creation, chunk upload/status, and completion, but not immediately before or after `adapter.finalize(...)`. A caller can cancel from the final progress callback, or while the final handoff transport is in flight, and `composeResumableUpload()` will still call/return the finalize result if the adapter does not throw.

That leaves a reachable abort path outside S12's upload cancellation contract: finalization is the step that submits the `__holm_uploads` handoff/equivalent runtime body, so a locally cancelled upload can still be committed after the caller has aborted. Add cancellation fencing around the finalize step (and cover cancellation before/during finalize) so late success is ignored consistently with the earlier upload phases.

## Review Notes

- Clean/synced `main` was confirmed at implementation commit `f9f3cd588af0d53e8c1842060bc605efd63925fa` before review; validation left the tree clean and synchronized.
- Implementation sidecar records red evidence for `npm run test:source -- upload`; S12 tests cover upload composition, acknowledged progress/resume, chunk abort, binary diagnostics, web/Node structural helpers, declaration consumers, dist smoke, and the migration ledger.
- The upload seam otherwise keeps core free of DOM/Node ambient types, keeps web/Node helper declarations isolated, and avoids app/admin wrappers, offline queues, Issue `#007+` scope, framework/resource expansion, publication/release/tag/deploy/credential work, direct SQLite, or cross-repository edits.
- The Issue `#005` migration ledger is concise, pinned to Holm commit `11ceae0d88e9c800eb77916e3244fbd231ad81bb`, classifies resumable upload/progress/abort/binary diagnostics/fallback/app-admin wrapper behavior, and did not expose tokens, cookies, request bodies, file contents, or long Holm excerpts.
- Generated declarations, ESM artifacts, manifest, and size report are synchronized with reviewed source by validation.

## Validation

| Command | Exit |
| --- | ---: |
| `npm run ci` | 0 |
| `npm run test:coverage` | 0 |
| `npm run test:source -- upload` | 0 |
| `npm run test:declarations` | 0 |
| `npm run test:dist` | 0 |
| `npm run size` | 0 |
| `npm run test:types` | 0 |

Coverage from `npm run test:coverage`:

| Metric | Percent |
| --- | ---: |
| Statements | 98.38 |
| Lines | 99.12 |
| Functions | 99.73 |
| Branches | 96.84 |
| Changed reachable | 100.00 |
