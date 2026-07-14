---
status: resolved
priority: P1
created: 2026-07-13
updated: 2026-07-14
tags: transport, http, auth, cache, upload, errors
parent: 001
depends_on: [004]
source_paths:
  - packages/holm-sdk/client.js
  - packages/holm-sdk/cache.js
  - packages/holm-sdk/errors.js
type: feature
issue_kind: slice
context: Rebuild the proven client transport features behind adapter-neutral strict TypeScript contracts.
---

# Issue 005: Transport, Authentication, Cache, Uploads, and Errors

## Problem

The current Holm client already proves useful HTTP, cache, upload, and error
behavior, but its policies are global/coarse in places and browser assumptions
sit too close to the core. The new SDK needs transport primitives that work in
web and Node today and can be implemented by native/in-process adapters later.

## Required Behavior

- request/response adapter contract with method, URL, params, headers, body,
  abort signal, timing, and raw/decoded modes;
- explicit auth provider/caller proof rather than one universal cookie model;
- typed Holm error envelopes and network/abort errors;
- GET TTL, SWR, in-flight deduplication, bounded LRU, and deterministic keys;
- per-request cache policy plus tag/prefix invalidation;
- immutable/cloned consumer snapshots so callers cannot mutate canonical cache;
- cache update and background-error hooks without unobserved rejections;
- mutation invalidation declared explicitly where domain knowledge exists;
- upload abstraction supporting fetch/blob streams and web progress adapters;
- request/response hooks with secret-safe diagnostics.

Use current Holm client tests as evidence, not as an API-shape mandate.

## Acceptance Criteria

- [x] Tests are red first for cache, errors, aborts, mutation invalidation, and
      upload adapter behavior. (`S09`-`S12`; final Issue `#005` review
      `75384d1`)
- [x] TTL/SWR/dedup/LRU use a fake clock and deterministic transport. (`S10`:
      `04cab72`, fix `02f0f63`, re-review `a0a4032`)
- [x] Per-request policies can differ without creating separate client instances.
      (`S10`: `04cab72`, fix `02f0f63`, re-review `a0a4032`)
- [x] Invalidation tags support domain-aware updates; safe prefix invalidation
      remains available. (`S11`: `6a8496e`, fix `eb88125`, re-review
      `62810a5`)
- [x] Background SWR failures produce an observable event/hook and no unhandled
      promise rejection. (`S11`: `6a8496e`, fix `eb88125`, re-review
      `62810a5`)
- [x] Returned cached objects cannot mutate canonical cache state. (`S11`:
      `6a8496e`, fix `eb88125`, re-review `62810a5`)
- [x] Web cookie/session auth and Node/token auth are adapters, not core globals.
      (`S09`: `ebbd434`, review `328140a`)
- [x] Binary/raw and JSON envelopes are tested. (`S09`: `ebbd434`, review
      `328140a`; `S12`: `f9f3cd5`, fix `9107bb1`, re-review `75384d1`)
- [x] Existing Holm behavior is mapped as adopted, redesigned, or deferred with
      source paths and conformance proof. (`S12`: ledger
      `koder/evidence/001_issue005_transport_uploads/INDEX.md`, re-review
      `75384d1`)
- [x] Source, declarations, web bundle, and Node bundle tests pass. (`S12`
      validation: `npm run ci`; `npm run test:declarations`;
      `npm run test:dist`; `npm run size`)

## Slice Evidence

- A2R `S01` authority remediation adopts Holm JSON response envelope semantics for `{data,meta}` success, `{error:{code,message,details}}` failure, response-header preservation, and `/api/cmd` HTTP-200 command failure detection in `src/transports/index.ts`. Source evidence is pinned to Holm `11ceae0d88e9c800eb77916e3244fbd231ad81bb` at `internal/api/response.go`, `packages/holm-sdk/client.js`, and `internal/remote/client.go`; app/admin route-wrapper migration remains deferred to `#007`/`#008`.
- `S09` transport/auth/error contract passed at implementation `ebbd434` and independent review `328140a`; validation and coverage passed.
- `S10` caller-partitioned cache passed at implementation `04cab72`, fix `02f0f63`, and independent re-review `a0a4032`; validation and coverage passed.
- `S11` cache invalidation/diagnostics passed at implementation `6a8496e`, fix `eb88125`, and independent re-review `62810a5`; validation and coverage passed.
- `S12` upload seam/migration ledger passed at implementation `f9f3cd5`, fix `9107bb1`, and independent re-review `75384d1`; validation and coverage passed, resolving Issue `#005`.

## Non-Goals

- App/admin endpoint namespaces.
- Durable offline caches or mobile database replication.
- Framework reactive bindings.
