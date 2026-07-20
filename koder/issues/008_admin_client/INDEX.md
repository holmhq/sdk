---
status: in_progress
priority: P1
created: 2026-07-13
updated: 2026-07-20
tags: admin, operator, routes, migration, audit
parent: 001
depends_on: [005]
source_paths:
  - packages/holm-sdk/admin.js
  - packages/holm-sdk/admin.audit.js
  - packages/holm-sdk/surface.audit.js
type: feature
issue_kind: slice
context: Migrate the audited operator client without letting its large namespace dictate the universal core.
---

# Issue 008: Admin and Operator Client Migration

## Problem

The current admin client exposes a broad, route-audited operator API. It must
remain available through the new SDK, but hundreds of wrappers should not bloat
core contracts, weaken types, or silently diverge from Holm.

## Proposed Direction

- build admin/operator namespaces on the shared transport/auth/error core;
- prefer typed declarative wrappers or generated inventories where repetition
  is mechanical and reviewable;
- retain explicit methods and payload types for public supported operations;
- keep raw `http` as an escape hatch, not the documented default;
- classify every audited route and intentional exclusion at the pinned Holm
  baseline;
- isolate privileged namespaces by runtime/caller capability even if the full
  convenience bundle exports them;
- establish a repeatable Holm route-inventory refresh/conformance process.

## Current candidate — 2026-07-20

- Public preview subpath: `@holmhq/sdk/admin`; complete BFBB `holm.js` includes
  it while narrow `holm-web.js` remains admin-free.
- Authority ledger: 174 keys, 189 route/method contracts, 216 generated methods,
  and 18 exclusions at `koder/evidence/004_issue008_admin_routes/`.
- Explicit operator caller checks run before web/Node network I/O; auth proof
  remains adapter-private and Holm remains the authorization authority.
- Normal, FORCE_COLOR, TAP, and TAP+color full CI pass; 267 dist artifacts are
  reproducible, installed-tarball smoke covers all package exports, and measured
  coverage remains above every gate.
- Independent SDK review and final Holm-authority acceptance are still pending;
  no release action occurs before both approve the exact candidate.

## Acceptance Criteria

- [ ] A machine-readable parity table covers every current admin audit entry and
      records adopted/redesigned/deferred/excluded status.
- [ ] Representative namespaces are implemented TDD-first before any generator
      or bulk migration is trusted.
- [ ] Generated/declarative wrappers are deterministic and reviewable; drift
      causes CI failure.
- [ ] Admin auth is explicit token/operator context, not inferred browser member
      state.
- [ ] Errors, raw/binary responses, uploads, streams/URLs, and pagination use
      shared core behavior.
- [ ] Public method payload/result types are available in generated declarations.
- [ ] Full convenience and narrow admin artifacts report size and pass smoke
      tests.
- [ ] No Holm route is claimed supported without conformance evidence against a
      named commit.
- [ ] Existing Holm admin client remains untouched during this slice.

## Non-Goals

- Adding missing Holm backend routes.
- Publishing npm.
- Treating possession of a browser bundle as authorization; Holm remains the
  enforcement boundary.

## Activation and release boundary (2026-07-20)

The owner activated this demand-driven slice and authorized a conditional
`0.2.0` release if implementation, full validation, independent SDK review, and
fresh read-only Holm-authority acceptance establish confidence. The target is a
released preview entry point, not an unreviewed stability promotion.

Implementation uses one explicit `createAdminClient({ runtime, caller })`
composition and a deterministic generated namespace over a source-pinned route
ledger. Standard operation objects replace positional legacy arguments;
platform uploads remain injected services; existing stable entry points remain
compatible. Holm stays read-only and existing Holm packages remain live.

Release actions stop unless every gate is green. No Holm edit, deployment,
production mutation, or unrelated capability work is authorized.
