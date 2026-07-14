---
title: A2R Remediation Plan Conformance Review
status: complete
verdict: needs_fixes
type: plan-review
reviewer: claude-opus
reviewed_at: 2026-07-14
issue: 016
plan_family: 002
queue: 002_a2r_authority_conformance
reviewed_commit: b1bac2d7f1b0ec5129c436e07d547661c6b2ff58
holm_baseline: 11ceae0d88e9c800eb77916e3244fbd231ad81bb
holm_head_reviewed: bdcc8cc51eccef9d9f195a2d35d5db1af39b1655
p1: 1
p2: 2
p3: 2
---

# A2R Remediation Plan Conformance Review

## Scope

Independent plan-review of the A2R remediation plan family `002` and Queue
`#002` at SDK `b1bac2d`, against Holm-authority Review `#024`, Issue `#016`, and
approved decisions `D001`-`D015`. Reviewed the full canonical set: `AGENTS.md`,
`koder/STATE.md`, `koder/docs/{EXECUTION,BLIND_ORCHESTRATION,ARCHITECTURE,DECISIONS,HOLM_SOURCE_MAP}.md`,
`koder/issues/001` and `016`, `koder/reviews/024`, conveyor
`koder/plans/002_S00_a2r_conveyor/INDEX.md`, the six slice plans
`002_S01`-`002_S06`, and `koder/queue/002_a2r_authority_conformance/INDEX.md`.
Cross-checked cited SDK seams and `package.json`; Holm conclusions pinned to
baseline `11ceae0` / reviewed HEAD `bdcc8cc`. This is review only; no plan,
queue, product, or state file was edited.

## Verdict

**needs_fixes.** The plan family is not executable and not queueable as written.
The six per-slice plans that a blind implementation worker is dispatched to read
have no content: each committed body is a 24-byte unexpanded shell placeholder.
Queue `#002` frontmatter is structurally safe and correctly withheld from
execution, but every one of its six rows points at an empty plan, so no row is
executable. This is a regenerable authoring defect, not an authority or
owner/architecture blocker, so the verdict is `needs_fixes`, not `blocked`.

## Findings

### P1-1 — All six slice plan bodies are unexpanded shell placeholders

**Evidence.** At committed HEAD `b1bac2d`, every slice plan body is the literal
string `$(cat /tmp/plan_sNN.md)` (24 bytes), i.e. a command substitution that was
never expanded when the plan was written:

- `koder/plans/002_S01_holm_envelope_semantics/INDEX.md` → `$(cat /tmp/plan_s01.md)`
- `koder/plans/002_S02_caller_transition_safety/INDEX.md` → `$(cat /tmp/plan_s02.md)`
- `koder/plans/002_S03_capability_extension_ownership/INDEX.md` → `$(cat /tmp/plan_s03.md)`
- `koder/plans/002_S04_credential_safe_diagnostics_cache_identity/INDEX.md` → `$(cat /tmp/plan_s04.md)`
- `koder/plans/002_S05_response_correlation_provenance/INDEX.md` → `$(cat /tmp/plan_s05.md)`
- `koder/plans/002_S06_integrated_authority_return/INDEX.md` → `$(cat /tmp/plan_s06.md)`

Confirmed against the committed blob (`git show HEAD:<path>`), not a stray local
artifact; the tree is clean at `b1bac2d`.

**Impact.** No slice plan contains a red test target, minimal green seam,
refactor step, validation command set, bounded write-ownership, or Holm authority
evidence pins. Under `koder/docs/BLIND_ORCHESTRATION.md` the per-entry loop
dispatches a fresh worker to "read the plan/source"; that worker would read 24
bytes of shell text. Issue `#016` acceptance criterion "Review `#024` P1-1
through P1-4 and P2-1 are each mapped to reviewed, queueable strict-TDD plans" is
not met. Review criteria 1 (coverage), 3 (thinness/ownership), and 4 (strict
TDD) fail at the artifact level; criterion 2 (authority conformance) is
unverifiable because there is nothing to check. The only real finding→slice
mapping lives in the S00 conveyor table and the Queue `#002` table; the canonical
plan artifacts themselves are empty.

