---
title: W3 S03 - Node CLI runtime services
status: implemented
issue: 009
plan: 003
slice: S03
type: implementation
queue_candidate: 004
owner: sdk-runtime
created: 2026-07-16
updated: 2026-07-16
---

# Plan 003 S03: Node/CLI runtime services

## Capability statement

Add a Node/CLI runtime adapter over injected fetch, explicit token/operator auth, environment services, and secure-store services, and make it pass the common adapter conformance suite without importing Node types into core.

## Source and build-on checks

- Require S01 conformance helper and S02 web reconciliation to be green.
- Build on `src/node/index.ts`, `src/node/upload.ts`, `src/transports/index.ts`, `src/core/runtime.ts`, `test/source/transport/web-node-auth.test.ts`, `test/types/node-ambient-opt-in.test.ts`, and package export/declaration smoke tests.
- Confirm `package.json` already exports `./node` and that root/core typechecks remain ambient-free.

## Expected files or seam

- `src/node/runtime.ts` for `nodeRuntime(...)` or equivalent explicit adapter.
- `src/node/services.ts` for structural environment and secure-store service contracts if needed.
- `src/node/index.ts` export updates.
- `test/source/node/runtime.test.ts` or `test/source/runtime-adapters/node-conformance.test.ts`.
- `test/types/node-ambient-opt-in.test.ts`, declaration consumers, dist smoke, and generated `dist/node/*` artifacts if public API changes.

## Red test

First add failing Node/CLI conformance tests proving:

- a CLI/operator caller uses explicit token or injected credential proof and never infers web cookies;
- fetch, environment lookup, secure-store access, clock, scheduler, and diagnostics are injected services, not ambient core dependencies;
- missing optional services throw typed unsupported-capability/service errors with adapter/surface details;
- GET/POST transport behavior matches the common conformance cases and preserves Holm response/error semantics;
- auth proof is redacted from diagnostics, cache keys, caller context, and serialized errors.

## Implementation boundary

- Reuse transport helpers rather than duplicating web runtime internals.
- Node ambient types may appear only under `src/node/**`, node-specific tests, and node declaration fixtures.
- Do not read process environment or filesystem by default; require explicit service injection for environment and secure-store behavior.
- Do not implement a local Holm process dispatcher in this slice; remote fetch/token CLI is enough.
- Do not add generated CLI commands or action discovery.

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

- Sobek injected runtime and local process optimization.
- Generated Holm CLI projection over app contracts.
- Default Projection and action discovery.
- Desktop/mobile secure-store implementations.
- Admin/operator namespace migration beyond auth/runtime services.

## Risk, ambiguity, and estimate

- Risk: yellow; accidentally touching ambient `process`, filesystem, or Node types from root/core would violate the architecture.
- Ambiguity: exact secure-store method names are SDK service contracts, not Holm protocol.
- Estimate: 90-120 minutes.

## Stop rules

Stop and escalate if:

- implementation needs implicit process/env/fs access rather than explicit injection;
- an in-process local dispatcher appears necessary to satisfy acceptance;
- node types leak into root/core declarations;
- conformance requires unapproved Holm action/CLI behavior.
