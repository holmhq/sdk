---
queue: "001"
entry: S07
phase: rereview
verdict: approve
reviewed_commit: ab9e8834eb32cb379e5af314e3e67ca3e903d720
reviewer: pi
reviewed_at: "2026-07-14"
p1: 0
p2: 0
---

# Re-review 011.03: S07 Extension Graph And Lifecycle

## Verdict

`APPROVE` / `PASS`

## Scope Reviewed

- Plan: `koder/plans/001_S07_extension_lifecycle/INDEX.md`
- Initial review: `koder/reviews/011_s07_extension_lifecycle/INDEX.md`
- First re-review: `koder/reviews/011_s07_extension_lifecycle/02_rereview.md`
- Implementation sidecar: `/tmp/sdk-a2-blind-run/coord-03/S07-implement.json`
- Fix sidecars: `/tmp/sdk-a2-blind-run/coord-03b/S07-fix.json`, `/tmp/sdk-a2-blind-run/coord-03b/S07-fix2.json`
- Commits: implementation `28e1c6a62ed5cf3c76fc2ac49e4ec140195cef66`, fixes `dfd48649e591fc139840f96fed46e762318abb11` and `ab9e8834eb32cb379e5af314e3e67ca3e903d720`
- Key paths checked: `src/core/extensions.ts`, `src/core/lifecycle.ts`, extension source/type/declaration/dist tests, and generated `dist/core/extensions.*`, `dist/manifest.json`, `dist/size-report.json`

## Findings

None.

## Re-review Notes

- The original setup-rollback finding is resolved: later setup failure rolls back prior setup components in reverse deterministic order and aggregates synchronous cleanup failures with the setup failure.
- The first re-review's async rollback finding is resolved by explicit public contract text for synchronous setup rollback disposers, deterministic reporting of async rollback disposers as `extension_setup_rollback_async_disposer`, and suppression of later unhandled rejection noise; source tests cover the behavior.
- S07 plan checks remain satisfied: one owner per namespace, dependency/capability/conflict failures before setup side effects, deterministic setup/start/dispose ordering, startup rollback, aggregate disposal, frozen namespaces/APIs, strict TypeScript, and core environment neutrality.
- Generated declaration/ESM artifacts, manifest, size report, declaration consumer, type, source, coverage, and dist smoke checks are consistent with the reviewed source.
- No forbidden scope expansion was found: no `@holmhq/sdk/resources`, framework/CRDT provider, action, release/publish/tag/deploy, credentials, cross-repository edit, or Issue `#007+` work.
- TDD evidence remains credible via the implementation and fix sidecars, including the fix2 red source-test evidence for the async setup rollback path.

## Validation

| Command | Exit |
| --- | ---: |
| `npm run ci` | 0 |
| `npm run test:coverage` | 0 |
| `npm run test:source -- extensions` | 0 |
| `npm run test:types` | 0 |
| `npm run test:dist` | 0 |

Coverage from `npm run test:coverage`:

| Metric | Percent |
| --- | ---: |
| Statements | 98.92 |
| Lines | 98.68 |
| Functions | 100.00 |
| Branches | 96.24 |
| Changed reachable | 100.00 |
