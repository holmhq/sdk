---
plan_family: 001
slice: S01
title: Strict Configs And Red Core Fixture
owning_issue: 003
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: []
queue: 001_a2_core_foundation
---

# Plan 001 S01: Strict Configs And Red Core Fixture

Capability: Establish strict SDK TypeScript/tool selection and prove the core ambient boundary with a deliberately failing fixture before it turns green.

## Preflight

- Build on: A1 approval and Issue #003 only; first A2 implementation slice.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: ambient DOM/Node core fixture and first source test fail before scaffold. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: minimal MIT-compatible TS/test/type toolchain, strict base/core/runtime configs, private package metadata.
- Refactor: normalize scripts and fixture layout; record license rationale without publishing.

## Expected Paths And Budget

- Paths: `package.json, lockfile, tsconfig*.json, src/core/**, test/types/**, red evidence note`.
- Diff budget: 350-650 LOC plus lockfile.

## Final Validation

- `npm run typecheck:core`; `npm run test:source`; `npm run test:types`

## Acceptance Criteria

- core rejects DOM/Node globals; runtime configs opt in explicitly; red evidence captured; no real capability code.

## Stop Or Split Rules

- Stop on unclear license; split if setup/build scope exceeds 120m.

## Defers And Non-Goals

- Generated ESM, CI, size reports, endpoint behavior, `/state`.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 90m; risk medium; ambiguity low; harnex-light; 8-16 files / 350-650 LOC plus lockfile.
