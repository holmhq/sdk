---
plan_family: 001
slice: S12
title: Upload Seam And Migration Ledger
owning_issue: 005
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: [S11]
queue: 001_a2_core_foundation
---

# Plan 001 S12: Upload Seam And Migration Ledger

Capability: Complete Issue #005 with upload/progress seams, secret-safe conformance/migration ledger, web/Node artifacts, and size evidence.

## Preflight

- Build on: S09-S11 transport/auth/cache/invalidation/diagnostics.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: upload composition/progress/abort/binary diagnostics and migration-ledger checks fail. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: upload adapter seam, source-pinned Issue #005 behavior ledger, web/Node artifact proof, size report.
- Refactor: keep progress structural and runtime-isolated; make ledger concise and checkable where practical.

## Expected Paths And Budget

- Paths: `src/transports/upload.ts, src/web/upload.ts, src/node/upload.ts, test/transport/upload.test.ts, koder evidence ledger, dist/**`.
- Diff budget: 600-1000 LOC plus dist/ledger.

## Final Validation

- `npm run ci`; `npm run test:source -- upload`; `npm run test:declarations`; `npm run test:dist`; `npm run size`

## Acceptance Criteria

- upload/progress avoids core ambients; ledger classifies source behavior; web/Node artifacts pass smoke and size evidence.

## Stop Or Split Rules

- Stop if source contradicts architecture; split upload and ledger if together exceed 120m.

## Defers And Non-Goals

- App/admin wrappers, offline upload queues, npm release.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 120m; risk high; ambiguity medium; harnex-chain; 10-22 files / 600-1000 LOC plus dist.
