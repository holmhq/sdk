---
status: open
priority: P1
created: 2026-07-13
updated: 2026-07-13
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

- [ ] Tests are red first for cache, errors, aborts, mutation invalidation, and
      upload adapter behavior.
- [ ] TTL/SWR/dedup/LRU use a fake clock and deterministic transport.
- [ ] Per-request policies can differ without creating separate client instances.
- [ ] Invalidation tags support domain-aware updates; safe prefix invalidation
      remains available.
- [ ] Background SWR failures produce an observable event/hook and no unhandled
      promise rejection.
- [ ] Returned cached objects cannot mutate canonical cache state.
- [ ] Web cookie/session auth and Node/token auth are adapters, not core globals.
- [ ] Binary/raw and JSON envelopes are tested.
- [ ] Existing Holm behavior is mapped as adopted, redesigned, or deferred with
      source paths and conformance proof.
- [ ] Source, declarations, web bundle, and Node bundle tests pass.

## Slice Evidence

- `S09` transport/auth/error contract passed at implementation `ebbd434` and independent review `328140a`; validation and coverage passed.
- `S10` caller-partitioned cache passed at implementation `04cab72`, fix `02f0f63`, and independent re-review `a0a4032`; validation and coverage passed.
- `S11` cache invalidation/diagnostics passed at implementation `6a8496e`, fix `eb88125`, and independent re-review `62810a5`; validation and coverage passed.

## Non-Goals

- App/admin endpoint namespaces.
- Durable offline caches or mobile database replication.
- Framework reactive bindings.
