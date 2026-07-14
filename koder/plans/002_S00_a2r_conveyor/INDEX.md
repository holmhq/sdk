# Plan 002 - A2R remediation conveyor mapping (Issue 016)

## Scope and authority

- Goal: map independently testable A2 authority-remediation slices for Queue `#002`
  without executing queue work.
- Authorization: planning only for Issue `#016`; no product implementation, no queue
  execution, no Issue `#007+` activation.
- Authority: Holm runtime/protocol behavior is read-only authority as documented in
  Review `#024` and pinned source map evidence. Decisions are bounded to `D001-D015`.
- Serial model: branch `main`, single active writer, blind coordinator workflow per
  `koder/docs/BLIND_ORCHESTRATION.md`.

## Inherited constraints

- Preserve Universal App Runtime invariants and strict TypeScript layering.
- No invented Holm semantics; if evidence is insufficient or contradictory, stop and
  escalate in queue row notes.
- Keep runtime adapters optional and avoid cross-repo edits.
- Each slice must define strict TDD red target, isolated write ownership, and full
  validation command set.

## Slice table (independently testable rows)

| Slice | Proposed Plan Path / Title | Capability focus | Primary source seam | Likely write ownership | Prerequisite | Strict-TDD red target | Full validation | Est (min) | Risk | Ambiguity | Stop rule |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| S01 | `koder/plans/002_S01_holm_envelope_semantics/INDEX.md` Envelope semantics parity | Align SDK envelope behavior with Holm authority response framing | Holm envelope handling seams cited by Review `#024` + `koder/docs/HOLM_SOURCE_MAP.md` | `src/core/protocol/*`, envelope tests under `test/protocol/*` | none | New/updated tests fail on mismatched success/error envelope normalization | `npm run test -- test/protocol`; `npm run typecheck`; `npm run ci` | 90 | medium | low | Stop if required envelope field semantics are absent from pinned Holm evidence |
| S02 | `koder/plans/002_S02_caller_transition_safety/INDEX.md` Caller transition safety gates | Enforce caller identity transition invariants across transport/runtime boundaries | Caller identity seams from Review `#024`, architecture caller contract docs | `src/core/caller/*`, runtime adapter boundary tests | S01 | Red tests for invalid caller transition acceptance and missing guard propagation | `npm run test -- test/caller`; `npm run typecheck`; `npm run ci` | 105 | medium-high | medium | Stop if transition contract requires new decision outside `D001-D015` |
| S03 | `koder/plans/002_S03_capability_extension_ownership/INDEX.md` Capability/extension ownership boundaries | Ensure capability registration and extension lifecycle ownership is explicit and authority-aligned | Capability registry seams in architecture + review findings | `src/core/capabilities/*`, `src/core/extensions/*`, focused tests | S01 | Failing tests for ownership collisions/unauthorized extension attachment | `npm run test -- test/capabilities test/extensions`; `npm run typecheck`; `npm run ci` | 110 | high | medium | Stop if ownership graph crosses runtime layer boundaries not currently modeled |
| S04 | `koder/plans/002_S04_credential_safe_diagnostics_cache_identity/INDEX.md` Credential-safe diagnostics and cache identity | Remove credential leakage paths and align cache identity derivation with authority constraints | Diagnostics/cache seams in Review `#024`; DECISIONS + architecture observability constraints | `src/core/diagnostics/*`, `src/core/cache/*`, tests under `test/diagnostics`/`test/cache` | S01 | Red tests proving secret-bearing diagnostics or unstable cache identity keys | `npm run test -- test/diagnostics test/cache`; `npm run typecheck`; `npm run ci` | 120 | high | medium | Stop if remediation needs credential storage format change or secret management policy invention |
| S05 | `koder/plans/002_S05_response_correlation_provenance/INDEX.md` Response correlation and provenance | Guarantee deterministic request/response correlation and provenance trail integrity | Response metadata seams documented in Review `#024` and source map | `src/core/transport/*`, `src/core/provenance/*`, protocol tests | S01,S02 | Failing tests on correlation ID mismatch, dropped provenance, or non-deterministic ordering | `npm run test -- test/transport test/provenance`; `npm run typecheck`; `npm run ci` | 95 | medium-high | low | Stop if Holm authority evidence does not define required provenance fields |
| S06 | `koder/plans/002_S06_integrated_authority_return/INDEX.md` Integrated authority return path | Validate end-to-end authority-conformant return shape across composed slices | Integration seams across S01-S05 with Issue `#016` acceptance criteria | `src/core/integration/*`, end-to-end contract tests in `test/integration/*` | S01,S02,S03,S04,S05 | Red integration contract tests against approved A2 authority expectations | `npm run test -- test/integration`; `npm run typecheck`; `npm run ci`; bundle/declarations checks used in queue policy | 115 | high | medium | Stop if integration requires architecture-level API redesign or cross-repo protocol edits |

