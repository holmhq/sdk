---
title: Holm v0.207.0 route registry snapshot
status: current
issue: 019
slice: S1
schema: holm.route-registry.v1
holm_version: 0.207.0
holm_commit: d66628674232b01e8c95d5b86617bc660d61410f
route_count: 261
sha256: 4cd21d8e6f288e2c0d9cfe6ec17a96b71072bf152e52407435c3d0f1c25cdba1
updated: 2026-08-14
---

# Holm v0.207.0 Route Registry Evidence

`route-registry.json` is the canonical SDK-side snapshot of the offline
`holm.route-registry.v1` success envelope emitted by the signed local Holm
`v0.207.0` binary.

## Provenance and generation

- Source command: `holm api routes --format json`.
- Holm version: `0.207.0`.
- Exact release commit:
  `d66628674232b01e8c95d5b86617bc660d61410f`.
- Canonical snapshot: 77,010 bytes, newline-terminated, SHA-256
  `4cd21d8e6f288e2c0d9cfe6ec17a96b71072bf152e52407435c3d0f1c25cdba1`.
- The signed binary's raw JSON bytes and the canonical checked-in bytes have
  the same SHA-256.
- Regeneration command:
  `node scripts/refresh-holm-route-registry.mjs --write --holm-bin "$(command -v holm)"`.

The writer validates the success envelope, release provenance, exact schema and
object fields, route vocabulary, required strings, and composite route-row
identity before writing. Normalization preserves registry row order and emits a
stable two-space JSON representation with one trailing newline.

## Inventory

- 261 routes and 261 unique composite identities.
- Surface classes: 151 `admin/operator`, 93 `app-facing`, 17 `system/public`.
- Stability: 172 `stable`, 62 `preview`, 27 `internal`.
- Methods: 41 `ANY`, 21 `DELETE`, 99 `GET`, 6 `GET,HEAD`, 3 `PATCH`,
  78 `POST`, and 13 `PUT`.

Holm route-row identity is
`method + path + source_group + lane`. The snapshot intentionally preserves both
`POST /api/spaces/{space}/keys` rows: `dashboard-admin` and `member-host`.
`auth_scope`, `surface_class`, and `stability` remain attributes and do not
change identity.

## Drift gates and boundary

- `node scripts/refresh-holm-route-registry.mjs --check` is the normal offline,
  network-free CI gate. It reads only the checked-in snapshot.
- `node scripts/refresh-holm-route-registry.mjs --check-live --holm-bin "$(command -v holm)"`
  is an explicit authority check. It compares provenance, route additions and
  removals, attribute changes, and row order using the same composite identity.
- `test/tooling/refresh-holm-route-registry.test.mjs` uses temporary fake Holm
  executables and fixtures; negative cases never mutate this evidence.

This evidence records machine facts only. It does not classify route
adoption, generate public SDK methods, alter `dist/`, or authorize Holm,
release, publication, deployment, or Medialab changes.
