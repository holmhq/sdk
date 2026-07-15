---
name: Holm SDK
status: active
role: portable-sdk-implementation
updated: 2026-07-13
local_path: ~/Projects/holmhq/sdk
remote: git@github.com-holmhq:holmhq/sdk.git
branch: main
bootstrap_commit: c681bb3513f739620fe9c6c4a856f0d3c4dd02c0
write_policy: primary
---

# Project 002: SDK

## Relationship

This repository owns the future `@holmhq/sdk` TypeScript source, generated
JavaScript/declarations, runtime adapters, reactive resources, framework
bindings, extension contracts, conformance fixtures, and BFBB artifacts.

## Current state

- npm package remains private/unpublished.
- MIT licensed.
- Issue `#001` tracks 14 child slices.
- Current work and stop gate are recorded in `koder/STATE.md` and the active issue.
- Existing Holm SDK/state remain current behavior authorities during migration.

## Agent policy

- This is the primary write target.
- Work serially on `main` unless worktrees are explicitly approved.
- Use strict red → green → refactor for implementation.
- Follow the active issue's product gate; unattended windows require an explicit queue-local scope and stop.
- Keep root and remote clean/synchronized at close when push is available.

## Integration checkpoints

- Architecture approval before toolchain/core implementation.
- Core review before app/admin migration.
- Capability-truth refresh before realtime/collaboration work.
- BFBB artifact review before any publication discussion.
