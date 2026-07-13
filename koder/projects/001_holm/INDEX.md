---
name: Holm
status: active
role: runtime-protocol-authority
updated: 2026-07-13
local_path: ~/Projects/holmhq/holm/master
remote: git@github.com-holmhq:holmhq/holm.git
branch: master
verified_commit: 11ceae0d88e9c800eb77916e3244fbd231ad81bb
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
- Universal surfaces: Proposal 001 and Issue 486
- App scopes/collaboration/realtime: Issues 341, 342, 517
- Runtime websocket/realtime: `internal/hosting/{ws.go,realtime.go}`
- App docs/templates: `knowledge-base/skills/app/`, `internal/assets/templates/`

See `koder/docs/HOLM_SOURCE_MAP.md` for the pinned path-level map.

## Agent policy

- Read source and tests directly; record the Holm commit in conformance evidence.
- Do not edit this repository from an SDK slice without explicit user approval.
- When a missing runtime capability blocks the SDK, file/coordinate a Holm issue
  rather than simulating production support in the client.
- Existing Holm SDK/state packages remain operational until a separate cutover.

## Drift checkpoint

Refresh this card and the source map before a major conformance/migration wave or
when Holm's action, realtime, collaboration, auth, or surface contracts change.
