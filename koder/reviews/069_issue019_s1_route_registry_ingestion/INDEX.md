---
status: approved
priority: P1
created: 2026-08-15
review_kind: independent_sdk_review
issue: 019
slice: S1
base_commit: 263bce8258e79bbac92dbf77aec43d24ae92f72e
target_commit: de5530a1a7f6954f1a47c0df48264dc769d214de
verdict: APPROVE
p1: 0
p2: 0
p3: 0
reviewer: codex
harnex_session: cx-cr-069
---

# Review: Issue 019 S1 Route Registry Ingestion

## Scope

Independent, read-only checkpoint review of Issue `#019` S1 over the exact
product range
`263bce8258e79bbac92dbf77aec43d24ae92f72e..de5530a1a7f6954f1a47c0df48264dc769d214de`.

Bounded materials reviewed:

- `koder/issues/019_holm_route_registry_refresh/INDEX.md`
- `scripts/refresh-holm-route-registry.mjs`
- `test/tooling/refresh-holm-route-registry.test.mjs`
- `scripts/check-ci-workflow.mjs`
- `package.json`
- `.github/workflows/ci.yml`
- `koder/evidence/007_holm_v0207_route_registry/INDEX.md`
- `koder/evidence/007_holm_v0207_route_registry/route-registry.json`
- `koder/docs/HOLM_SOURCE_MAP.md`
- Holm release authority source at commit
  `d66628674232b01e8c95d5b86617bc660d61410f`, including
  `cmd/server/api_routes.go`, `cmd/server/route_registry_test.go`,
  `cmd/server/route_table_golden_test.go`, and
  `internal/server/routes/routes.go`.

Excluded by contract: implementation edits, S2 planning, policy classification,
release/publish/deploy actions, Holm writes, and cross-repository mutation.

## Evidence Reviewed

- Identity checks matched the brief:
  - SDK `HEAD`: `f094dde07286658ce329187229d32e1fc7822f18`
  - base commit exists: `263bce8258e79bbac92dbf77aec43d24ae92f72e`
  - target commit exists: `de5530a1a7f6954f1a47c0df48264dc769d214de`
- Diff scope is exactly 8 files (evidence snapshot/index, issue ledger,
  package/CI gate wiring, refresh tool, RED note, focused tooling tests).
- No public SDK `src/**`, generated API, or `dist/**` path appears in range.
- Holm authority commit `d66628674232b01e8c95d5b86617bc660d61410f`
  resolves in local checkout and confirms route-export row schema and field set.
- Holm golden identity key uses `method + path + source_group + lane` via
  `routeTableGoldenRowKey` and downstream registry-key maps in release tests.
- Programmatic snapshot inspection confirms:
  - `schema=holm.route-registry.v1`
  - `holm_version=0.207.0`
  - `holm_commit=d66628674232b01e8c95d5b86617bc660d61410f`
  - `route_count=261`
  - `identity_unique=261`, `duplicate_count=0`
  - two valid `POST /api/spaces/{space}/keys` lanes retained
  - trailing newline present
  - SHA-256 `4cd21d8e6f288e2c0d9cfe6ec17a96b71072bf152e52407435c3d0f1c25cdba1`.

## Findings

### P1

None.

### P2

None.

### P3

None.

## Passing Checks

Required commands executed for this review:

- `git status --short --untracked-files=all`
- `git diff --check 263bce8258e79bbac92dbf77aec43d24ae92f72e..de5530a1a7f6954f1a47c0df48264dc769d214de`
- `npm run test:holm-route-registry`
- `npm run test:ci-workflow`
- `node scripts/refresh-holm-route-registry.mjs --check`
- `node scripts/refresh-holm-route-registry.mjs --check-live --holm-bin "$(command -v holm)"`

Observed outcomes:

- `git diff --check` returned no whitespace/path hygiene violations.
- `npm run test:holm-route-registry` passed 18/18 and offline check passed.
- `npm run test:ci-workflow` passed.
- Offline `--check` passed with pinned 261-route/commit summary.
- Live `--check-live` passed against local Holm binary with exact match.

Execution note: sandboxed Node subprocess execution returned EPERM for child
process spawning; required command reruns were executed outside sandbox and
passed without code changes.

## Verification

Question-by-question result for the S1 contract:

1. **Fail-closed validation:** PASS. Envelope/data/meta exact-key checks,
   schema/provenance/field/vocabulary guards, non-empty routes, and duplicate
   composite identity rejection are implemented and tested.
2. **Composite identity consistency:** PASS. Duplicate detection and drift maps
   use `method + path + source_group + lane` consistently for add/remove/change
   and order diagnostics.
3. **Attributes vs identity + multi-lane preservation:** PASS.
   `auth_scope`/`surface_class`/`stability` are attribute-level diffs, not
   identity fields, and both valid `POST /api/spaces/{space}/keys` lanes survive.
4. **Deterministic canonical output:** PASS. Canonical serializer is stable,
   preserves row order, and enforces exactly one trailing newline via byte match.
5. **argv safety + override precedence:** PASS. Holm invocation is argv-array
   `spawnSync(..., HOLM_ARGUMENTS, { shell: false })`; explicit `--holm-bin`
   overrides `HOLM_BIN` and is test-covered.
6. **Offline `--check` isolation:** PASS. `--check` reads and validates only the
   checked-in snapshot; no Holm execution is permitted/required.
7. **Live drift diagnostics:** PASS. `--check-live` reports attributable
   provenance drift, route adds/removes, attribute changes, and order changes.
8. **CI offline-only gate + removability detection:** PASS. Canonical CI runs
   `test:holm-route-registry` (offline check), excludes live mode, and has a
   dedicated checker/test that fails if this contract is altered.
9. **Focused test coverage:** PASS. Tests cover positive multi-lane retention,
   duplicate composite identity rejection, argv safety, noncanonical bytes,
   route/provenance drift, identity-field changes, attribute changes, and order.
10. **Snapshot and scope boundary:** PASS. Checked snapshot matches signed
    Holm `v0.207.0` export (261 rows, expected commit/hash), and the range has
    no public SDK source, generated API, `dist`, disposition, version, or
    release-state change.

## Verdict

**APPROVE.**

Checkpoint result: **P1=0, P2=0, P3=0**.

The Issue `#019` S1 checkpoint is acceptable and may advance to owner-activated
S2 in a fresh session.
