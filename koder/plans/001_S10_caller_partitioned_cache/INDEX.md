---
plan_family: 001
slice: S10
title: Caller Partitioned GET Cache
owning_issue: 005
type: implementation
status: approved
created: 2026-07-14
updated: 2026-07-14
depends_on: [S09]
queue: 001_a2_core_foundation
---

# Plan 001 S10: Caller Partitioned GET Cache

Capability: Implement deterministic caller-partitioned GET cache with TTL, SWR, in-flight deduplication, bounded LRU, and per-request policy.

## Preflight

- Build on: S09 transport plus S06 caller fingerprints.
- Confirm clean, synced SDK `main`; A2 still covers Issues #003-#006 and stops before Issue #007.
- Confirm architecture, decisions, and owning issue have no contradictory drift; stop for replan on drift.

## TDD Flow

- Red: fake-clock tests for TTL, SWR, dedup, LRU, per-request policy, and caller/source partitioning fail. Capture command, exit status, and shortest useful failure excerpt in review/queue evidence before production code.
- Green: canonical non-secret cache keys, TTL/SWR scheduling, in-flight dedupe, bounded LRU, request policies.
- Refactor: keep cache policy separate from resources and endpoint domain knowledge.

## Expected Paths And Budget

- Paths: `src/transports/cache.ts, src/core/cache-key.ts, test/transport/cache.test.ts, test/types/**, dist manifests`.
- Diff budget: 550-900 LOC.

## Final Validation

- `npm run ci`; `npm run test:source -- cache`; `npm run test:types`; `npm run test:dist`

## Acceptance Criteria

- cache behavior is deterministic; entries partition by caller/source; per-request policies avoid new instances.

## Stop Or Split Rules

- Stop if defaults need owner decision; split if LRU/SWR interaction exceeds 120m.

## Defers And Non-Goals

- Invalidation hooks, mutation invalidation, resources, offline cache.
- No release, publish, tag, deploy, credentials, cross-repo edits, or Issue #007+ work.

## Queue Hints

- 105m; risk medium-high; ambiguity medium; harnex-chain; 6-12 files / 550-900 LOC.
