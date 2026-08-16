---
status: approved
priority: P1
created: 2026-08-17
review_kind: independent_sdk_review
issue: 019
slice: S3
base_commit: 914a1e27275f79269dab2d115e2bb9b1da49253e
target_commit: c7e589b8fb29885568becee464a7dbabf285fa0f
verdict: APPROVE
p1: 0
p2: 0
p3: 0
reviewer: codex
harnex_session: cx-cr-071
---

# Review: Issue 019 S3 Retention Parity

## Scope

Independent SDK remediation review of exact product range:

`914a1e27275f79269dab2d115e2bb9b1da49253e..c7e589b8fb29885568becee464a7dbabf285fa0f`

Review boundaries honored:

- acted only as independent reviewer;
- assessed the product range, not the later handoff-state commit;
- wrote only this review artifact;
- made no implementation, test, generated output, issue, state, release,
  publication, deployment, Holm, Medialab, or cloud/production change.

The review authorizes only the Issue `#019` S3 checkpoint. It does not authorize
S4, version changes, release, publication, deployment, or cross-repository work.

## Evidence Reviewed

- `AGENTS.md`
- `koder/STATE.md`
- `koder/docs/EXECUTION.md`
- `koder/issues/019_holm_route_registry_refresh/INDEX.md`
- `koder/docs/HOLM_SOURCE_MAP.md`
- `git diff --find-renames 914a1e2..c7e589b`
- `koder/evidence/004_issue008_admin_routes/INDEX.md`
- `koder/evidence/004_issue008_admin_routes/route-audit.json`
- `koder/evidence/007_holm_v0207_route_registry/route-registry.json`
- `koder/evidence/008_holm_v0207_route_dispositions/INDEX.md`
- `koder/evidence/008_holm_v0207_route_dispositions/route-dispositions.json`
- `scripts/check-admin-api.mjs`
- `scripts/check-holm-route-dispositions.mjs`
- `scripts/check-package.mjs`
- `src/admin/types.ts`
- `src/admin/generated.ts`
- `src/admin/client.ts`
- `src/admin/index.ts`
- `dist/admin/types.d.ts`
- `dist/admin/generated.{js,d.ts}`
- `dist/admin/client.{js,d.ts}`
- `dist/admin/index.d.ts`
- `dist/manifest.json`
- `dist/size-report.json`
- `docs/admin.md`
- `docs/capabilities.md`
- `test/evidence/issue019-s3-red.md`
- `test/source/admin/admin-retention.test.ts`
- `test/source/admin/admin-route-audit.test.ts`
- `test/source/admin/admin.test.ts`
- `test/tooling/check-holm-route-dispositions.test.mjs`
- `test/types/admin-client.test.ts`
- `test/declarations/package-consumer.test.ts`
- `test/dist/index.test.mjs`
- Holm authority at commit
  `d66628674232b01e8c95d5b86617bc660d61410f`:
  `internal/database/db_retention.go`, `internal/handlers/system.go`,
  `cmd/server/main.go`, `docs/reference/http-api.md`,
  `packages/holm-sdk/admin.audit.js`, and `packages/holm-sdk/admin.js`.

## Findings

### P1

None.

### P2

None.

### P3

None.

## Review Questions

1. **Scope exactness:** PASS.
   The product diff adds exactly two generated admin methods,
   `system.dbRetentionStatus` and `system.dbRetentionRun`. Direct diff probes
   found no package version, dependency, workflow, release, changelog, core,
   web, node, sobek, app, state, transport, or bridge source broadening. The
   admin ledger moves from 174 to 176 keys and 189 to 191 route/method
   contracts, while exclusions remain 18 and generated methods become 218.

2. **Holm contract fidelity:** PASS.
   Pinned Holm `DBRetentionStatus`, `DBRetentionFamilyStatusReport`,
   `DBRetentionReport`, `DBRetentionFamilyReport`, and retention candidates
   match the SDK readonly TypeScript fields, JSON names, and optionality.
   Remote report literals are correctly narrowed to `dry_run: true` and
   `applied: false` because the pinned handler invokes
   `RunDBRetention(..., DBRetentionRunOptions{Apply: false, Owner: "remote"})`.

3. **Bodyless safety:** PASS.
   Generated descriptors mark both retention methods with
   `requestBody: "forbidden"`. The high-level signatures accept only headers,
   timeout, sensitivity, cancellation control, and reason. Literal
   `admin.invoke("system.dbRetentionRun", ...)` is type-narrowed, and runtime
   `createRequestBody()` throws before adapter invocation whenever a dynamic
   JavaScript caller supplies `body`.

4. **Existing semantics:** PASS.
   Caller identity, admin capability gating, auth handling, operation controls,
   response envelopes, raw/binary special cases, uploads, command handling, URL
   helpers, cache invalidation, and unrelated generated methods are unchanged.
   The bodyless branch is descriptor-gated and does not alter existing request
   descriptors.

