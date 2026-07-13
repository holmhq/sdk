---
title: SDK Autonomous Execution Windows
updated: 2026-07-13
active_window: A1
active_issue: 002
requires_review_after: true
---

# Autonomous Execution Windows

This document gives an agent permission to make bounded progress without
silently crossing a product-design checkpoint. `koder/STATE.md` names the active
window. An agent may stop earlier on a genuine blocker, but must never continue
past the named stop gate without a new user decision recorded here and in
`koder/STATE.md`.

## Current window — A1: architecture decision package

- **Status:** ready
- **Issue:** `koder/issues/002_architecture_contract/INDEX.md`
- **Autonomy:** read, analyze, draft, validate, commit, push, and close
- **Stop gate:** architecture package is decision-ready; do not start Issue `#003`

### Required reading

1. `koder/STATE.md`
2. `koder/issues/001_universal_sdk_foundation/INDEX.md`
3. `koder/issues/002_architecture_contract/INDEX.md`
4. `koder/docs/HOLM_SOURCE_MAP.md`
5. From Holm at the pinned baseline, read completely:
   - `koder/proposals/001_universal_app_runtime/INDEX.md`
   - `koder/issues/486_universal_app_runtime_extraction_map/INDEX.md`
6. Read only the additional Holm sources Issue `#002` needs to resolve a
   concrete architecture question; keep an evidence/source list.

### Deliverables

- `koder/docs/ARCHITECTURE.md` — self-contained proposed architecture.
- `koder/docs/DECISIONS.md` — compact decision register with accepted proposal,
  rationale, alternatives, and confidence for each load-bearing choice.
- Optional TypeScript-shaped interface examples **inside the architecture
  document**, clearly marked illustrative and not yet a compatibility promise.
- An Issue `#002` progress/evidence section that maps every acceptance criterion
  to the draft or names a blocker.
- Updated `koder/STATE.md` setting the repo to `REVIEW_READY` or `BLOCKED` and
  naming the exact review question.

### Allowed work

- Read the linked repositories and current source.
- Compare current SDK/state behavior and measure existing bundle/source sizes.
- Resolve non-blocking details using the umbrella invariants.
- Commit logical documentation/state changes and push `main`.
- Use `close` after the checkpoint is recorded.

### Forbidden in A1

- Do not install dependencies or choose a build tool by implementation momentum.
- Do not create production `src/`, `test/`, or `dist/` code.
- Do not start Issue `#003` or mark Issue `#002` resolved.
- Do not publish npm, create tags/releases, or add credentials/workflows.
- Do not edit Holm, Sobek, CDN, or any other repository.
- Do not claim desktop/mobile, private realtime/presence, CLI action runtime, or
  CRDT server capabilities already exist.

### Validation before stopping

- Architecture maps every Issue `#001` cross-slice invariant.
- Decisions explicitly cover package/API shape, adapters, resources,
  extensions, caller context, capability negotiation, serialization, lifecycle,
  errors, and bundle/subpath strategy.
- Future Holm capability gaps are capability-gated, not hand-waved.
- Local links and pinned source references resolve.
- `git diff --check` passes.
- Working tree and index are clean after `close`.
- Branch is pushed/synchronized unless remote push is genuinely blocked and
  reported.

### Review return

Return to the coordinating Holm session with:

1. architecture commit SHA;
2. five-to-ten load-bearing decisions;
3. alternatives rejected;
4. unresolved questions requiring the owner;
5. recommendation: approve, revise, or split before Issue `#003`.

The reviewer may write a numbered artifact under
`koder/reviews/001_architecture_contract/`. Only an explicit approval updates the
active window to A2.

## Future windows (not yet authorized)

| Window | Scope | Entry gate | Stop gate |
| --- | --- | --- | --- |
| A2 | Issues `#003`–`#006`: toolchain, core, transport, reactive resources | A1 architecture approved | core API/conformance review |
| A3 | Issues `#007`–`#010`: app/admin migration and surface/action adapters | A2 approved | migration/API review |
| A4 | Issues `#011`–`#013`: realtime, collaboration seam, frameworks | A3 approved + relevant Holm capability truth refreshed | extension/framework review |
| A5 | Issues `#014`–`#015`: BFBB artifacts, docs, closeout | A4 approved | release-readiness decision; npm still blocked |

These rows are planning boundaries, not permission to execute. Activate one by
updating this file and `koder/STATE.md` in a reviewed `state:` commit.
