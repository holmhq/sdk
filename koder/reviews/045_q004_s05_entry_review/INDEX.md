---
title: Q004 S05 entry review
status: needs_fixes
issue: 009
queue: 004
entry: S05
reviewed_commit: dc024bc0315441051c0d4b73a11acea776a66b66
reviewed_range: 8be8133f9d706a45203c01834f5d1c2838579e48..dc024bc0315441051c0d4b73a11acea776a66b66
verdict: needs_fixes
p1_count: 0
p2_count: 1
p3_count: 0
commands:
  npm_run_typecheck_core: 0
  npm_run_test_source: 0
  npm_run_test_types: 0
  npm_run_test_declarations: 0
  npm_run_test_dist: 0
  npm_run_build: 0
  npm_run_check_repro: 0
  npm_run_size: 0
  git_status_short_untracked_all: 0
created: 2026-07-17
---

# Q004 S05 entry review

## Verdict

`needs_fixes` — P1: 0, P2: 1, P3: 0.

## Findings

### P2 — Bridge mailbox validates late/duplicate response payloads instead of ignoring them by request ID

`src/bridge/index.ts` copies and validates a whole incoming envelope before checking whether a `response` or `error` request ID is still pending. After a request is already settled, a duplicate/late response with the same request ID but a non-wire payload still throws `invalid_wire_value` from `copyWireValue()` instead of returning `false` as an ignored late/duplicate message.

This violates the S05 mailbox contract to correlate request IDs and ignore late/duplicate messages. It also leaves the native-loop boundary fail-open to already-terminal mailbox traffic: stale host messages can surface as new SDK errors even though their request ID is no longer active.

Required fix: for incoming `response`/`error` envelopes, validate the protocol/kind and request ID first, check pending correlation, and return `false` for non-pending IDs before copying/validating payload/error details. Add a source or dist test that settles a request, then verifies duplicate/late responses with invalid payload/error content are ignored rather than thrown.

## Validation

All required validation commands exited 0:

- `npm run typecheck:core`
- `npm run test:source`
- `npm run test:types`
- `npm run test:declarations`
- `npm run test:dist`
- `npm run build`
- `npm run check:repro`
- `npm run size`
- `git status --short --untracked-files=all`

Additional review checks: generated `dist/bridge/*` artifacts and `dist/manifest.json` are present and reproducible; `package.json` exposes `@holmhq/sdk/bridge`; bridge source and type tests keep DOM/Node ambient types out of root/core; reserved runtimes advertise no production desktop/mobile Holm capabilities. Git was clean before filing this review artifact.
