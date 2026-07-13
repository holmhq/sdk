---
queue: 001
entry: S04
phase: review
verdict: needs_fixes
implementation_commit: 69554db46a917f536d3e1eee1401cb02831f2a8d
reviewed_at: "2026-07-14"
p1: 0
p2: 2
---

# Review 008: S04 Wire Value And Error Foundation

## Verdict

`needs_fixes`

## Findings

1. **P2 - Byte tag encoding does not match the approved D006 wire contract.**
   The architecture fixes the canonical JSON byte tag as
   `{"$holm":"bytes","base64":"AA=="}` and requires canonical encoding to be
   stable for hashing/fixtures (`koder/docs/ARCHITECTURE.md:430`). The
   implementation instead exposes `HolmBytesTag.data`, emits `data` from
   `toJSON()`, accepts only `data` tags, and intentionally rejects padded
   base64 (`src/core/wire-value.ts:16`, `src/core/wire-value.ts:48`,
   `src/core/wire-value.ts:131`, `src/core/wire-value.ts:205`). This bakes a
   different wire shape into source, declarations, dist, and tests, so future
   adapters/mailboxes would not interoperate with the reviewed D006 contract.

2. **P2 - Serialized error details can return forged/mutable byte-like objects
   that are not validated or copied `WireValue`s.** `SerializedHolmError`
   declares `details?: WireValue`, and D006 requires values to be validated and
   copied at boundaries (`koder/docs/ARCHITECTURE.md:436`). `redactDetail()`
   returns any object with `$holm: "bytes"`, `toUint8Array`, and `toJSON`
   directly as `WireValue` (`src/core/errors.ts:159`,
   `src/core/errors.ts:172`, `src/core/errors.ts:213`). A caller-supplied
   object can therefore survive `HolmError.toJSON()` without SDK-owned byte
   branding, copying, canonical tag validation, or redaction, and the returned
   value may fail `copyWireValue()` later despite the serialized type.

## Checks

| Command | Exit |
| --- | ---: |
| `npm run ci` | 0 |
| `npm run test:coverage` | 0 |
| `npm run test:source -- wire-value` | 0 |
| `npm run test:source -- errors` | 0 |
| `npm run test:types` | 0 |
| `npm run test:dist` | 0 |

Coverage: statements `98.41`, lines `98.38`, functions `100.00`, branches
`96.24`, changed reachable `100.00`.

## Notes

- TDD red evidence in `/tmp/sdk-a2-blind-run/coord-02/S04-implement.json` is
  present for `npm run test:source -- wire-value`.
- Generated declarations and dist artifacts are present and validated by
  `npm run ci`, `npm run test:types`, and `npm run test:dist`, but they reflect
  the byte tag mismatch above.
- I saw no transport, resources/state, framework, release, deploy, credential,
  cross-repository edit, or Issue `#007+` work in this slice.
