---
status: approved
priority: P1
created: 2026-08-15
review_kind: independent_sdk_review
issue: 019
slice: S2
base_commit: 82145ce79a55b73d5c844e4a01e9517f9ed42682
target_commit: 091e26842a54b7b78af3bda042df641ee89d82e2
verdict: APPROVE
p1: 0
p2: 0
p3: 0
reviewer: codex
harnex_session: cx-cr-070
---

# Review: Issue 019 S2 Route Dispositions
## Scope
Independent, read-only SDK policy/tooling review of exact product range:

`82145ce79a55b73d5c844e4a01e9517f9ed42682..091e26842a54b7b78af3bda042df641ee89d82e2`

Review boundaries honored:
- acted only as independent reviewer;
- no implementation edits, fixes, commits, push, release, publish, deploy, or
  cross-repository writes;
- wrote only this durable review artifact.

## Evidence Reviewed

- `koder/issues/019_holm_route_registry_refresh/INDEX.md`
- `koder/evidence/007_holm_v0207_route_registry/INDEX.md`
- `koder/evidence/007_holm_v0207_route_registry/route-registry.json`
- `koder/evidence/008_holm_v0207_route_dispositions/INDEX.md`
- `koder/evidence/008_holm_v0207_route_dispositions/route-dispositions.json`
- `scripts/check-holm-route-dispositions.mjs`
- `test/tooling/check-holm-route-dispositions.test.mjs`
- `test/evidence/issue019-s2-red.md`
- `package.json`
- `scripts/check-ci-workflow.mjs`
- inherited ledgers:
  - `koder/evidence/003_issue007_app_routes/route-audit.json`
  - `koder/evidence/004_issue008_admin_routes/route-audit.json`
- `koder/docs/ARCHITECTURE.md` and `koder/docs/DECISIONS.md` (`D001`, `D015`)
- `koder/docs/HOLM_SOURCE_MAP.md`
- Holm authority source at commit
  `d66628674232b01e8c95d5b86617bc660d61410f`, including:
  - `packages/holm-sdk/surface.audit.js`
  - `packages/holm-sdk/admin.audit.js`
  - `packages/holm-sdk/admin.js`
  - `docs/reference/http-api.md`
  - `internal/handlers/system.go`
  - `internal/database/db_retention.go`
  - `internal/handlers/spaces.go`

## Findings
### P1

None.

### P2

None.

### P3
None.

## Passing Checks
Required commands run for this review:

- `git status --short --untracked-files=all`
- `git diff --check 82145ce79a55b73d5c844e4a01e9517f9ed42682..091e26842a54b7b78af3bda042df641ee89d82e2`
- `npm run test:holm-route-dispositions`
- `npm run test:ci-workflow`
- `node scripts/refresh-holm-route-registry.mjs --check`

Observed outcomes:

- `git status --short --untracked-files=all` returned clean.
- `git diff --check ...` returned no whitespace/path hygiene issues.
- `npm run test:holm-route-dispositions` passed; checker summary:
  `261 identities (172 adopted, 15 redesigned, 36 deferred, 38 excluded);
  185 current and 2 S3 candidates`.
- `npm run test:ci-workflow` passed and confirms CI includes offline
  route-registry and route-disposition gates.
- `node scripts/refresh-holm-route-registry.mjs --check` passed with pinned
  Holm `0.207.0` and commit `d66628674232b01e8c95d5b86617bc660d61410f`.

Additional bounded checks run:

- Composed disposition programmatic verification:
  - `errors=0`, `resolved=261`, `unique_identities=261`;
  - group `s2-admin-delta=21`; candidates exactly:
    `GET /api/system/db/retention/status` and
    `POST /api/system/db/retention/run`; deferred count `19`.
- Explicit lane verification:
  - `POST /api/spaces/{space}/keys` `dashboard-admin` resolves
    `adopted/current` with `admin:spaces.keys.create`;
  - same method/path `member-host` resolves `deferred/none`.
- Auth-login inherited conflict is explicit (both `ANY /auth/login` and
  `GET /auth/login` resolved to redesigned app behavior with admin exclusion
  basis).

## Policy and Authority Verification

1. **261 identity coverage and no silent broadening:** PASS.
   Composite identity `method + path + source_group + lane` resolves exactly
   once. Supported `ANY` routes explicitly carry `covered_methods`; no inferred
   method expansion was observed.

2. **Inherited app/admin safety and explicit conflict handling:** PASS.
   Inherited ledgers are provenance-pinned, conflicting inherited classifications
   fail closed, and explicit overrides resolve the auth-login conflict and
   preserve lane-level distinctions.

3. **21-row admin delta exactness:** PASS.
   Delta rows are exactly admin/operator dashboard rows from
   `cmd/server/main.go`; disposition is exactly `2` S3 candidates + `19`
   deferred.

4. **Candidate method naming and authority coherence:** PASS.
   Candidate names are coherent and authority anchors match Holm source:
   - status request: `internal/handlers/system.go#SystemDBRetentionStatusHandler`
   - status result: `internal/database/db_retention.go#DBRetentionStatus`
   - run request + dry-run enforcement:
     `internal/handlers/system.go#SystemDBRetentionRunHandler`
   - run result: `internal/database/db_retention.go#DBRetentionReport`.

5. **Dry-run rejection semantics for retention run:** PASS.
   `SystemDBRetentionRunHandler` rejects `apply/force` intent and executes
   `RunDBRetention(..., Apply: false, Owner: "remote")`.

6. **Overrides and non-operation routes consistency:** PASS.
   Upload transport routes remain redesigned behind
   `web:createWebUploadService`; debug/public/browser/helper routes remain
   excluded/deferred per existing architecture and Holm surface audit guidance.

7. **Fail-closed checker + tests/CI adequacy:** PASS.
   Checker rejects missing/duplicate/stale/conflicting/reordered decisions,
   malformed fields, summary/provenance drift, unsupported
   classification/implementation pairs, preview S3 admission, and missing
   contract authority. Focused tests and CI wiring cover removal/regression.

8. **Scope cleanliness and fresh authority gate:** PASS.
   Diff scope is limited to issue/evidence/tooling/tests/package wiring.
   No `src/**`, generated admin API, tracked `dist/**`, version, release,
   Holm, or Medialab edits are in range.

   Read-only Holm authority checks against installed signed `v0.208.0`
   `93606188a1ee064e8aade678891406a671609eb5`:

   - `node scripts/refresh-holm-route-registry.mjs --check-live --holm-bin /home/glasscube/.local/bin/holm`
     fails on provenance only:
     `holm_version 0.207.0 -> 0.208.0` and
     `holm_commit d6662867... -> 93606188...`.
   - Programmatic comparison confirms route-array equality:
     `261 == 261`, `route_arrays_equal=true`, identical route-array hash
     `f90642c34baecf6b5dd0a0ed26503277c70796fbb58d8d7197bcf1275ff69110`.
   - `git diff --name-only d6662867..93606188 -- <S2-relevant paths>` returned
     no file changes for:
     `packages/holm-sdk/{surface.audit.js,admin.audit.js,admin.js}`,
     `docs/reference/http-api.md`, `internal/handlers/system.go`,
     `internal/database/db_retention.go`, and `internal/handlers/spaces.go`.

Execution note: live Holm binary execution required sandbox escalation after
in-sandbox `EPERM`; rerun was read-only and produced the provenance-only drift
expected by the issue contract.

## Verdict
**APPROVE**

Checkpoint disposition: `P1=0`, `P2=0`, `P3=0`.

Issue `#019` S2 may stop at this reviewed checkpoint. S3 remains separately
gated and is not authorized by this review.
