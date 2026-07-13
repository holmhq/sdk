---
queue: "001"
entry: S09
phase: review
verdict: approve
reviewed_commit: ebbd43463fb2efc6a592beaaec853e5a49902fae
reviewer: pi
reviewed_at: "2026-07-14"
p1: 0
p2: 0
---

# Review 013: S09 Transport Auth And Errors

## Verdict

`approve`

## Scope Reviewed

- Plan: `koder/plans/001_S09_transport_auth_errors/INDEX.md`
- Owning issue: `koder/issues/005_transport_cache_auth/INDEX.md`
- A2 architecture/decisions: `koder/docs/ARCHITECTURE.md`, `koder/docs/DECISIONS.md`, and `koder/docs/EXECUTION.md`
- Implementation sidecar: `/tmp/sdk-a2-blind-run/coord-04/S09-implement.json`
- Commit: `ebbd43463fb2efc6a592beaaec853e5a49902fae`
- Key paths: `src/transports/index.ts`, `src/web/index.ts`, `src/node/index.ts`, `test/source/transport/transport-contract.test.ts`, `test/source/transport/web-node-auth.test.ts`, `test/conformance/transport/fixtures.ts`, declaration/dist consumer tests, `package.json`, `scripts/size.mjs`, and generated `dist/{transports,web,node}/**` artifacts.

## Findings

None.

## Review Notes

- Clean/synced `main` was confirmed at implementation commit `ebbd43463fb2efc6a592beaaec853e5a49902fae` before review; post-validation status remained clean and synchronized.
- TDD evidence is credible for S09: the implementation sidecar records `npm run test:source -- transport` as observed red evidence, and committed behavior tests cover request normalization, deterministic keys, raw/JSON/binary body and response fixtures, invalid input/protocol paths, remote error envelopes, abort/cancellation normalization, diagnostic redaction, and web-session/Node-token/header auth seams.
- Auth proof stays out of caller context, serialized errors, and diagnostics: bearer/header proofs are applied only to transport headers, web session proof remains credentials-only, request bodies and sensitive headers are redacted, and generated dist/declaration consumers exercise the public seams.
- The transport slice stays within approved Issue `#005`/S09 scope: it does not invent app/admin endpoint payloads, cache/upload/resource APIs, `/resources`, framework runtimes, direct SQLite access, release/publish/tag/deploy behavior, credentials, cross-repo edits, or Issue `#007+` work.
- Generated declarations, ESM artifacts, manifest, size report, package subpath exports, and source maps are synchronized with the reviewed source.

## Validation

| Command | Exit |
| --- | ---: |
| `npm run ci` | 0 |
| `npm run test:coverage` | 0 |
| `npm run test:source -- transport` | 0 |
| `npm run test:declarations` | 0 |
| `npm run test:dist` | 0 |
| `npm run size` | 0 |

Coverage from `npm run test:coverage`:

| Metric | Percent |
| --- | ---: |
| Statements | 98.69 |
| Lines | 99.29 |
| Functions | 99.62 |
| Branches | 97.25 |
| Changed reachable | 100.00 |
