---
status: open
priority: P1
created: 2026-07-13
updated: 2026-07-13
tags: state, reactivity, queries, mutations, optimistic
parent: 001
depends_on: [004, 005]
source_paths:
  - packages/holm-state/src
  - koder/issues/196_holm_ui_framework/INDEX.md
type: feature
issue_kind: slice
context: Provide one framework-neutral reactive contract that every UI/runtime binding can consume.
---

# Issue 006: Framework-neutral Reactive Resources

## Problem

Transport caching does not retain application state or expose reactive
loading/error/data transitions. The current `holm-state` experiment provides
useful behavior but exposes Vue-reactivity semantics. React, Angular, Svelte,
Vue, vanilla, CLI, and native bridges need one lower contract.

## Proposed Direction

Build resources around immutable snapshots and explicit subscription:

```ts
resource.getSnapshot()
resource.subscribe(listener)
resource.refresh()
resource.dispose()
```

Support:

- query keys and transport-backed loaders;
- idle/loading/refreshing/success/error snapshots;
- stale data retained during refresh;
- request deduplication and cancellation;
- mutation resources with optimistic update, rollback, and invalidation tags;
- derived/computed resources without a framework runtime;
- auth/source/caller boundary resets;
- debug/history hooks that do not force devtools into production bundles;
- adapters for realtime reconciliation added by later slices.

## Acceptance Criteria

- [ ] Strict TDD covers subscription lifecycle, immutable snapshots, stale
      refresh, errors, cancellation, disposal, deduplication, derived resources,
      optimistic updates, rollback, and invalidation.
- [ ] Core resources have no Vue, React, Angular, Svelte, DOM, or Node runtime
      dependency.
- [ ] The subscribe/getSnapshot contract can be consumed without adapters by
      vanilla JS and Svelte-style stores.
- [ ] Multiple subscribers share work and cleanup correctly.
- [ ] Caller/auth/source changes cannot leak prior principal data.
- [ ] Realtime hints can invalidate/reconcile authoritative query state without
      making events the durable source of truth.
- [ ] Existing `holm-state` primitives/tests are mapped as adopted, redesigned,
      extension-owned, or deferred.
- [ ] Type tests preserve payload/error inference through query and mutation.
- [ ] Generated artifacts and size report pass.

## Non-Goals

- Rendering DOM.
- A framework-specific global store.
- CRDT merge semantics.
- Persistent offline replication.
