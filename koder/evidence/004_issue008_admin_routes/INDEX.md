---
title: Issue 008 admin route conformance ledger
status: current
issue: 008
sdk_target: 0.2.0
holm_commit: d66628674232b01e8c95d5b86617bc660d61410f
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

- 176 supported audit keys;
- 191 expanded HTTP route/method contracts;
- 218 unique SDK method paths;
- 18 intentional exclusions.

`node scripts/check-admin-api.mjs` deterministically projects the ledger into
`src/admin/generated.ts` and fails on missing/stale route-method links or source
drift between the ledger and generated API. Issue `#019` S3 refreshed the
source pin to signed Holm `v0.207.0` and added only the reviewed retention status
and server-enforced dry-run routes. Runtime and package tests verify the
generated namespaces, exact retention types/body policy, path substitution,
command prefixes, uploads, binary responses, URL helpers, declarations, bundle
isolation, and installed package.

## Boundary

The ledger adopts Holm routes, not server authority. Admin callers must provide
explicit operator context, adapters keep auth proof private, and Holm still
authenticates and authorizes every request. Existing Holm SDK files remain
read-only and operational; this evidence does not authorize cutover or deletion.

Before final acceptance, verify the live read-only Holm checkout has no relevant
source drift from the pinned commit and record the fresh authority verdict.