**Required fix.** Re-author all six `INDEX.md` bodies with real content. Each must
give: an executable first red test (exact `test/source/**` path + failing
assertion), a minimal green seam citing the exact A2 source file/line from Review
`#024`, a refactor step, the full validation command list (aligned with
`package.json` and Queue `#002`), bounded per-file write-ownership, authority
evidence pinned to Holm `11ceae0`/`bdcc8cc`, and the row stop rule. Verify no
`$(...)` / single-quoted-heredoc literal survives and every body is substantive.

### P2-1 — S00 conveyor prescribes npm scripts that do not exist

**Evidence.** The conveyor slice table
(`koder/plans/002_S00_a2r_conveyor/INDEX.md:27-32`) lists validation such as
`npm run test -- test/protocol`, `npm run typecheck`, `npm run test -- test/caller`.
`package.json` defines only: `build`, `check:licenses`, `check:repro`, `ci`,
`coverage`, `size`, `test:coverage`, `test:declarations`, `test:dist`,
`test:source`, `test:types`, `typecheck:core`. There is **no** `test` or
`typecheck` script (verified: `npm run test` / `npm run typecheck` both absent).
Queue `#002` rows use the correct `npm run test:source -- <path>`,
`npm run typecheck:core`, `npm run ci`.

**Impact.** A worker following the conveyor's validation column hits npm
"missing script" errors, and the conveyor contradicts the executable queue
contract on the same slices.

**Required fix.** Align the conveyor validation column with `package.json` and
Queue `#002` (`npm run test:source -- <path>`, `npm run typecheck:core`,
`npm run ci`; full gate at S06). Keep the queue as the single executable source.

### P2-2 — Conveyor write-ownership paths do not exist and misstate the real A2 seams

**Evidence.** The conveyor proposes write ownership under `src/core/protocol/*`,
`src/core/caller/*`, `src/core/capabilities/*`, `src/core/extensions/*`,
`src/core/diagnostics/*`, `src/core/cache/*`, `src/core/transport/*`,
`src/core/provenance/*`, `src/core/integration/*` — **none of these directories
exist**. Review `#024` cites the real flat-file seams: `src/transports/index.ts`
(P1-1 `:296-305,469-527`; P1-4 `:350-359,578-583`), `src/core/caller.ts` (P1-2
`:35-37,85-87`), `src/state/mutation.ts` (P1-2 `:213`), `src/core/capabilities.ts`
(P1-3 `:59-64`), `src/core/create-holm.ts` (`:36,79`), `src/core/extensions.ts`
(`:36-38,429-435`), `src/core/cache-key.ts` (P1-4 `:16-25`),
`src/transports/cache.ts` (P1-4 `:382-390`), `src/core/invoke.ts` (P2-1
`:54,88-93`) — all confirmed present.

**Impact.** The only authored ownership hint points at non-existent paths, and
S01 (envelope), S04 (redaction/cache), and S05 (correlation) all in reality touch
`src/transports/index.ts`. The conveyor claims non-overlapping ownership; serial
S01→S04→S05 order can fence this, but only if per-slice plans delimit the owned
regions — which they cannot, being empty (P1-1).

**Required fix.** Replace speculative directories with the exact existing files
each slice edits, and state explicitly how the shared `src/transports/index.ts`
region is partitioned and sequenced across S01/S04/S05.

### P3 notes (non-blocking)

