---
issue: 017
plan_family: 004_S01-S08
type: plan-review
verdict: approved
reviewed_commit: 43c294edcbe33fa67f1d69162d0da26158ad181e
reviewed_parent: 363a78ff760c4569be556aae98859c380c71db7d
p1: 0
p2: 0
p3: 0
reviewer: pi-independent
model: api-coding-assistant
date: 2026-07-17
---

# Review 049: W4 v0.1-web plan-family review

## Scope

Fresh independent planning review of Issue `#017` and plan family
`004_S01` through `004_S08` at SDK commit
`43c294edcbe33fa67f1d69162d0da26158ad181e` with parent
`363a78ff760c4569be556aae98859c380c71db7d`.

Read scope stayed within the requested budget: Issue `#017`, plans `004_S01`-
`004_S08`, Issues `#014`/`#015`, Review `#033`, package/build/export/test seams,
approved decisions `D013`/`D014`, and read-only Holm Issue `#534` at
`fb34d6b768f15f9bc596e0b82430e5c678fd2088`. No plan, product, queue, state,
release, or Holm files were changed.

## Verdict

**Approved** for a future owner-authorized single serial Queue `#005` sweep.
Counts: **P1=0, P2=0, P3=0**.

## Criteria disposition

1. **Support matrix / compatibility:** Pass. Issue `#017` and S01/S02/S07 keep
   stable/frozen root, `/core`, `/transports`, `/app`, `/web`, `/state`, and
   `/test`; `/node` and `/sobek` remain preview/not frozen; `/bridge` remains
   reserved/not production; unavailable surfaces are consistently excluded.
2. **Thin executable slices:** Pass. Each plan owns one testable capability,
   normally estimates 60-120 minutes plus validation, and includes red or
   docs-first proof, build-on checks, seams, commands, generated-artifact
   ownership, defer/non-goal lists, risk/ambiguity, review posture, and
   fail-closed stop rules.
3. **Serial dependency order:** Pass. S01 API inventory feeds S02 boundary
   labels; S03/S04 route Review `#033` P3 hardening/disposition; S05/S06 own
   bundle and integrity/offline BFBB gates; S07 owns private RC docs/metadata;
   S08 owns the integrated gate and handoff.
4. **Review `#033` routing:** Pass. S03 routes advisories 1-4 while preserving
   the approved structural-sensitivity contract and caller marking obligation;
   S04 routes advisories 5-9 with explicit fix/test/document/accept outcomes.
5. **Issue `#014` closure path:** Pass. S05/S06 satisfy the existing BFBB bundle,
   manifest, size/license, hash/tamper, offline vendoring, and compatibility
   fixture gates without redefining `#014`; bundle exclusions match the stable
   v0.1-web profile and avoid admin/framework/CRDT/preview-runtime production
   claims.
6. **S07 release safety:** Pass. S07 is limited to private RC metadata/docs and
   explicit non-release wording; package privacy, no publish/tag/release/deploy,
   and broad Issue `#015` remaining open are enforced.
7. **S08 final gate:** Pass. S08 requires four CI modes with identical metrics,
   API drift, clean rebuild/repro, declarations, dist, examples, size, license,
   independent integrated SDK review with zero P1/P2, fresh read-only Holm
   acceptance, clean Git, and an explicit stop before pilot/push/tag/release.
8. **Repository plausibility:** Pass. Current `package.json` scripts, dist/test
   seams, examples, tracked `dist/`, and D013/D014 package/distribution decisions
   can support the planned gates. Existing `vite` tooling means no hidden new
   bundler dependency is required by the plan family.
9. **Packing / queueability:** Pass. The eight rows are serial, non-overlapping,
   and sufficiently packed for an 8-14 hour coordinator-capped sweep while still
   leaving each row independently testable and reviewable.

## Findings

No P1, P2, or P3 findings.

## Queueability judgment

The family is safe to convert into one future Queue `#005` only after the owner
explicitly authorizes W4/queue execution. Recommended orchestration remains
serial on `main`, coordinator cap `2`, no overlapping implementation ownership,
<=5 minute governor fences, and fail-closed stops on any support-matrix,
dependency, authority, reproducibility, release-action, credential, or
cross-repository-write ambiguity.

Expected sweep size: eight implementation/gate rows, roughly 8-14 hours total
plus independent review/Holm acceptance wall time, with S05/S06 likely the
highest-risk distribution rows and S08 the validation/review stop gate.

## Launch recommendation

Approve the plan family for a restarted, owner-authorized W4 Queue `#005` build
and drain. Do not activate W4, create the queue, pilot, push, tag, publish,
release, deploy, or edit Holm in this review session.
