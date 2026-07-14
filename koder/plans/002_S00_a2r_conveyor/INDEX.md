# Plan 002 - A2R remediation conveyor mapping (Issue 016)

## Scope and authority

- Goal: map independently testable A2 authority-remediation slices for Queue `#002`
  without executing queue work.
- Authorization: planning only for Issue `#016`; no product implementation, no queue
  execution, no Issue `#007+` activation.
- Authority: Holm runtime/protocol behavior is read-only authority as documented in
  Review `#024` and pinned source map evidence. Decisions are bounded to `D001-D015`.
- Serial model: branch `main`, single active writer, blind coordinator workflow per
  `koder/docs/BLIND_ORCHESTRATION.md`.

## Inherited constraints

- Preserve Universal App Runtime invariants and strict TypeScript layering.
- No invented Holm semantics; if evidence is insufficient or contradictory, stop and
  escalate in queue row notes.
- Keep runtime adapters optional and avoid cross-repo edits.
- Each slice must define strict TDD red target, isolated write ownership, and full
  validation command set.

## Slice table (independently testable rows)

| Slice | Proposed Plan Path / Title | Capability focus | Primary source seam | Likely write ownership | Prerequisite | Strict-TDD red target | Full validation | Est (min) | Risk | Ambiguity | Stop rule |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| S01 | `koder/plans/002_S01_holm_envelope_semantics/INDEX.md` Holm envelope semantics and `/api/cmd` conformance | Resolve Review `#024` P1-1: success/error/meta/header and explicit `/api/cmd` handling | Review `#024` + `koder/docs/HOLM_SOURCE_MAP.md` pinned authority | `src/transports/index.ts`; `test/source/transport/transport-contract.test.ts`; `test/source/transport/upload.test.ts`; `test/source/core/runtime-invocation.test.ts`; `koder/issues/005_holm_packages_migration_provenance/INDEX.md` ledger-only | none | Add failing assertions for Holm `{data,meta}`, `{error:{...}}`, and HTTP-200 `/api/cmd` command envelope semantics | `npm run test:source -- test/source/transport/transport-contract.test.ts`; `npm run test:source -- test/source/transport/upload.test.ts`; `npm run test:source -- test/source/core/runtime-invocation.test.ts`; `npm run typecheck:core` | 90 | medium | low | Stop if pinned Holm authority evidence cannot justify required envelope semantics |
| S02 | `koder/plans/002_S02_caller_transition_safety/INDEX.md` Caller transition safety and partition fencing | Resolve Review `#024` P1-2 caller partition transition/fencing defects | Review `#024` caller seams + architecture decisions | `src/core/caller.ts`; `src/state/query.ts`; `src/state/mutation.ts`; transition guard wiring in `src/transports/index.ts`; `test/source/state/caller-reset.test.ts`; `test/source/state/query.test.ts`; `test/source/state/mutation.test.ts`; `test/source/transport/cache-invalidation.test.ts` | S01 | Add failing tests that old-caller data and late completions cannot survive caller transition | `npm run test:source -- test/source/state/caller-reset.test.ts`; `npm run test:source -- test/source/state/query.test.ts`; `npm run test:source -- test/source/state/mutation.test.ts`; `npm run test:source -- test/source/transport/cache-invalidation.test.ts`; `npm run typecheck:core` | 105 | medium-high | medium | Stop if remediation requires new authorization semantics owned by Holm runtime |
| S03 | `koder/plans/002_S03_capability_extension_ownership/INDEX.md` Capability ownership and extension invocation seam | Resolve Review `#024` P1-3 control-plane ownership defect | Review `#024` + architecture/decisions for runtime ownership | `src/core/capabilities.ts`; `src/core/create-holm.ts`; `src/core/extensions.ts`; `test/source/core/capabilities.test.ts`; `test/source/core/extensions.test.ts`; `test/source/core/runtime-invocation.test.ts` | S01 | Add failing tests for public `holm.*` offer forging and missing narrow extension invocation seam | `npm run test:source -- test/source/core/capabilities.test.ts`; `npm run test:source -- test/source/core/extensions.test.ts`; `npm run test:source -- test/source/core/runtime-invocation.test.ts`; `npm run typecheck:core` | 110 | high | medium | Stop if required behavior would alter D001-D015 or invent protocol semantics |
| S04 | `koder/plans/002_S04_credential_safe_diagnostics_cache_identity/INDEX.md` Credential-safe diagnostics and cache identity | Resolve Review `#024` P1-4 secret leakage in diagnostics/cache identity | Review `#024` security findings + architecture/decisions | `src/transports/index.ts`; `src/core/cache-key.ts`; `src/transports/cache.ts`; `test/source/core/diagnostics.test.ts`; `test/source/transport/cache.test.ts`; `test/source/transport/cache-invalidation.test.ts` | S01 | Add failing tests that custom auth headers and sensitive query/path tokens leak into diagnostics/cache keys | `npm run test:source -- test/source/core/diagnostics.test.ts`; `npm run test:source -- test/source/transport/cache.test.ts`; `npm run test:source -- test/source/transport/cache-invalidation.test.ts`; `npm run typecheck:core` | 120 | high | medium | Stop if correction requires secret-management policy invention beyond approved scope |
| S05 | `koder/plans/002_S05_response_correlation_provenance/INDEX.md` Response correlation and provenance safeguards | Resolve Review `#024` P2-1 request/response cross-wiring risk | Review `#024` + message-passing architecture constraints | `src/core/invoke.ts`; optional correlation plumbing in `src/transports/index.ts`; `test/source/core/runtime-invocation.test.ts`; optional `test/source/transport/transport-contract.test.ts` | S01,S02 | Add failing tests for mismatched response `requestId`, duplicate response, and late response behavior | `npm run test:source -- test/source/core/runtime-invocation.test.ts`; `npm run test:source -- test/source/transport/transport-contract.test.ts`; `npm run typecheck:core` | 95 | medium-high | low | Stop if required correlation semantics are absent from pinned authority evidence |
| S06 | `koder/plans/002_S06_integrated_authority_return/INDEX.md` Integrated authority return and final gate | Integrated completion gate across S01-S05 with independent reviews + fresh Holm authority return | Issue `#016` acceptance + Queue `#002` done-state requirements | Integration metadata only: Issue/queue/review artifacts; no new product code ownership | S01,S02,S03,S04,S05 | First failing integrated gate command from clean checkout if any slice regressions remain | `npm run test:source`; `npm run test:types`; `npm run test:declarations`; `npm run test:dist`; `npm run test:coverage`; `npm run check:repro`; `npm run check:licenses`; `npm run size`; `npm run ci` | 115 | high | medium | Stop if fresh independent review or Holm authority acceptance is unavailable |

