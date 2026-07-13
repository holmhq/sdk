---
status: open
priority: P1
created: 2026-07-13
updated: 2026-07-13
tags: react, angular, svelte, vue, vanilla, frameworks
parent: 001
depends_on: [006]
source_paths:
  - koder/issues/485_node_lite_framework_compatibility_probe/INDEX.md
type: feature
issue_kind: slice
context: Prove the resource contract feels native in major web frameworks without putting any framework in the SDK core.
---

# Issue 013: React, Angular, Svelte, Vue, and Vanilla Bindings

## Problem

Framework-neutral internals are only valuable if app authors can consume them
without fighting each framework's lifecycle and reactivity model. Bindings must
be small, idiomatic, and optional; framework runtimes must never enter the core
or complete BFBB bundle by accident.

## Scope

- vanilla subscription/resource example;
- React binding based on `useSyncExternalStore` and hook lifecycle;
- Svelte readable-store compatibility, with no adapter if the native contract is
  already sufficient;
- Vue composable/ref adapter without making Vue a core dependency;
- Angular Signal and/or Observable/DI adapter chosen through a small validated
  design;
- peer/optional dependency metadata and subpath exports;
- static SPA examples that exercise auth, query, mutation, errors, and realtime
  invalidation against one deterministic fixture;
- cleanup, SSR-safe import, and multi-client isolation tests.

## Acceptance Criteria

- [ ] Core dependency graph contains none of React, Angular, Svelte, or Vue.
- [ ] Each binding has framework-native lifecycle tests and type inference.
- [ ] Example builds produce static deployable assets and no runtime CDN
      dependency.
- [ ] Unmount/dispose leaves no subscribers, requests, timers, or sockets.
- [ ] Importing a binding in SSR/build context does not require browser globals;
      this does not promise arbitrary framework SSR runtime support on Holm.
- [ ] Framework packages are optional peers/dev test dependencies and excluded
      from SDK bundle size.
- [ ] Vanilla and raw BFBB usage remains first-class.
- [ ] A comparison doc shows equivalent query/mutation/realtime flows without
      inventing separate semantics per framework.

## Non-Goals

- Shipping UI components or design systems.
- Supporting arbitrary Next/Nuxt/SvelteKit/Angular SSR servers.
- Bundling framework runtimes.
- Requiring build tooling for raw Holm apps.
