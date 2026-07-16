---
title: Q004 S04 entry review
status: needs_fixes
issue: 009
queue: 004
entry: S04
reviewed_commit: 116a8e5bed5e02afa82af6cae542bb4cecc4c14f
reviewed_range: f1f06dcd39a55fc646d2f0f68221fa851c1e27a2..116a8e5bed5e02afa82af6cae542bb4cecc4c14f
verdict: needs_fixes
p1: 0
p2: 1
p3: 0
created: 2026-07-17
---

# Q004 S04 entry review

## Verdict

`needs_fixes` — P1: 0, P2: 1, P3: 0.

## Findings

### P2 — Sobek adapter forwards SDK transport body wrappers instead of Holm canonical JSON bodies

`src/sobek/runtime.ts` copies `payload.body` directly into `SobekInjectedRequest.body`. When callers use the public app HTTP client (`holm.app.http.post()` / `request()`), that payload is a `TransportRequest` whose body is `{ mode: "json", value: <json> }`; the injected Sobek runtime therefore receives the SDK transport wrapper rather than the Holm Issue `#534` canonical request body JSON value. A direct composition check with `createHolm({ runtime: sobekRuntime(...) })` and `createAppExtension()` sends `body: { mode: "json", value: { title: "x" } }` to the injected runtime for `POST /api/tasks`, while the S04 plan and Holm `#534` require the canonical envelope to preserve the actual JSON body (`{ title: "x" }`) across HTTP/CLI/local adapters. This breaks the semantics-preserving Sobek boundary for normal SDK app callers and the current tests only cover hand-built operation payloads.

Required fix: adapt `TransportRequest` body modes into the canonical Sobek envelope before invoking the injected runtime (at minimum unwrap `mode: "json"` to its `value`, with explicit behavior/tests for raw/binary or unsupported modes) and add a source or dist test that exercises `createHolm` + `createAppExtension` + `sobekRuntime`.

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

Additional review checks: generated `dist/sobek/*` artifacts are present and reproducible; `src/sobek/*` contains no `fetch`, global `holm`, SQLite, filesystem, HTTP self-call, or production host API path. Git was clean before filing this review artifact.
