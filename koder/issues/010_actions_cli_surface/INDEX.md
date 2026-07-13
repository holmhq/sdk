---
status: open
priority: P1
created: 2026-07-13
updated: 2026-07-13
tags: actions, json-schema, cli, jobs, agents
parent: 001
depends_on: [004, 009]
source_paths:
  - koder/proposals/001_universal_app_runtime/INDEX.md
  - koder/issues/486_universal_app_runtime_extraction_map/INDEX.md
type: feature
issue_kind: slice
context: Make the future CLI/action surface easy to author and consume without making the durable contract SDK-dependent.
---

# Issue 010: Action/Schema and CLI Surface Helpers

## Problem

Holm's converged runtime design makes `surfaces/cli/main.js` and structured
actions the first new non-web surface. Holm has not implemented that server/CLI
surface yet, so the SDK must provide honest optional helpers and conformance
fixtures without inventing a competing protocol or claiming live support.

## Proposed Direction

- TypeScript types/builders for JSON Schema draft 2020-12 action definitions;
- `sync | job` result envelopes and durable job/status typing;
- action/state-query discovery documents that remain plain serializable JSON;
- optional `defineActions(...)` authoring helper with schema/input/output
  inference;
- client `list`/`invoke` capability over a runtime adapter;
- explicit caller/capability/audit context;
- in-memory registry adapter and CLI-like JSON fixture for end-to-end tests;
- capability gate that reports production action transport unavailable until
  Holm ships the corresponding contract.

## Acceptance Criteria

- [ ] Registry JSON validates independently without importing `@holmhq/sdk`.
- [ ] Type tests infer action input/output and sync/job results from definitions.
- [ ] Duplicate names, invalid schemas, non-serializable values, and envelope
      mismatches fail deterministically.
- [ ] In-memory discovery/invocation conformance tests cover human/operator/agent
      caller envelopes.
- [ ] A CLI fixture consumes JSON rather than terminal pixels.
- [ ] Production adapters do not claim support when the Holm capability is
      absent.
- [ ] The design can map to `holm app actions` / `holm app action` without
      implementing those commands here.
- [ ] No TUI framework or universal UI contract enters the core.

## Non-Goals

- Implementing Holm's Go CLI/action runtime.
- Building `holm app tui`.
- Running remote GUI surfaces.
- Making SDK builders mandatory for authored registry JSON.
