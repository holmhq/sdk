---
status: open
priority: P1
created: 2026-07-13
updated: 2026-07-14
tags: core, capabilities, adapters, extensions, lifecycle
parent: 001
depends_on: [002, 003]
type: feature
issue_kind: slice
context: Implement the small environment-neutral kernel every SDK capability and surface composes through.
---

# Issue 004: Universal Core, Capabilities, Adapters, and Extensions

## Problem

A multi-surface SDK cannot center browser globals or HTTP. It needs a small
kernel that represents capabilities, runtime services, caller context,
extensions, lifecycle, cancellation, serialization, and test doubles without
knowing whether work crosses HTTP, a CLI process, or a native mailbox.

## Proposed Direction

Implement the architecture contracts from Issue 002:

- explicit `createHolm(...)`-style instance/factory, with no ambient singleton;
- runtime adapter service registry;
- capability descriptor/version negotiation and honest unsupported errors;
- caller/auth context envelope passed at invocation boundaries;
- extension install/dependency/conflict lifecycle;
- abort/cancellation, clock, logging/diagnostic hooks, and teardown;
- immutable serializable snapshots/events and binary-safe values;
- deterministic mock/in-memory adapter for all later tests.

Names remain subject to the reviewed architecture; behavior and invariants are
the slice contract.

## Acceptance Criteria

- [ ] Strict red → green → refactor tests cover creation, teardown, capability
      negotiation, extension ordering/conflicts, caller propagation, and aborts.
- [ ] Core compiles and runs with no DOM or Node ambient/runtime dependency.
- [ ] Two independent instances can use different adapters/callers without
      shared state leakage.
- [x] Unsupported or version-mismatched capabilities fail with typed,
      actionable errors rather than undefined methods. (`S05`: `e3e518d`,
      review `8b9e2aa`)
- [ ] Extensions cannot overwrite namespaces silently.
- [x] Values crossing an adapter boundary are serializable or explicitly binary;
      tests reject unsafe shared mutable objects. (`S04`: `69554db`, fix
      `61441ed`, re-review `a6cde0d`)
- [ ] Mock adapter and fake clock make behavior deterministic.
- [ ] Generated ESM/declarations pass consumer tests.
- [ ] Public exports and bundle contribution are documented and size-reported.

## Progress Evidence

- `S04` established serializable/binary-safe wire values and redacted errors.
- `S05` established immutable capability offers and fail-closed negotiation.
- `S06` established copied invocation envelopes, per-call caller resolution,
  deterministic non-secret fingerprints, and partition hooks.

## Non-Goals

- HTTP endpoint wrappers.
- Framework hooks.
- Production desktop/mobile bridge implementations.
- A service locator exposed as arbitrary mutable global state.
