---
name: Sobek (Holm fork)
status: active
role: embedded-js-engine
updated: 2026-07-13
local_path: ~/Projects/holmhq/sobek
remote: git@github.com-holmhq:holmhq/sobek.git
upstream: git@github.com-holmhq:grafana/sobek.git
branch: holm
verified_commit: 380e2888d9cf87d4467a3c41162f69f7e34a6328
write_policy: separate-coordinated-work-only
---

# Project 003: Sobek

## Relationship

Sobek is the pure-Go JavaScript engine embedded by Holm's server runtime. It
constrains the SDK's server/Sobek compatibility target but is not a browser or
Node transport dependency of the package.

## SDK-relevant constraints

- ESM support is experimental and the embedder provides the event loop.
- A runtime is single-goroutine and not goroutine-safe.
- Object values cannot cross runtimes; use serializable snapshots/messages.
- Browser/Node globals are supplied by Holm or adapters, not Sobek itself.
- Holm's private fork also carries module reset and execution allocation-budget
  capabilities; details live in Sobek's own `koder/STATE.md`.

## Agent policy

- Read `AGENTS.md` and `koder/STATE.md` in Sobek before relying on engine facts.
- Do not edit or retarget the fork from an SDK slice.
- File/coordinate engine gaps separately and keep SDK capability support honest.
- SDK server compatibility tests should identify the exact Sobek/Holm baseline.

## Drift checkpoint

Refresh before server/Sobek adapter implementation, after Holm changes its
Sobek pseudo-version, or when ESM/event-loop/runtime transfer semantics change.
