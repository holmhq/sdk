---
name: Holm
status: active
role: runtime-protocol-authority
updated: 2026-08-17
local_path: ~/Projects/holmhq/holm/master
remote: git@github.com-holmhq:holmhq/holm.git
branch: master
verified_commit: 44d51d0f785ff6208ecc034c720e76a8543891be
write_policy: explicit-approval-only
---

# Project 001: Holm

## Relationship

Holm is the runtime, HTTP/API, serverless/Sobek, action/state/schema, auth,
storage, realtime, and protocol authority. `@holmhq/sdk` consumes and helps
author those contracts; it must not create a competing server truth.

## SDK-relevant contracts

- Existing clients: `packages/holm-sdk/`
- Existing reactive state: `packages/holm-state/`
- Universal-surface history: Proposal 001 and superseded Issue 486
- Current contract-first app authority: Issue 534
- App scopes/collaboration/realtime history: Issues 341, 342, 517
- Runtime websocket/realtime: `internal/hosting/{ws.go,ws_auth.go,realtime.go}`
  plus `internal/realtimeauth/resolver.go`
- Current non-HTTP snapshot: SDK Evidence `009` at `44d51d0f…`
- App docs/templates: `knowledge-base/skills/app/`, `internal/assets/templates/`

See `koder/docs/HOLM_SOURCE_MAP.md` for the pinned path-level map.

## Agent policy

- Read source and tests directly; record the Holm commit in conformance evidence.
- Do not edit this repository from an SDK slice without explicit user approval.
- When a missing runtime capability blocks the SDK, file/coordinate a Holm issue
  rather than simulating production support in the client.
- Existing Holm SDK/state packages remain operational until a separate cutover.

## Drift checkpoint

Evidence `009` refreshed non-HTTP authority at clean commit `44d51d0f…`.
Refresh again before implementation when Holm's action/discovery, realtime,
collaboration, auth, injected namespace, or capability contracts move.