## Dependency DAG

- `S01` roots authority envelope normalization and is mandatory first.
- `S02`, `S03`, and `S04` depend on `S01` and can be queued serially in any order
  that preserves non-overlapping ownership; recommended order below minimizes overlap.
- `S05` depends on `S01` and `S02` because correlation/provenance consumes caller-safe
  transition context.
- `S06` depends on completion of `S01-S05` and is the only integration row.

DAG edges: `S01 -> {S02,S03,S04,S05}`; `S02 -> S05`; `{S01,S02,S03,S04,S05} -> S06`.

## Serial ownership/overlap order for `main`

1. `S01` (protocol envelope seam).
2. `S02` (caller transition seam).
3. `S03` (capability/extension seam).
4. `S04` (diagnostics/cache seam).
5. `S05` (transport/provenance seam).
6. `S06` (integration seam only after prior rows land).

Rationale: keeps per-row write sets narrow, reduces merge churn, and preserves
coordinator blind operation with stable changed-path summaries.

## Queue #002 packing guidance (blind orchestration)

- Queue mode: blind orchestrator only; coordinator reads row metadata, changed paths,
  compact sidecars, validation exits, and review verdicts only.
- Coordinator cap: `<=3` active coordinators; each coordinator processes one current
  row at a time.
- Fix loops: max `2` review-fix cycles per row; unresolved P1/P2 after cycle 2 blocks
  row and escalates to owner.
- Every row requires fresh independent review worker separate from implementer.
- Enforce serial `main` landing; do not parallel-merge rows with overlapping ownership.
- After `S06`, run final integrated authority review for Issue `#016` before any
  downstream issue activation.

## Progress accounting and Issue #016 slice ledger tie-in

- Add/maintain six ledger rows `S01-S06` under Issue `#016` with status fields:
  `planned -> in_progress -> review -> fix(optional) -> approved -> done`.
- Each row records: plan path, implementation commit, review commit/verdict,
  validation summary, blocker (if any), and next eligible row.
- Queue completion for Issue `#016` requires all six rows `done` plus final integrated
  review approved.

## Deferred/non-goals and hard stops

- Non-goals: architecture rewrites, new Holm semantics, cross-repo edits, Issue `#007+`,
  release/publish/deploy actions, credential rotation or secret policy expansion,
  and executing Queue `#002` during mapping.
- Hard stop immediately if: authority evidence conflicts, required behavior needs
  decision beyond `D001-D015`, slice cannot be independently testable, or another
  writer modifies `main` during active row handling.

## Canonical paths uniqueness and dependency integrity check

Proposed canonical paths are unique:

- `koder/plans/002_S01_holm_envelope_semantics/INDEX.md`
- `koder/plans/002_S02_caller_transition_safety/INDEX.md`
- `koder/plans/002_S03_capability_extension_ownership/INDEX.md`
- `koder/plans/002_S04_credential_safe_diagnostics_cache_identity/INDEX.md`
- `koder/plans/002_S05_response_correlation_provenance/INDEX.md`
- `koder/plans/002_S06_integrated_authority_return/INDEX.md`

All dependencies resolve within this set and no future issue is activated.