## DAG lock and execution order

- Hard ordering: `S01 -> S02/S03/S04`, `S02 -> S05`, and `S01..S05 -> S06`.
- No row can start until all prerequisites are approved.
- `S06` is integration-only and cannot absorb unresolved P1/P2 work from prior slices.

## Queue and review gates

- Queue `#002` remains `status: in_review` and `execution_authorized: false`.
- Launch requires independent plan re-review approval plus separate explicit owner
  authorization.
- Every implementation row must produce strict red->green->refactor evidence with
  independent review before dependent rows proceed.

## Canonical validation contract (planning stage)

- Every slice plan contains: frontmatter, capability, evidence, prerequisites,
  bounded ownership, strict TDD, first failing assertion, concrete commands,
  diff budget, acceptance, verification evidence, non-goals, and stop rules.
- All command names and paths referenced by plans/queue must exist now or be
  explicitly marked as test-first file creation.
- Planning artifacts only; no product implementation during this window.

## Review #025 disposition ledger

| Finding | Disposition | Canonical correction |
| --- | --- | --- |
| P1-1 placeholder plan bodies | Resolved | S01-S06 plan files now contain full authored Markdown plans with strict-TDD, bounded ownership, acceptance/verification, and stop rules. |
| P2-1 invalid conveyor commands | Resolved | Slice table validation commands now use real `package.json` scripts (`test:source`, `typecheck:core`, full-gate scripts) with concrete test paths. |
| P2-2 non-existent ownership paths | Resolved | Slice table ownership now points to existing A2 seams/files identified in Review `#024` and present under `src/` and `test/source/`. |
| P3-1 Issue #016 ledger count mismatch | Dispositioned (safe metadata correction) | `koder/issues/016_a2_authority_conformance_remediation/INDEX.md` updated `slice_count` to 6 to match S01-S06 plan family and queue rows. |
| P3-2 `/api/cmd` not named | Resolved | S01 title/capability/first-failing assertions explicitly name `/api/cmd` HTTP-200 command envelope handling. |
