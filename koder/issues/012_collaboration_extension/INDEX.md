---
status: open
priority: P2
created: 2026-07-13
updated: 2026-07-13
tags: collaboration, oplog, snapshots, crdt, yjs
parent: 001
depends_on: [006, 011]
source_paths:
  - koder/issues/342_collaboration_crdt_strategy/INDEX.md
  - koder/issues/341_app_member_scope_semantics/INDEX.md
type: design
issue_kind: slice
context: Ensure durable collaboration and optional CRDT engines can extend the SDK without conflating them with ephemeral realtime or forcing one dependency.
---

# Issue 012: Collaboration, Oplog, and CRDT Extension Seam

## Problem

Rich collaboration needs operation IDs, revisions, snapshots, reconnect
reconciliation, authorization/scopes, and sometimes a CRDT. Realtime events
alone do not provide durable semantics. Embedding Yjs in the default SDK would
also make one engine and payload cost mandatory before Holm's substrate
converges.

## Proposed Direction

Define extension contracts for:

- collaboration model declaration (`lww`, `lease`, `oplog`, `crdt`,
  `ephemeral`);
- scoped document identity and caller authorization context;
- idempotent client operation IDs, revisions/cursors, snapshots, compaction
  metadata, and reconcile responses;
- opaque binary update storage/transport boundaries;
- a codec/provider interface capable of hosting Yjs, Automerge, Loro, or a
  simple oplog implementation;
- reactive document snapshots and ephemeral presence kept as separate streams;
- fake in-memory oplog/snapshot server for conformance tests;
- optional Yjs compatibility spike only as a peer dependency, with license and
  size evidence before any shipped adapter.

## Acceptance Criteria

- [ ] Tests distinguish all collaboration models and reject vague implied CRDT
      semantics.
- [ ] Oplog fixture covers duplicate ops, stale revisions, snapshots,
      compaction cursors, reconnect, and multi-client reconciliation.
- [ ] Codec interface round-trips opaque `Uint8Array` updates without core
      understanding their semantics.
- [ ] Presence/cursors are ephemeral and never mistaken for durable operations.
- [ ] Scope/caller context is carried through every durable operation.
- [ ] A fake codec and at least one simple oplog codec prove extensionability.
- [ ] Any Yjs spike remains optional/peer-only and records raw/minified/gzip
      cost, license, BFBB, and runtime compatibility.
- [ ] Missing Holm collaboration capabilities are reported honestly rather than
      simulated as production support.

## Non-Goals

- Selecting a mandatory CRDT engine.
- Implementing Holm's operation-log storage primitive.
- Promising offline mobile database replication/conflict resolution.
- Persisting high-frequency presence events.
