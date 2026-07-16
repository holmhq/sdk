---
title: W3 S02 - Web runtime conformance reconciliation
status: in_review
issue: 009
plan: 003
slice: S02
type: implementation
queue_candidate: 004
owner: sdk-runtime
created: 2026-07-16
updated: 2026-07-16
---

# Plan 003 S02: Web runtime conformance reconciliation

## Capability statement

Reconcile the already-shipped web Fetch runtime with the common adapter conformance suite while preserving Issue `#007` app/web behavior and Holm Issue `#534` GET/POST compatibility.

## Source and build-on checks

- Require S01 conformance helper to exist and pass for in-memory before this slice starts.
- Read `koder/issues/009_runtime_surface_adapters/INDEX.md`, `src/web/runtime.ts`, `src/web/index.ts`, `src/app/protocol.ts`, `test/source/web/runtime.test.ts`, and `test/source/web/app.test.ts` only as needed.
- Confirm the current web capability remains `holm.http.app` and operation `request`; this is SDK-internal dispatch over canonical app GET/POST routes, not a competing Holm action protocol.

## Expected files or seam

- `test/source/web/runtime.test.ts` or new `test/source/runtime-adapters/web-conformance.test.ts` for the web adapter's conformance instantiation.
- `src/web/runtime.ts` only for minimal fixes needed by conformance.
- Affected `dist/web/*`, declarations, maps, and package smoke files if source changes.

## Red test

First add failing assertions that run the common conformance suite against `webRuntime` with an injected fetch and prove:

- GET and POST app requests preserve method, normalized app path, query, JSON body, response envelope, stable error code, headers, and request ID correlation;
- web session auth and bearer auth remain private and are never copied into caller context, diagnostics, cache keys, serialized errors, or public snapshots;
- caller fingerprints partition GET cache reuse across web member/session changes;
- unsupported operations/capabilities fail before fetch/auth proof resolution;
- cancellation aborts fetch when possible and ignores late responses.

## Implementation boundary

- Preserve Issue `#007` public app/web API shape, route ledger, URL containment protections, cache behavior, upload/lifecycle/bootstrap helpers, and BFBB examples.
- Do not rewrite the web adapter into a platform switch or move DOM/fetch types into core.
- Do not add action discovery, Default Projection, generated CLI, or any new Holm route behavior.
- If Holm `#534` semantics reveal a mismatch, adapt only SDK request/response normalization needed to preserve canonical GET/POST semantics; do not implement Holm server-side validation.

## Validation

- `npm run test:source`
- `npm run test:types`
- `npm run test:declarations`
- `npm run test:dist`
- `npm run test:examples`
- `npm run build`
- `npm run check:repro`
- `npm run size`

## Deferred / non-goals

- Node/CLI runtime and secure-store services.
- Sobek injected runtime.
- Desktop/mobile mailbox contracts.
- Admin runtime coverage.
- Holm Issue `#534` implementation inside Holm.

## Risk, ambiguity, and estimate

- Risk: yellow; web runtime is security-sensitive because prior reviews found URL/auth containment bugs.
- Ambiguity: conformance fixtures must not require browser globals beyond the web subpath.
- Estimate: 90-120 minutes.

## Stop rules

Stop and escalate if:

- conformance would weaken URL containment or auth redaction from Issue `#007`;
- any test suggests treating `OperationRequest` as a public Holm protocol;
- a required behavior belongs to Holm server/app runtime instead of the SDK adapter;
- generated web dist cannot be reproduced cleanly.
