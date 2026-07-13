---
plan_family: 001
slice: S09
title: Transport Contract Auth And Errors
owning_issue: 005
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: [S08]
queue: 001_a2_core_foundation
---

# Plan 001 S09: Transport Contract Auth And Errors

Capability: Add transport request/response contracts, auth-proof seams, abort/error normalization, and JSON/raw/binary fixtures.

## Preflight

- Build on: Reviewed Issue #004 core.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: request shape, response modes, abort, remote/protocol errors, redaction, web session, and Node token tests fail. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: transport contract, web-session and Node-token auth seams, error normalization, JSON/raw/binary fixtures.
- Refactor: keep endpoint payloads generic; share conformance fixtures across web and Node.

## Expected Paths And Budget

- Paths: `src/transports/**, src/web/**, src/node/**, test/transport/**, test/conformance/transport/**, test/dist/**`.
- Diff budget: 650-1050 LOC.

## Final Validation

- `npm run ci`; `npm run test:source -- transport`; `npm run test:declarations`; `npm run test:dist`; `npm run size`

## Acceptance Criteria

- transport modes are typed; auth proof stays private/redacted; abort/cancellation normalizes across adapters.

## Stop Or Split Rules

- Stop if endpoint payloads are required; split web and Node implementations if both cannot fit.

## Defers And Non-Goals

- Cache policy, upload progress, app/admin namespaces, route migration.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 115m; risk high; ambiguity medium; harnex-chain; 10-22 files / 650-1050 LOC.