- **P3-1 ledger count mismatch.** Issue `#016` frontmatter declares
  `slice_count: 5` with a five-row ledger (P1-1..P1-4, P2-1), but the plan family
  and Queue `#002` have six rows (S05 correlation/provenance and S06 integrated
  return split the issue's fifth direction). The conveyor even instructs "Add/
  maintain six ledger rows S01-S06 under Issue `#016`," contradicting the current
  count. Reconcile the ledger metadata when plans are authored; do not change
  `D001`-`D015`.
- **P3-2 `/api/cmd` not named.** Review `#024` P1-1 requires explicit handling of
  the `/api/cmd` HTTP-200 command envelope plus `meta` and response-header
  preservation; conveyor S01 says only "envelope semantics parity." The
  re-authored S01 plan should name `/api/cmd`, `meta`, headers, and the
  source-pinned Holm fixtures.

## Passing Checks

Contingent on the plan bodies being authored, the surrounding metadata is sound:

- **Queue safety.** Queue `#002` frontmatter is thin and correctly gated:
  `status: in_review`, `execution_authorized: false`, `coordinator_entry_cap: 3`,
  `max_fix_cycles_per_row: 2`, `serial_branch: main`,
  `independent_review_required: true`, `final_integrated_review_required: true`,
  `owner_launch_gate: plan_approval_plus_separate_owner_authorization_required`.
  The two-gate launch (plan approval + separate owner authorization) is explicit.
- **Finding mapping is 1:1.** Each authority finding is owned by a dedicated
  non-integration row (P1-1→S01, P1-2→S02, P1-3→S03, P1-4→S04, P2-1→S05), with
  integration isolated to S06. No finding is hidden only in the integrated slice.
- **DAG consistency.** Conveyor DAG (`S01→{S02,S03,S04,S05}`; `S02→S05`;
  `{S01..S05}→S06`) matches the Queue "Depends on" column; S06 is the only
  integration row and depends on all prior rows.
- **Final gate is explicit.** S06 runs the full suite (`test:source`,
  `test:types`, `test:declarations`, `test:dist`, `test:coverage`, `check:repro`,
  `check:licenses`, `size`, `ci`); Queue Done-state requires independent SDK
  review with zero P1/P2, fresh read-only Holm authority acceptance at a named
  commit, clean/synced Git, and return before Issue `#007`.
- **No scope smuggling.** Conveyor and queue forbid release/publish/deploy/cloud/
  credentials/cross-repo edits, keep Queue `#001` historical, make no A3 claim,
  and never delete/redirect Holm's existing packages.
- **Red targets have real files.** All eleven Queue-referenced A2 test files exist
  (`transport-contract`, `caller-reset`, `query`, `mutation`, `capabilities`,
  `extensions`, `runtime-invocation`, `diagnostics`, `cache`, `cache-invalidation`,
  `upload`), so once plans specify assertions the strict-TDD red step has files to
  extend.
- **No decision drift.** Nothing in the metadata alters `D001`-`D015` or invents
  Holm semantics; universal-core / security invariants are not contradicted by
  metadata (they are simply unaddressed by the empty bodies).

## Coverage Matrix

| Authority finding (Review `#024`) | Required correction | Owning slice | Plan body | Executable? |
| --- | --- | --- | --- | --- |
| P1-1 transport envelope/`meta`/error/header + `/api/cmd` | Holm protocol layer + source-pinned fixtures + `#005` ledger | S01 | placeholder | No |
| P1-2 caller partition safety | provider epoch/fingerprint + cache/query/mutation + in-flight fencing | S02 | placeholder | No |
| P1-3 capability/extension control plane | read-only view + private updater + narrow `sdk.*` extension invocation | S03 | placeholder | No |
| P1-4 credentials in diagnostics/cache keys | structural redaction + opaque cache identity | S04 | placeholder | No |
| P2-1 response↔request correlation | reject mismatched IDs; ignore/diagnose late/dup mailbox | S05 | placeholder | No |
| Integrated authority return + final gate | end-to-end validation + provenance + two reviews | S06 | placeholder | No |

Queue `#002`: metadata safe and correctly non-executable; all six rows blocked on
placeholder plans.

## Verification

Read-only inspection plus committed-blob checks; no product/plan/queue/state
mutation. Commands and exits recorded during finalization:

1. `git diff --check` → exit 0.
2. `test -f koder/reviews/025_a2r_remediation_plan_conformance/INDEX.md` → exit 0.
3. Frontmatter check (normalized `verdict`, integer `p1`/`p2`/`p3`) → pass.
4. Coverage check (names S01-S06, Queue `#002`, P1-1/P1-2/P1-3/P1-4/P2-1) → pass.
5. `git diff --name-only b1bac2d7f1b0ec5129c436e07d547661c6b2ff58` → only this
   review path changed.

Evidence pins: SDK reviewed `b1bac2d`; Holm baseline `11ceae0`; Holm HEAD
`bdcc8cc`. No Holm drift affecting these conclusions was assumed.

## Required Next Action

Dispatch a fresh plan-fix worker to re-author all six `002_S0x` slice plan bodies
(P1-1), correct the conveyor validation commands (P2-1) and write-ownership paths
(P2-2), and reconcile the ledger count and `/api/cmd` notes (P3-1, P3-2). Then a
fresh independent plan re-review must confirm the plans before Queue `#002`
becomes eligible for the separate owner launch authorization. Do not implement
product code, launch Queue `#002`, or begin Issue `#007` from this state.
