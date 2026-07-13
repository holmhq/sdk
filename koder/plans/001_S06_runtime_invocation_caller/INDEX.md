---
plan_family: 001
slice: S06
title: Runtime Invocation And Caller Boundary
owning_issue: 004
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: [S05]
queue: 001_a2_core_foundation
---

# Plan 001 S06: Runtime Invocation And Caller Boundary

Capability: Introduce copied runtime-adapter invocation envelopes with per-call caller resolution, fingerprints, and partition hooks.

## Preflight

- Build on: S04 wire values/errors and S05 capability matching.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: fresh caller, non-secret fingerprint, copied request/response, late mutation isolation, and pre-invocation capability failure tests fail. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: runtime adapter/request/response/caller/control types plus invocation helper and caller-change hooks.
- Refactor: keep auth proof adapter-private; keep test adapters deterministic and ambient-free.

## Expected Paths And Budget

- Paths: `src/core/runtime.ts, src/core/caller.ts, src/core/invoke.ts, test/core/runtime-invocation.test.ts, test/types/**`.
- Diff budget: 550-950 LOC.

## Final Validation

- `npm run ci`; `npm run test:source -- runtime`; `npm run test:types`; `npm run test:dist`

## Acceptance Criteria

- every call carries fresh copied context/payload; fingerprints are deterministic/non-secret; later layers can partition safely.

## Stop Or Split Rules

- Stop if client-side auth semantics must be invented; split if production web/node transports are required.

## Defers And Non-Goals

- HTTP transport, auth proof providers, cache, resources, Sobek/native bridges.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 110m; risk medium-high; ambiguity medium; harnex-chain; 7-14 files / 550-950 LOC.
