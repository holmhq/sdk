---
status: open
priority: P1
created: 2026-07-13
updated: 2026-07-13
tags: runtimes, surfaces, web, cli, sobek, desktop, mobile
parent: 001
depends_on: [004, 005]
source_paths:
  - koder/proposals/001_universal_app_runtime/INDEX.md
  - koder/issues/486_universal_app_runtime_extraction_map/INDEX.md
type: design
issue_kind: slice
context: Prove one capability core can cross several runtime boundaries without pretending future native shells already exist.
---

# Issue 009: Runtime and Surface Adapter Contracts

## Problem

Web HTTP is only one way a Holm operation may execute. CLI/Node may use remote
HTTP or a local process, server/Sobek may call an injected runtime, and future
native shells may use mailboxes. The SDK must support these without one giant
platform switch or unsafe shared mutable objects.

## Scope

Implement and conformance-test:

- web adapter over fetch/browser auth/bootstrap;
- Node/CLI adapter over fetch/token and injectable environment/secure-store
  services;
- deterministic in-memory/test adapter;
- server/Sobek authoring/test adapter contract that wraps injected capabilities
  without making deployed server code call itself over HTTP;
- explicit caller/capability envelope propagation;
- serializable request/action/state messages and binary values;
- desktop mailbox and mobile native-bridge TypeScript interfaces plus mocks,
  clearly marked reserved/unsupported in production;
- lifecycle, connectivity, secure-storage, deep-link/navigation, and background
  capability slots without requiring every runtime to implement all slots.

## Acceptance Criteria

- [ ] One conformance suite runs against web, Node/CLI, and in-memory adapters.
- [ ] Server/Sobek contract is tested with an injected fake runtime and has no
      HTTP self-call requirement.
- [ ] Desktop/mobile mocks prove message/snapshot boundaries and capability
      negotiation but cannot be mistaken for production runtimes.
- [ ] Caller context differs safely across web member, CLI token/operator, and
      injected server contexts.
- [ ] Missing runtime services produce typed unsupported-capability errors.
- [ ] No adapter shares mutable resource objects across a native/mailbox
      boundary.
- [ ] Core remains free of DOM/Node types; adapters own ambient APIs.
- [ ] Bundle entry points do not pull all runtime implementations implicitly.

## Non-Goals

- Building Holm desktop/mobile shells.
- Mobile offline database sync.
- Opening GUI windows from remote CLI operations.
- Defining surface UI rendering.
