---
queue: "001"
entry: S07
phase: rereview
verdict: needs_fixes
reviewed_commit: dfd48649e591fc139840f96fed46e762318abb11
reviewer: pi
reviewed_at: "2026-07-14"
p1: 0
p2: 1
---

# Re-review 011.02: S07 Extension Graph And Lifecycle

## Verdict

`needs_fixes`

## Scope Reviewed

- Plan: `koder/plans/001_S07_extension_lifecycle/INDEX.md`
- Initial review: `koder/reviews/011_s07_extension_lifecycle/INDEX.md`
- Implementation sidecar: `/tmp/sdk-a2-blind-run/coord-03/S07-implement.json`
- Fix sidecar: `/tmp/sdk-a2-blind-run/coord-03b/S07-fix.json`
- Commits: implementation `28e1c6a62ed5cf3c76fc2ac49e4ec140195cef66`, review `909d3ac7a607fae7def32c1f1fb20c62270cb9ef`, fix `dfd48649e591fc139840f96fed46e762318abb11`
- Key paths: `src/core/extensions.ts`, `test/source/core/extensions.test.ts`, generated `dist/core/extensions.js`, `dist/manifest.json`, and `dist/size-report.json`

## Findings

1. **P2 - Setup rollback still drops async cleanup failures instead of aggregating all rollback failures.** The fix adds reverse setup rollback and a source test for synchronous disposer failure, but `disposeSetupComponents(...)` only records synchronous throws; when a prior setup component's public `dispose?(): void | Promise<void>` returns a rejecting promise, the promise is caught and discarded. `createExtensionLifecycle(...)` then throws `extension_setup_failed` without including that cleanup failure in its cause, even though the initial required fix asked to aggregate rollback failures with the setup failure and S07 requires rollback/aggregate disposal. This leaves async setup cleanup failures unreported and makes rollback completion nondeterministic for callers that receive no lifecycle handle after construction fails. Add coverage for an async setup rollback disposer failure and either aggregate it through an explicit async rollback path or narrow/document the setup rollback contract so the public API and behavior are deterministic.

## Re-review Notes

- The synchronous part of the initial finding is improved: a later setup failure now invokes prior setup disposers in reverse order, the new source test covers the reverse order and a synchronous cleanup failure, and generated ESM/manifest/size artifacts were regenerated.
- Graph validation, namespace ownership, dependency/conflict checks before side effects, deterministic setup/start/dispose order, frozen public APIs, strict TypeScript, and core environment neutrality still appear within S07 scope.
- No forbidden scope expansion, `@holmhq/sdk/resources` subpath, publish/release/tag/deploy, credentials, cross-repository edits, framework binding, CRDT provider, action, or Issue `#007+` work was found.
- Required TDD red evidence remains recorded in the implementation and fix sidecars, but the remaining async rollback branch needs its own failing behavior test before a fix.

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
| Statements | 98.72 |
| Lines | 98.52 |
| Functions | 99.32 |
| Branches | 96.02 |
| Changed reachable | 100.00 |
