---
status: deferred
priority: P1
created: 2026-07-13
updated: 2026-07-17
tags: realtime, websocket, channels, presence, binary
parent: 001
depends_on: [004, 006, 009]
source_paths:
  - koder/issues/517_realtime_channel_auth_presence/INDEX.md
  - internal/hosting/ws.go
  - internal/hosting/realtime.go
type: feature
issue_kind: slice
context: Ship an honest current realtime client while reserving typed extensions for authorized channels, presence, and binary collaboration updates.
---

# Issue 011: Realtime Extension and Presence-ready Seam

## Problem

Holm realtime currently supports public subscribe/unsubscribe and server
broadcast, while authorization, presence, sender exclusion, whispers, policy,
and binary guarantees remain open in Holm Issue 517. The SDK needs useful
current behavior without freezing today's gap or pretending future features
exist.

## Scope

- transport-neutral channel extension over a WebSocket/runtime adapter;
- connect/subscribe/unsubscribe/send where actually supported;
- reconnection, resubscription, heartbeat, teardown, abort, backoff, and
  connection-state snapshots;
- JSON and binary-safe message codec contracts;
- explicit delivery ordering/duplication expectations and backpressure limits;
- integration with reactive resources as ephemeral hints/invalidation, not
  authoritative storage;
- capability-gated types/methods for future private channels, presence rosters,
  sender exclusion, whispers, member addressing, and per-app policy;
- deterministic fake server and multi-client conformance tests.

## Acceptance Criteria

- [ ] Tests cover lifecycle, reconnect/resubscribe, duplicate/out-of-order
      events, abort/dispose, and binary round trips.
- [ ] Current public-channel behavior maps to pinned Holm websocket source.
- [ ] Unauthorized/private/presence APIs cannot silently fall back to public
      channels when the capability is absent.
- [ ] Human and agent member identities fit the same future presence contract.
- [ ] Resource invalidation/reconcile examples keep durable server state
      authoritative.
- [ ] Message size/backpressure/error events are explicit.
- [ ] No unbounded reconnect loop or listener leak survives tests.
- [ ] Bundle and declaration tests pass without requiring WebSocket in core.

## Non-Goals

- Implementing Issue 517 in Holm.
- Durable chat semantics.
- WebRTC media transport.
- CRDT merge/storage semantics (Issue 012).

## Deferral (2026-07-17)

Owner decision at v0.1 acceptance: this capability is demand-driven, not
roadmap-driven. It does not count toward v0.1 completion and starts only when a
real consumer needs it.
