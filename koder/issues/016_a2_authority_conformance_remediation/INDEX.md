---
status: resolved
priority: P1
created: 2026-07-14
updated: 2026-07-16
resolved: 2026-07-16
tags: a2, authority, conformance, security, transport, caller, capabilities
parent: 001
depends_on: [004, 005, 006]
type: bug
issue_kind: track
slice_count: 6
slices_done: 6
source_review: ../../reviews/024_a2_holm_authority_conformance/INDEX.md
context: Holm's authority review found four P1 and one P2 foundation defects that block A2 acceptance and formal A3 work.
---

# Issue 016: A2 Authority and Conformance Remediation

## Problem

Review `#024` found five SDK/authority gaps beneath the planned app-facing API:

- canonical Holm success/error envelopes and response metadata were not decoded;
- caller/session/token transitions could retain stale cache, query, mutation, or
  in-flight results;
- public and extension code could mutate runtime-owned capability offers;
- credentials could enter diagnostics or cache identity;
- adapter responses were not strictly correlated to requests.

These are implementation gaps under approved decisions `D003`-`D006`, `D008`,
`D011`, and `D015`; they do not reopen A3 design or authorize invented Holm
semantics.

## Authority baseline

- SDK checkpoint reviewed: `fe37f8528eeca38007f575307e7f3e26f642b615`
- Holm baseline used by A2: `11ceae0d88e9c800eb77916e3244fbd231ad81bb`
- Holm HEAD used by Review `#024`: `bdcc8cc51eccef9d9f195a2d35d5db1af39b1655`
- Governing finding set: [`Review #024`](../../reviews/024_a2_holm_authority_conformance/INDEX.md)

Refresh live Holm evidence before final authority return; Holm remains read-only
from this repository.

## Current state

- S01 envelope conformance and S02 caller-transition safety are complete and
  independently approved.
- S03-S05 product remediation is implemented at `a962301`, `ca5e895`, and
  `af846d7`. Generated JavaScript/declarations/maps now match source; transport
  response code was split into measured modules and all size gates pass.
- Independent Reviews `#031` and `#032` found no additional S03-S05 semantic
  defect but exposed coverage-report parsing under color/TAP reporters. Fixes
  `a1ac154` and `69095cb` now make normal and TAP+color full CI green.
- Fresh independent rereview `#033` (owner-present, 2026-07-16) confirmed the
  S03-S05 batch and `69095cb` clean (0 in-batch P1/P2; all four CI gate modes
  green at `699ef68`) but surfaced pre-existing P2-2: unbounded
  `keyGenerations` growth in `src/transports/cache.ts` (from S02-era
  `02f0f63`). P2-2 must be remediated and independently confirmed before the
  no-P1/P2 acceptance box is checked and before the Holm-authority return.
- Queue `#002` is a closed historical record and does not govern recovery. Two
  unattended review attempts exhausted their process/report retry budget, so
  do not auto-dispatch another reviewer without a fresh owner-present run.

## Execution approach

1. Continue serially on `main` from the first incomplete product gate.
2. Use strict red → green → refactor for behavior changes.
3. Treat each public source change as owning affected `dist/` JavaScript,
   declarations, maps, package smoke tests, reproducibility, and size checks.
4. Run one independent SDK review over the completed S03-S05 remediation batch,
   then perform the fresh read-only Holm-authority return.
5. Stop before Issue `#007`, publication, release, deploy, credentials, cloud
   mutation, or edits to another repository.

The S01-S06 plan files are implementation references, not a mandatory worker
chain. Update their assumptions when live source or validation proves them stale.

## Remediation slices

| Slice | Status | Capability / next proof |
| --- | --- | --- |
| S01 | done | Holm `{data,meta}` / `{error}` / headers / `/api/cmd` conformance; approved at `da7cd8d` |
| S02 | done | caller epoch plus cache/query/mutation/in-flight fencing; approved at `5d0df5d` |
| S03 | done | generated package surface is read-only and measured; confirmed by rereview `#033` |
| S04 | done | structural redaction, opaque identity, and redacted observer events; confirmed by `#033` |
| S05 | done | mismatch rejection plus bounded duplicate/late tracking and diagnostics; confirmed by `#033` |
| S06 | done | P2-2 fixed (`9825963` + `fe7879e`), entry review 0 P1/P2 outstanding, four CI modes green; A2 accepted by Review `#034` at Holm `ded755f8` |

## Required behavior

### Holm protocol conformance

Preserve canonical success/error/meta/header behavior and the HTTP-200
`/api/cmd` command-envelope exception with source-pinned fixtures.

### Caller isolation

Caller changes must synchronously fence old data and late work across transport
cache, queries, mutations, browser sessions, explicit tokens, operators, agents,
apps, and future scope changes without moving server authorization into the SDK.

### Capability ownership

Public consumers receive a read-only capability view. Runtime offer replacement
stays private; extension-local offers are constrained to `sdk.*`; extensions
invoke through the narrow lifecycle/cancellation/caller-aware core seam.

### Secret-safe identity and observability

Sensitivity is structural. Exact auth headers and sensitive URL components are
redacted, and raw credentials never enter cache keys, diagnostics, snapshots,
serialized errors, or observational hooks.

### Correlation and provenance

Response IDs must match requests. Duplicate and late mailbox responses are
handled explicitly. Generated artifacts must be reproducible from the reviewed
source and expose the same public contract.

## Acceptance criteria

- [x] S03 package JavaScript, declarations, maps, and exports match corrected source.
- [x] Transport artifact size gate passes, or an explicit reviewed budget change is justified.
- [x] Credential leakage tests cover arbitrary auth headers and sensitive query/path material.
- [x] Cache and public observability surfaces contain no raw credentials.
- [x] Mismatched response IDs fail; duplicate/late response behavior is deterministic and tested.
- [x] `npm run build` and `npm run ci` pass from a clean checkout.
- [x] One fresh independent SDK review reports no P1/P2 findings. (Entry review of `9825963`: 1 P2, fixed at `fe7879e` and re-verified; 0 outstanding — Review `#034` §entry-1.)
- [x] A fresh read-only Holm authority review accepts A2 at a named current commit. (Review `#034`, Holm `ded755f8`, v0.184.0.)
- [x] Existing Holm SDK/state packages remain operational and npm remains private. (`packages/holm-{sdk,state}` unchanged since baseline; `"private": true` verified.)
- [x] Issue `#007` has not begun under this issue.

## Non-goals

- Planning or implementing Issues `#007`-`#015`.
- Adding action discovery, private realtime, presence, app scopes,
  collaboration, desktop, or mobile claims.
- Editing Holm or inventing a second server protocol.
- Publishing, tagging, releasing, deploying, using credentials, or creating
  cloud resources.
