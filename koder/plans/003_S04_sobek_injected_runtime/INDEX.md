---
title: W3 S04 - Sobek injected runtime contract
status: approved
issue: 009
plan: 003
slice: S04
type: implementation
queue_candidate: 004
owner: sdk-runtime
created: 2026-07-16
updated: 2026-07-16
---

# Plan 003 S04: Sobek injected runtime contract

## Capability statement

Add the server/Sobek injected-runtime adapter contract and fake implementation so app authoring/tests can invoke Holm-compatible GET/POST semantics without deployed server code making HTTP self-calls.

## Source and build-on checks

- Require S01 common conformance and S03 Node/CLI fetch adapter to be green.
- Read `koder/issues/009_runtime_surface_adapters/INDEX.md`, Holm Issue `#534` at `55cd8213af9878f63432586a8a58c093b3aaa47a`, `src/core/runtime.ts`, `src/app/protocol.ts`, and existing conformance helper only as needed.
- Confirm `@holmhq/sdk/sobek` is an approved architecture subpath but is not currently exported in `package.json`.

## Expected files or seam

- New `src/sobek/index.ts` and, if useful, `src/sobek/runtime.ts` for structural injected runtime types.
- Test fake under `src/sobek/testing.ts` or `src/test` only if it belongs to test support.
- `test/source/sobek/runtime.test.ts` or `test/source/runtime-adapters/sobek-conformance.test.ts`.
- `package.json`, declaration smoke, dist smoke, and generated `dist/sobek/*` only when the public subpath is added.

## Red test

First add failing tests proving:

- `sobekRuntime({ runtime: fakeInjectedRuntime })` invokes the fake injected runtime directly and does not call fetch/HTTP;
- the adapter constructs/preserves Holm `#534` canonical method/path/query/body/caller/result/error semantics through the SDK internal envelope;
- injected caller context is authoritative for the server surface and client-supplied principal hints do not override it;
- request/response payloads, binary values, and errors are copied and serializable;
- missing injected capabilities/services fail with typed unsupported errors that include adapter and surface details.

## Implementation boundary

- Define only the SDK adapter contract and fake/test helper; do not implement Holm's actual Sobek host APIs.
- No direct SQLite, filesystem, global `holm`, network self-call, or process singleton.
- The fake may model request/caller/validation/response/error semantics, but must not implement Holm Issue `#534`, action discovery, generated CLI, Default Projection, or production app dispatch.
- Keep server/Sobek declarations free of DOM types; Node types appear only if explicitly needed and isolated.

## Validation

- `npm run typecheck:core`
- `npm run test:source`
- `npm run test:types`
- `npm run test:declarations`
- `npm run test:dist`
- `npm run build`
- `npm run check:repro`
- `npm run size`

## Deferred / non-goals

- Production Sobek runtime integration inside Holm.
- HTTP fallback for server/Sobek.
- Generated contract tests/cartridge runner.
- Action discovery or Issue `#010` helpers.
- Default Projection.

## Risk, ambiguity, and estimate

- Risk: yellow; the contract must avoid inventing Holm host APIs while still being testable.
- Ambiguity: final Sobek host method names remain Holm-owned; keep SDK types structural and adapter-owned.
- Estimate: 90-120 minutes.

## Stop rules

Stop and escalate if:

- a production Holm/Sobek API is required but not present in pinned authority;
- the fake begins to substitute for Holm Issue `#534` implementation;
- any implementation reaches over HTTP to the same deployed server;
- adding the subpath creates declaration or dist reproducibility drift that cannot be fixed in-slice.
