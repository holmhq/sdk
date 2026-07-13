---
queue: "001"
entry: S07
phase: review
verdict: needs_fixes
reviewed_commit: 28e1c6a62ed5cf3c76fc2ac49e4ec140195cef66
reviewer: pi
reviewed_at: "2026-07-14"
p1: 0
p2: 1
---

# Review 011: S07 Extension Graph And Lifecycle

## Verdict

`needs_fixes`

## Scope Reviewed

- Plan: `koder/plans/001_S07_extension_lifecycle/INDEX.md`
- Owning issue: `koder/issues/004_universal_core/INDEX.md`
- Architecture/decisions: `koder/docs/ARCHITECTURE.md`, `koder/docs/DECISIONS.md`
- Implementation sidecar: `/tmp/sdk-a2-blind-run/coord-03/S07-implement.json`
- Commit: `28e1c6a62ed5cf3c76fc2ac49e4ec140195cef66`
- Key paths: `src/core/extensions.ts`, `src/core/lifecycle.ts`,
  `src/core/index.ts`, `src/index.ts`,
  `test/source/core/extensions.test.ts`, `test/types/extensions.test.ts`,
  `test/declarations/package-consumer.test.ts`, `test/dist/index.test.mjs`,
  generated `dist/core/{extensions,lifecycle,index}.*`, `dist/index.*`,
  `dist/manifest.json`, and `dist/size-report.json`

## Findings

1. **P2 - Setup failure leaks already-created extension components instead of
   rolling them back.** S07's plan and review contract require setup/start
   rollback, but `setupComponents(...)` only wraps the currently failing
   `setup(...)` call and immediately throws `extension_setup_failed`; it never
   disposes the components that were successfully set up earlier in the
   deterministic order (`src/core/extensions.ts:400`). A later extension setup
   failure can therefore leave earlier extension side effects, listeners, or
   allocated resources alive even though `createExtensionLifecycle(...)` fails
   and returns no lifecycle handle to dispose. The committed setup-failure test
   covers only a single failing setup (`test/source/core/extensions.test.ts:219`)
   and does not assert reverse cleanup or aggregation for prior setup results.
   Add a red source test for a later setup failure after at least one prior
   setup returned a disposer, implement reverse setup rollback, aggregate any
   rollback failures with the setup failure, and regenerate/update the generated
   dist artifacts.

## Review Notes

- TDD red evidence is partially credible for the existing S07 paths: the
  implementation sidecar records `npm run test:source -- extensions` as observed
  red evidence, and the committed source/type tests define duplicate IDs,
  duplicate namespaces, incompatible dependencies, cycles, conflicts, ordering,
  start rollback, disposal, aggregate disposal, and readonly namespace/type
  behavior. The missing setup-rollback path above is the uncovered contract gap.
- Extension graph validation is deterministic and fail-closed for duplicate IDs,
  duplicate namespaces, reserved namespaces, missing or incompatible extension
  dependencies, cycles, conflicts declared by either side, and capability
  requirements before setup side effects.
- Public extension descriptors, namespace maps, APIs, lifecycle snapshots, and
  generated declaration exports are frozen/readonly at the reviewed boundaries.
- Core remains strict TypeScript and environment-neutral; no DOM, Node,
  framework, CRDT, release/publish/tag/deploy, cross-repository, `resources`
  subpath, or Issue `#007+` scope expansion was found.
- Generated declarations, generated ESM, manifest, size report, declaration
  consumer checks, and dist smoke tests match the reviewed source behavior, but
  they include the setup-rollback gap above.

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
| Statements | 98.88 |
| Lines | 98.64 |
| Functions | 100.00 |
| Branches | 96.17 |
| Changed reachable | 100.00 |
