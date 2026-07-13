# Agent Instructions

This repo uses the koder pattern for durable agent handoff and project memory.

## Operator layout

- Keep durable non-code agent/operator files under `koder/`.
- Keep one physical copy of shared skills under `koder/skills/`. Root `AGENTS.md` (Pi/Codex), `CLAUDE.md` (Claude), `.pi/skills/*` (Pi), `.agents/skills/*` (Codex), and `.claude/skills/*` (Claude) should be relative symlinks/adapters to files under `koder/` when possible.
- `README.md` is the root documentation exception because repository hosts render it directly; prefer other durable docs under `koder/docs/` unless project conventions require otherwise.
- Do not put product source code under `koder/` unless the project explicitly says so.

## Session handoff

- Use the `open` skill at the start of a session.
- Use the `close` skill at the end of a session; it updates `koder/STATE.md` and creates a grepable `state: close - ...` commit for the semantic state transition.
- Read `koder/STATE.md` before making changes when opening manually.
- Keep `koder/STATE.md` short and current; update it at init, close, explicit handoff requests, or external-origin filings into this repo.
- Do not put secrets, private payloads, full prompts, credentials, or large copied source/output into `koder/`.

## State commits

- Every intentional `koder/` state transition gets a `state:` commit by default.
- Use subjects like `state: init - koder pattern scaffold`, `state: close - <result>`, `state: file #NNN from <origin> - <reason>`, or `state: update #NNN - <reason>`.
- `state:` commits are the semantic movement ledger; `koder/STATE.md` is the session handoff, not a commit-by-commit changelog.
- Do not edit `koder/STATE.md` solely because a local in-session artifact state commit happened; summarize at close if it matters.
- Do not force ordinary code-only commits to use `state:`; the ledger tracks semantic operator/repo-state movement.
- In dirty repos, commit only the intended state paths and preserve unrelated dirty/staged work.
- If the user explicitly says not to commit, leave state uncommitted and report the dirty paths.

## Koder artifacts

- Minimum scaffold: `koder/STATE.md`, `koder/issues/`, `koder/skills/open/`, and `koder/skills/close/`.
- Create other artifact directories only when needed, for example `koder/proposals/`, `koder/plans/`, `koder/reviews/`, `koder/research/`, `koder/analysis/`, `koder/notes/`, `koder/tasks/`, `koder/queues/`, or `koder/scratch/`.
- Use folder-first artifacts for durable records: `koder/<type>/NNN_short_slug/INDEX.md`.
- Use `koder/proposals/` for RFC-scale ideas that should converge before issues/plans are extracted.
- Treat `INDEX.md` as canonical current state; use `turns/` only for optional discussion/history.
- Scan existing artifacts before choosing the next number; each artifact type has its own sequence.
- Prefer source links, file paths, command names, commits, and concise evidence over copied detail.
- Run local validators before finalizing artifacts when validators exist.

## Safety

- Never commit secrets, credentials, private account identifiers, sensitive personal data, private payloads, full prompts, or large generated outputs.
- Ask before running commands that deploy, create cloud resources, mutate production data, install packages globally, rotate credentials, or change account/member access.
- Preserve live project conventions; these instructions are the operator baseline, not a replacement for project-specific policy.

## Holm SDK project overlay

- Mission: build `@holmhq/sdk`, the strict-TypeScript universal SDK for Holm capabilities across web, CLI, server/Sobek, and future desktop/mobile surfaces.
- Read `koder/issues/001_universal_sdk_foundation/INDEX.md`, `koder/docs/HOLM_SOURCE_MAP.md`, and `koder/docs/EXECUTION.md` before architecture or implementation work. Follow the child issue for the active slice and never cross its review stop gate automatically.
- Holm remains the runtime/protocol authority. The primary checkout is `~/Projects/holmhq/holm/master`; do not edit it from this repo without explicit user approval. Pin source evidence to a Holm commit.
- Cross-repository roles live in `koder/projects/`. Read `koder/projects/INDEX.md` first and only load the relevant project card; project cards route to live source and never replace another repo's handoff.
- Existing Holm `packages/holm-sdk` and `packages/holm-state` remain live during migration. Do not delete, redirect, or silently fork their ownership.
- **TDD is mandatory for implementation:** strict red → green → refactor, with source and generated-artifact checks where relevant.
- Author source in strict TypeScript. The universal core must compile without DOM or Node ambient types; runtime-specific APIs belong behind explicit adapters.
- Keep framework runtimes and CRDT engines optional/peer dependencies. Core resources expose framework-neutral immutable snapshots and subscriptions.
- Preserve the Universal App Runtime invariants: action/state/schema contract below the SDK, surface-dependent caller identity, message passing across native loops, BFBB first, no direct SQLite, and no universal UI DSL.
- npm publication is explicitly deferred. Keep `package.json` private until the user approves publishing. GitHub/jsDelivr artifacts must be immutable-tag/SHA addressable; never recommend `@main` for deployed apps.
- `dist/` is intentionally tracked once builds exist because BFBB apps vendor generated ESM artifacts. Commit generated output only when source tests, declaration checks, bundle smoke tests, and size reports pass.
- MIT is the project license. New dependencies must be license-compatible and justified; avoid dependency-heavy convenience layers in the core.
- Implementation is serial on `main` inside this repo unless the user explicitly authorizes parallel worktrees. A separate agent may work here concurrently with agents in other repositories.

### Blind queue orchestration (hard rule)

- Before running any queue or harnex chain, read
  `koder/docs/BLIND_ORCHESTRATION.md` completely.
- The primary queue agent is a **blind orchestrator only**. It dispatches fresh
  implementation, review, fix, and re-review workers; it does not implement
  product code or ingest their full diffs, source, tests, reviews, transcripts,
  panes, or long logs into its own context.
- The primary reads only queue/process metadata, the current row summary,
  compact worker sidecars, changed paths, validation results, commit refs,
  verdict summaries, blockers, and Git state. Workers read each other's
  committed artifacts directly.
- Never preload all queue plans. Route one current entry at a time. After at
  most four completed implementation entries, commit a durable handoff and
  resume with a fresh coordinator context. If unattended relaunch is
  unavailable, stop cleanly rather than accumulating context.
- If harnex or an explicitly equivalent isolated worker harness is unavailable,
  the queue is blocked. Do not turn it into one giant direct-coding session.
- Autonomous work is granted only by the active window in `koder/docs/EXECUTION.md`. At its stop gate, commit/push a clean checkpoint, set `koder/STATE.md` to `REVIEW_READY` or `BLOCKED`, run `close`, and return to the coordinating session rather than starting the next issue.