5. **Inventory/disposition integrity:** PASS.
   The route-disposition ledger still resolves all 261 composite identities
   exactly once: 172 adopted, 15 redesigned, 36 deferred, and 38 excluded. S3
   promotes exactly the two stable retention rows to `current` with
   `implemented_in: "sdk#019/S3"`; implementation summary is 187 current,
   0 S3 candidates, and 74 none. The 19 other admin-delta rows remain deferred.

6. **Artifact completeness:** PASS.
   Source, generated JS, declarations, source maps, docs, manifest, size report,
   package smoke, and dist tests are internally consistent. The manifest
   includes updated admin client/generated/type artifacts and the size report is
   green at `297073` raw / `226805` minified / `58616` gzip bytes.

7. **TDD and regression quality:** PASS.
   RED evidence records missing source methods/types, absent disposition
   promotion, stale tracked declarations/ESM, and the initially over-broad
   low-level invoke signature before implementation. Regression tests cover
   source runtime behavior, type-level high-level and low-level body rejection,
   declarations, generated dist, route inventory, and fail-closed disposition
   constraints.

8. **Universal-core and release boundaries:** PASS.
   The change stays in admin-specific source and generated/package artifacts.
   Core remains free of DOM/Node ambient types, no dependency was added, package
   identity remains `@holmhq/sdk@0.2.1`, and no release/publication/deployment
   or cross-repository write was performed.

## Authority Verification

- Pinned Holm source at `d66628674232b01e8c95d5b86617bc660d61410f` registers:
  `GET /api/system/db/retention/status` and
  `POST /api/system/db/retention/run`.
- `SystemDBRetentionStatusHandler` returns
  `database.DBRetentionCurrentStatus(...)` through the normal success envelope.
- `SystemDBRetentionRunHandler` rejects `apply` or `force` request bodies before
  retention work, then runs retention with `Apply: false` and `Owner: "remote"`.
- `docs/reference/http-api.md` names both SDK methods and documents remote run
  as dry-run only.
- Installed Holm live check required sandbox escalation because executing the
  Holm binary was blocked by `EPERM`. The escalated read-only check failed only
  on expected provenance drift:
  snapshot `0.207.0` / `d6662867...`, live `0.208.0` / `93606188...`.
- The local Holm checkout was dirty before review and was not modified. Pinned
  source was read with `git show`; live dirty changes observed in Holm were
  outside the retention database structs and handlers.

## Passing Checks

Required commands run:

- `git status --short --untracked-files=all`: clean before writing this review.
- `git diff --check 914a1e27275f79269dab2d115e2bb9b1da49253e..c7e589b8fb29885568becee464a7dbabf285fa0f`:
  pass, no whitespace/path hygiene output.
- `npm run test:admin-api`: pass.
  `176 keys, 191 route/method contracts, 218 methods, 18 exclusions`.
- `npm run test:holm-route-dispositions`: pass.
  `261 identities (172 adopted, 15 redesigned, 36 deferred, 38 excluded);
  187 current and 0 S3 candidates`.
- `npm run test:source`: pass.
  Direct sandbox run reported 39 compiled test modules; full CI later reported
  231 source tests.
- `npm run test:types`: pass.
- `npm run test:declarations`: pass, including stable API drift check for
  7 entry points.
- `npm run test:dist`: pass.
- `npm run ci`: pass outside the sandbox after the sandbox run was blocked by
  child-process restrictions. Observed terminal evidence includes 231 source
  tests passing, coverage check passing with `changed_reachable=100.00`, license
  check passing for 72 locked packages, size passing at
  `297073 / 226805 / 58616`, and package smoke passing with 290 files and
  installed export smoke green.

Additional bounded checks:

- `npm run test:holm-route-registry`: sandbox run failed at the child-process
  test boundary; escalated rerun passed 18 tests and the offline snapshot check
  for 261 routes from Holm `0.207.0`.
- `node scripts/refresh-holm-route-registry.mjs --check-live --holm-bin /home/glasscube/.local/bin/holm`:
  sandbox run failed with `spawnSync ... EPERM`; escalated read-only rerun
  reported only expected Holm version/commit provenance drift.

## Failing Checks

No product validation command remains failing.

The only failures observed were sandbox limitations around child-process
execution:

- live Holm binary execution failed in-sandbox with `EPERM`;
- the first `npm run test:holm-route-registry` and `npm run ci` attempts
  stopped when sandboxed child-process execution was blocked.

Each affected required gate was rerun outside the sandbox and passed, except
the live authority comparison whose non-zero exit was the expected
provenance-only drift report.

## Verdict

**APPROVE**

Checkpoint disposition: `P1=0`, `P2=0`, `P3=0`.

Issue `#019` S3 may stop at this reviewed checkpoint. This review does not
authorize S4, release, publication, deployment, Holm writes, Medialab writes, or
any other cross-repository mutation.
