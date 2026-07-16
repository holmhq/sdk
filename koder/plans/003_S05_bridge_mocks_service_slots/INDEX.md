---
title: W3 S05 - Reserved bridge mocks and service slots
status: in_review
issue: 009
plan: 003
slice: S05
type: implementation
queue_candidate: 004
owner: sdk-runtime
created: 2026-07-16
updated: 2026-07-16
---

# Plan 003 S05: Reserved bridge mocks and service slots

## Capability statement

Add reserved desktop/mobile bridge interfaces, safe mocks, lifecycle/connectivity/secure-storage/deep-link/navigation/background service slots, and typed unsupported behavior without claiming production native runtime support.

## Source and build-on checks

- Require S01 conformance helper and S04 Sobek injected-runtime contract to be green.
- Build on `src/core/runtime.ts`, `src/core/wire-value.ts`, `src/core/errors.ts`, existing web lifecycle/navigation helpers, and package/declaration smoke tests.
- Confirm architecture decisions `D006`, `D010`, `D011`, and `D013` remain the boundary for mailbox copy, lifecycle, errors, and subpath isolation.

## Expected files or seam

- New `src/bridge/index.ts` and optional `src/bridge/mailbox.ts`, `src/bridge/services.ts`, `src/bridge/mock.ts`.
- `test/source/bridge/mailbox.test.ts` or `test/source/runtime-adapters/bridge-conformance.test.ts`.
- `test/types` and declaration fixtures for `@holmhq/sdk/bridge`.
- `package.json` export update and generated `dist/bridge/*` artifacts if public subpath is added.

## Red test

First add failing tests proving:

- desktop and mobile constructors/interfaces are explicitly reserved and cannot be mistaken for production runtime offers;
- mailbox request/response/event/cancel envelopes copy/freeze `WireValue` and bytes, correlate request IDs, ignore late/duplicate messages, and reject closures, class instances, cyclic data, DOM/native handles, and shared mutable resource objects;
- missing secure-storage, lifecycle, connectivity, deep-link/navigation, or background services produce typed unsupported errors rather than absent methods or silent fallbacks;
- mocks can negotiate capabilities for tests but production adapters advertise no desktop/mobile Holm capabilities until injected/probed;
- bridge types do not pull DOM, Node, framework, or CRDT ambient declarations into root/core.

## Implementation boundary

- Provide TypeScript contracts and deterministic mocks only.
- No production desktop shell, mobile native client, offline database, GUI opening, local notifications, or native code generation.
- No universal UI DSL and no direct SQLite/native handle crossing.
- Service slots are explicit injected interfaces; they do not become a mutable service locator for extensions.

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

- Production desktop/mobile runtime probes.
- Native secure-store implementations.
- Mobile offline sync or CRDT substrate.
- Framework/native UI generation.
- Realtime/private channel behavior.

## Risk, ambiguity, and estimate

- Risk: yellow; the public types must be useful for future runtimes but fail closed today.
- Ambiguity: exact native bridge host vocabulary is reserved; keep protocol names versioned and minimal.
- Estimate: 90-120 minutes.

## Stop rules

Stop and escalate if:

- a mock would need to advertise an unimplemented Holm production capability;
- any native/shared mutable object crosses the mailbox boundary;
- the bridge subpath contaminates root/core or existing web/node declarations;
- the slice grows into production desktop/mobile implementation.
