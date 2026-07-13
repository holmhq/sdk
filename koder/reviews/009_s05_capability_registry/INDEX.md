---
queue: "001"
entry: S05
phase: review
verdict: approve
reviewed_commit: e3e518d4f2ed8df6a965e3d3525d4e0dd98a27c7
reviewer: codex
reviewed_at: "2026-07-14"
p1: 0
p2: 0
---

# Review 009: S05 Capability Registry And Negotiation

## Verdict

Approve. I found zero P1 and zero P2 findings.

## Scope Reviewed

- Plan: `koder/plans/001_S05_capability_registry/INDEX.md`
- Owning issue: `koder/issues/004_universal_core/INDEX.md`
- Architecture/decisions: `koder/docs/ARCHITECTURE.md`, `koder/docs/DECISIONS.md`
- Implementation sidecar: `/tmp/sdk-a2-blind-run/coord-02/S05-implement.json`
- Commit: `e3e518d4f2ed8df6a965e3d3525d4e0dd98a27c7`
- Key paths: `src/core/capabilities.ts`, `src/core/errors.ts`,
  `test/source/core/capabilities.test.ts`, `test/types/capabilities.test.ts`,
  `test/declarations/package-consumer.test.ts`, `test/dist/index.test.mjs`,
  `dist/core/capabilities.js`, `dist/core/capabilities.d.ts`,
  `dist/manifest.json`, `dist/size-report.json`

## Review Notes

- TDD red evidence is credible for this slice: the implementation sidecar records
  `npm run test:source -- capabilities` as observed red evidence before the S05
  production changes, and the committed tests directly define the S05 behavior.
- Behavior-focused tests cover missing/invalid ID, major mismatch, minor too low,
  duplicate offers, immutable snapshots/offers, and subscription replacement,
  unsubscribe, listener mutation, and listener failure behavior.
- Negotiation is fail-closed and happens through `require(...)` /
  `negotiateCapability(...)` before any runtime invocation exists in this slice.
  Missing IDs and version mismatches are distinct typed `HolmError` subclasses
  with actionable requirement/offered details.
- Snapshot construction normalizes and freezes copied offers, rejects duplicate
  identical id/major/minor offers before publishing, and picks the highest
  compatible minor for same-major requirements.
- S05 does not sniff Holm version strings, does not invent canonical Holm IDs,
  and does not add forbidden runtime invocation, transport, state/resources,
  framework, release, or Issue `#007+` work.
- Generated declarations, generated ESM, manifest, size report, declaration
  consumer checks, and dist smoke tests match the reviewed source behavior.

## Validation

| Command | Exit |
| --- | ---: |
| `npm run ci` | 0 |
| `npm run test:coverage` | 0 |
| `npm run test:source -- capabilities` | 0 |
| `npm run test:types` | 0 |
| `npm run test:dist` | 0 |

Coverage from `npm run test:coverage`:

| Metric | Percent |
| --- | ---: |
| Statements | 98.63 |
| Lines | 98.75 |
| Functions | 100.00 |
| Branches | 96.17 |
| Changed reachable | 100.00 |

## Findings

None.
