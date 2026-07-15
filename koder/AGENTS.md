# Agent Instructions

This repository uses koder-pattern for durable handoff and project memory.
Delivery is the goal; artifacts and orchestration exist only when they make the
product work safer or easier to resume.

## Start and context routing

- Use `open` at session start and `close` at a real owner-facing handoff.
- Read `koder/STATE.md`, then load only the active issue/plan and source needed
  for the user's task. Do not preload parent issues, queues, reviews, or long
  architecture documents merely because they exist.
- For an architecture decision, read `koder/docs/{ARCHITECTURE,DECISIONS}.md`.
  For Holm protocol conformance, read `koder/docs/HOLM_SOURCE_MAP.md` and verify
  the relevant live Holm source. For cross-repository work, read
  `koder/projects/INDEX.md` and only the relevant project card.
- Treat older plans and queues as evidence, not as standing authorization or
  permanent execution policy.

## Durable operator state

- Keep non-code agent/operator files under `koder/`; `README.md` is the normal
  root documentation exception.
- Keep `koder/STATE.md` short and current. Update it at init, close, an explicit
  handoff request, or an external filing—not for every internal transition.
- Use folder-first artifacts when a durable record is actually needed:
  `koder/<type>/NNN_short_slug/INDEX.md`.
- Batch routine issue, review, queue, and run-log movement with logical work.
  Do not create a commit or dispatch a worker solely for frontmatter or status.
- Preserve unrelated dirty/staged work. Never store secrets, credentials,
  private payloads, full prompts, or large generated logs under `koder/`.

## Execution shape

- An explicit owner-present task is sufficient authorization for direct work
  inside its stated scope; do not require a second execution-window artifact.
- Direct execution is the default. A queue does not imply blind mode, and
  Harnex does not imply a worker chain.
- Load koder-pattern's queue/mode guidance only when the user requests a queue,
  Harnex dispatch, unattended work, or explicit context isolation. Keep any
  repo-local overlay to the queue's scope, validation, ownership, review
  boundary, permissions, and stop gate; do not copy the shared protocol here.
- Blind mode is explicit, temporary opt-in for a named run. It does not remain
  attached to an issue after that run stops.
- Automatic dispatches must follow the live koder-pattern `dispatch_models`
  policy; never substitute an out-of-policy model merely to continue a run.

## Holm SDK contract

- Mission: build `@holmhq/sdk`, a strict-TypeScript universal SDK for Holm
  across web, CLI, server/Sobek, and future desktop/mobile surfaces.
- Holm is the runtime and protocol authority. Its primary checkout is
  `~/Projects/holmhq/holm/master`; do not edit it from this repository without
  explicit approval. Pin conformance evidence to a Holm commit.
- Existing Holm `packages/holm-sdk` and `packages/holm-state` remain live during
  migration. Do not delete, redirect, or silently fork their ownership.
- Strict red → green → refactor TDD is mandatory for product implementation.
- Core must compile without DOM or Node ambient types. Runtime-specific APIs
  belong behind explicit adapters; framework runtimes and CRDT engines remain
  optional peers. Core resources expose immutable snapshots and subscriptions.
- Preserve the Universal App Runtime invariants: action/state/schema below the
  SDK, surface-dependent caller identity, native-loop message passing, BFBB
  first, no direct SQLite, and no universal UI DSL.
- `dist/` is tracked because BFBB consumers vendor generated ESM. A public
  source change owns its affected JavaScript, declarations, maps, package-smoke
  checks, and size check in the same logical implementation. Missing generated
  output is incomplete implementation, not a semantic review cycle.
- npm publication remains deferred and `package.json` stays private until the
  owner approves publication. Deployed artifacts must use immutable tags/SHAs,
  never `@main`.
- MIT-compatible dependencies only; justify additions and avoid dependency-heavy
  convenience layers in universal core.
- Work serially on `main` unless the owner explicitly approves worktrees.

## Current product boundary

- Complete Issue `#016` and obtain green full validation, one independent SDK
  remediation review, and fresh read-only Holm-authority acceptance before
  beginning Issue `#007`.
- Do not publish, release, deploy, use credentials, mutate production/cloud
  state, or edit another repository without explicit approval.
