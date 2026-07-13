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
autonomy_window: A1
stop_gate: decision-ready architecture; user review required before Issue 003
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

## Autonomous Work Contract

This issue is the active A1 work window defined in
`koder/docs/EXECUTION.md`. An agent may research, draft, validate, commit, push,
and close the architecture decision package autonomously.

Required checkpoint deliverables:

- `koder/docs/ARCHITECTURE.md`;
- `koder/docs/DECISIONS.md`;
- an acceptance/evidence update in this issue;
- `koder/STATE.md` set to `REVIEW_READY` or `BLOCKED` with the exact review ask.

**Stop after the decision-ready draft.** Do not install dependencies, create
production source, resolve this issue, or begin Issue `#003` before owner/review
approval activates A2.

## Acceptance Criteria

- [x] `koder/docs/ARCHITECTURE.md` is self-contained and diagrams the three axes:
      capabilities, runtime/surface adapters, and framework bindings.
- [x] TypeScript-shaped contract sketches are precise enough to become initial
      type fixtures in Issue `#003`, and are clearly marked illustrative rather
      than already compiled/frozen APIs.
- [x] The action/state/schema registry remains independently serializable and
      testable without this SDK.
- [x] Caller identity, capability negotiation, and mailbox/message semantics are
      explicit for web, CLI, server/Sobek, desktop, and mobile.
- [x] Resource, extension, error, cancellation, and lifecycle contracts are
      precise enough to extract implementation tests.
- [x] Package name `@holmhq/sdk`, MIT, private npm state, BFBB artifacts, and
      jsDelivr/SHA distribution are recorded.
- [x] Open questions genuinely blocking implementation are surfaced for user
      decision; non-blocking details are delegated to later slices.
- [ ] A review finds no conflict with umbrella invariants.

## A1 Progress and Evidence

Architecture baseline: Holm
`11ceae0d88e9c800eb77916e3244fbd231ad81bb` (`v0.182.0`). The checkout was at
that exact clean commit while evidence was read. No Holm file was modified.

| Criterion | Evidence | State |
| --- | --- | --- |
| Three-axis architecture | [`ARCHITECTURE.md`](../../docs/ARCHITECTURE.md#architectural-thesis) diagrams capabilities, adapters/surfaces, and framework bindings, then defines ownership and vocabulary. | ready |
| Type fixtures | Illustrative sketches cover the factory, adapter invocation, capability versions, caller context, wire values/mailboxes, actions, resources, extensions, cancellation, and errors. Every sketch is explicitly non-frozen. | ready for `#003` extraction after approval |
| SDK-independent registry | [`Action, state, and schema registry`](../../docs/ARCHITECTURE.md#action-state-and-schema-registry) keeps registry JSON separate from optional helpers/handlers and gates production invocation. | ready |
| Surface-dependent context | Runtime matrix, per-invocation caller/auth separation, capability negotiation, and native mailbox rules cover web, CLI/Node, server/Sobek, desktop, mobile, and test. | ready |
| Behavioral contracts | Resource transitions, deterministic extension ordering, lifecycle state, injected clock/scheduler, cancellation propagation, and typed errors are test-extractable. | ready |
| Package/distribution | The package/subpath and bundle sections pin `@holmhq/sdk`, MIT, private npm state, three candidate ESM artifacts, tracked reproducibility gates, and immutable SHA/tag vendoring. | ready for owner decision |
| Blocking/open questions | [`DECISIONS.md`](../../docs/DECISIONS.md) resolves load-bearing choices and delegates only bounded implementation details. No internal A1 blocker remains; the exact review ask covers capability versioning, sealed extensions, and package/artifact boundaries. | review required |
| Umbrella invariants | [`Umbrella invariant traceability`](../../docs/ARCHITECTURE.md#umbrella-invariant-traceability) maps all `14` Issue `#001` invariants. A source reconciliation table covers Holm Issues `085`, `196`, `341`, `342`, `485`, and `517`. | pending owner review |

### Source and measurement notes

- Required Holm Proposal 001 and Issue 486 were read completely at the pinned
  commit, along with Issues 085, 196, 341, 342, 485, and 517.
- Existing `packages/holm-sdk` factory, transport, cache, app runtime, error, and
  build sources; all `packages/holm-state/src` primitives; and current
  `internal/hosting/{ws.go,realtime.go}` were inspected.
- Current truth is recorded explicitly: action registry, app scopes,
  private/presence realtime, collaboration substrate, desktop, and mobile are
  not claimed shipped.
- The local baseline checkout's untracked `holm-sdk` v0.75.0 bundle measured
  `86,064` raw bytes / `18,461` gzip bytes. It is context only, not a target or
  reproducibility claim.

### Review stop

Review and approve or revise decisions `D001`–`D015` in
[`DECISIONS.md`](../../docs/DECISIONS.md). **Do not start Issue `#003` from this
checkpoint.**

## Non-Goals

- Implementing production source.
- Freezing every endpoint payload.
- Defining a universal UI DSL.
- Implementing desktop/mobile runtimes or offline sync.
