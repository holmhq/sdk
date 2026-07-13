---
queue: "001"
entry: S08
phase: review
verdict: needs_fixes
reviewed_commit: 37604c3ddcb28f1422ca2bd2f224049723d17237
reviewer: pi
reviewed_at: "2026-07-14"
p1: 0
p2: 1
---

# Review 012: S08 CreateHolm Lifecycle And Fakes

## Verdict

`needs_fixes`

## Scope Reviewed

- Plan: `koder/plans/001_S08_create_holm_lifecycle_fakes/INDEX.md`
- Owning issue: `koder/issues/004_universal_core/INDEX.md`
- Queue: `koder/queue/001_a2_core_foundation/INDEX.md`
- Implementation sidecar: `/tmp/sdk-a2-blind-run/coord-03b/S08-implement.json`
- Commit: `37604c3ddcb28f1422ca2bd2f224049723d17237`
- Key paths: `src/core/create-holm.ts`, `src/core/cancellation.ts`,
  `src/core/runtime.ts`, `src/core/extensions.ts`, `src/core/index.ts`,
  `src/test/index.ts`, `test/source/core/lifecycle.test.ts`,
  `test/types/lifecycle.test.ts`, `test/declarations/package-consumer.test.ts`,
  `test/dist/index.test.mjs`, and generated `dist/**` exports.

## Findings

1. **P2 - Extension namespaces can silently overwrite `createHolm` core methods.**
   S08 returns extension namespaces on the root Holm instance with
   `Object.assign(core, this.#extensionLifecycle.namespaces)`
   (`src/core/create-holm.ts:92`), but the reserved namespace list only blocks
   `lifecycle`, `capabilities`, `resources`, and `extensions`
   (`src/core/extensions.ts:128`). A valid extension namespace such as `start`,
   `invoke`, or `dispose` therefore replaces the corresponding Holm lifecycle
   method with extension API data instead of failing deterministically. That
   violates the Issue `#004` requirement that extensions cannot overwrite
   namespaces silently and corrupts S08's `createHolm` lifecycle surface. Add a
   red source/type or declaration fixture for root method namespace collisions,
   reject all root Holm property names before setup side effects, and regenerate
   the generated dist/declaration artifacts.

## Review Notes

- Red evidence is credible for the implemented lifecycle and fake paths: the
  sidecar records `npm run test:source -- lifecycle` as observed red evidence,
  and committed tests cover explicit/idempotent startup, disposal, rollback,
  cancellation, timeout, two-instance isolation, fake clock/scheduler behavior,
  in-memory adapter mutation, type fixtures, declaration consumers, and dist
  smoke exports.
- `createHolm` otherwise composes runtime startup, capability replacement,
  extension lifecycle validation, invocation caller propagation, owned
  cancellation, and injected scheduler timeouts without DOM, Node, framework,
  CRDT, transport/cache/auth, `/state`, `resources`, release, tag, deploy,
  credential, or Issue `#007+` scope expansion.
- Fake utilities are exported only from `@holmhq/sdk/test` and generated
  declarations/dist exports are present; the artifact set is consistent with the
  reviewed source except for the namespace-overwrite gap above.
- Coverage satisfies the overnight floor, but 100% changed reachable coverage is
  not sufficient because the root namespace collision path is reachable and not
  asserted.

## Validation

| Command | Exit |
| --- | ---: |
| `npm run ci` | 0 |
| `npm run test:coverage` | 0 |
| `npm run test:source -- lifecycle` | 0 |
| `npm run test:declarations` | 0 |
| `npm run test:dist` | 0 |
| `npm run size` | 0 |

Coverage from `npm run test:coverage`:

| Metric | Percent |
| --- | ---: |
| Statements | 98.54 |
| Lines | 99.12 |
| Functions | 99.54 |
| Branches | 96.90 |
| Changed reachable | 100.00 |
