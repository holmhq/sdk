---
title: W3 S01 - Adapter conformance harness and in-memory runtime
status: implemented
issue: 009
plan: 003
slice: S01
type: implementation
queue_candidate: 004
owner: sdk-runtime
created: 2026-07-16
updated: 2026-07-17
---

# Plan 003 S01: Adapter conformance harness and in-memory runtime

## Capability statement

Create the common runtime-adapter conformance suite and make the deterministic in-memory/test adapter the reference adapter for copied requests, caller propagation, lifecycle, cancellation, errors, unsupported capabilities, and Holm GET/POST compatibility.

## Source and build-on checks

- Read `koder/issues/009_runtime_surface_adapters/INDEX.md` and confirm Holm Issue `#534` pin `55cd8213af9878f63432586a8a58c093b3aaa47a` remains the live compatibility source.
- Build on existing seams: `src/core/runtime.ts`, `src/core/invoke.ts`, `src/test/index.ts`, `test/source/core/runtime-invocation.test.ts`, `test/dist/index.test.mjs`, and `test/declarations/package-consumer.test.ts`.
- Confirm root/core ambient constraints before implementation with `npm run typecheck:core`.

## Expected files or seam

- New shared conformance helper under `test/source/runtime-adapters/` or adjacent source-test helper.
- `test/source/test/in-memory-runtime.test.ts` or equivalent source test for the in-memory adapter.
- `src/test/index.ts` only for missing in-memory behavior needed by conformance.
- Generated `dist/test/index.{js,d.ts,js.map}` and affected root/package smoke output when public exports change.

## Red test

First add failing conformance assertions that run against `createInMemoryRuntimeAdapter` and prove:

- request payload, caller context, response payload, metadata, and binary values are copied/frozen across the boundary;
- a GET/POST app request remains represented as SDK-internal `OperationRequest` but its payload preserves Holm method/path/body/error semantics rather than inventing an action protocol;
- cancellation and duplicate/late/mismatched response behavior are deterministic;
- missing capabilities fail with typed SDK errors before handler execution;
- mutable handler output cannot be observed through later mutation.

## Implementation boundary

- Add only generic conformance fixtures and in-memory/test adapter support.
- Do not alter web runtime behavior except to import the helper only if a trivial fixture is needed.
- Do not implement Node, Sobek, bridge, action discovery, generated CLI, Default Projection, or any Holm Issue `#534` server work.
- Keep `OperationRequest` described as internal SDK adapter envelope in comments/tests; do not document it as Holm's public app protocol.

## Validation

- `npm run typecheck:core`
- `npm run test:source`
- `npm run test:types`
- `npm run build`
- `npm run test:declarations`
- `npm run test:dist`
- `npm run check:repro`
- `npm run size`

## Deferred / non-goals

- Web-specific reconciliation beyond the conformance harness adapter hook.
- Node/CLI runtime services and secure-store semantics.
- Sobek injected runtime calls.
- Desktop/mobile mailbox mocks.
- Package export expansion beyond `/test` if no public shape changes.

## Risk, ambiguity, and estimate

- Risk: yellow; conformance helpers can accidentally overfit in-memory behavior instead of shared runtime requirements.
- Ambiguity: exact helper file path may change to fit existing test-source runner conventions.
- Estimate: 90-120 minutes.

## Stop rules

Stop and ask/update planning if:

- conformance requires changing approved decisions `D001`-`D015`;
- a failing test would require a Holm feature not implemented or pinned by `#534`;
- the slice needs product files outside the expected conformance/test-runtime seam;
- generated artifacts cannot be reproduced cleanly after a public export change.
