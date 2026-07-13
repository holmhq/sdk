---
status: open
priority: P1
created: 2026-07-13
updated: 2026-07-13
tags: architecture, contracts, capabilities, extensions
parent: 001
source:
  holm_commit: 11ceae0d88e9c800eb77916e3244fbd231ad81bb
type: design
issue_kind: slice
context: Pin the universal SDK vocabulary and boundaries before implementation makes accidental contracts expensive.
---

# Issue 002: Architecture Charter and Contract Vocabulary

## Problem

The new repository can break from the old API, but only in service of a more
coherent long-term design. Coding before the runtime, capability, resource,
extension, caller, and package boundaries are explicit would merely move the
current fragmentation into TypeScript.

## Scope

Write `koder/docs/ARCHITECTURE.md` and small compile-only contract sketches that
settle:

- capability, runtime adapter, transport, surface, framework binding, and
  extension terminology;
- the relationship between Holm's action/state/schema registry and SDK sugar;
- immutable resource snapshot + subscription semantics;
- surface-dependent caller/auth envelopes;
- serializable mailbox/message boundaries for native loops;
- capability IDs, version negotiation, and unsupported-capability behavior;
- extension registration, namespace ownership, dependencies, and conflicts;
- public factory shape and package subpath/artifact strategy;
- full convenience bundle versus narrow artifacts;
- error, cancellation, clock, lifecycle, and serialization rules;
- what can be redesigned versus what requires migration parity evidence.

Use `koder/docs/HOLM_SOURCE_MAP.md`; read Holm Proposal 001 and Issue 486 in
full. Explicitly reconcile this design with Issues 085, 196, 341, 342, 485, and
517 rather than treating web HTTP as the universal center.

## Acceptance Criteria

- [ ] `koder/docs/ARCHITECTURE.md` is self-contained and diagrams the three axes:
      capabilities, runtime/surface adapters, and framework bindings.
- [ ] Core interfaces compile in sketches without DOM or Node ambient types.
- [ ] The action/state/schema registry remains independently serializable and
      testable without this SDK.
- [ ] Caller identity, capability negotiation, and mailbox/message semantics are
      explicit for web, CLI, server/Sobek, desktop, and mobile.
- [ ] Resource, extension, error, cancellation, and lifecycle contracts are
      precise enough to extract implementation tests.
- [ ] Package name `@holmhq/sdk`, MIT, private npm state, BFBB artifacts, and
      jsDelivr/SHA distribution are recorded.
- [ ] Open questions genuinely blocking implementation are surfaced for user
      decision; non-blocking details are delegated to later slices.
- [ ] A review finds no conflict with umbrella invariants.

## Non-Goals

- Implementing production source.
- Freezing every endpoint payload.
- Defining a universal UI DSL.
- Implementing desktop/mobile runtimes or offline sync.
