---
title: Issue 008 admin route conformance ledger
status: current
issue: 008
sdk_target: 0.2.0
holm_commit: 3d229a414a0379d0a24221e975b8b4f1588f494d
source_paths:
  - packages/holm-sdk/admin.audit.js
  - packages/holm-sdk/admin.js
  - packages/holm-sdk/surface.audit.js
---

# Issue 008 Admin Route Evidence

`route-audit.json` is the machine-readable migration ledger for the preview
`@holmhq/sdk/admin` surface. It snapshots the live Holm admin audit at the named
commit and classifies every supported and intentionally excluded route.

## Inventory

- 174 supported audit keys;
- 189 expanded HTTP route/method contracts;
- 216 unique SDK method paths;
- 18 intentional exclusions.

`node scripts/check-admin-api.mjs` deterministically projects the ledger into
`src/admin/generated.ts` and fails on missing/stale route-method links or source
drift between the ledger and generated API. Runtime and package tests verify the
generated namespaces, path substitution, command prefixes, uploads, binary
responses, URL helpers, declarations, bundle isolation, and installed package.

## Boundary

The ledger adopts Holm routes, not server authority. Admin callers must provide
explicit operator context, adapters keep auth proof private, and Holm still
authenticates and authorizes every request. Existing Holm SDK files remain
read-only and operational; this evidence does not authorize cutover or deletion.

Before final acceptance, verify the live read-only Holm checkout has no relevant
source drift from the pinned commit and record the fresh authority verdict.
