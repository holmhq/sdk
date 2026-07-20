---
updated_at: "20 Jul 2026 | 11:13 AM IST"
state: IN_PROGRESS
active_window: "W6 — Issue #008 admin/operator preview and conditional 0.2.0 release"
active_issue: "#008"
orchestration_mode: "direct owner-authorized autonomous execution"
stop_gate: "fresh read-only Holm-authority acceptance + final four-mode/release gates before push/tag/GitHub/npm publication"
---

# Koder State

## Past

- W1–W5 delivered and released `@holmhq/sdk@0.1.0`: stable web/BFBB,
  framework-neutral state, runtime adapters, reproducible artifacts, docs, and
  production Sokoban proof.
- Issue `#008` was explicitly activated on 2026-07-20 as the next demand-driven
  capability, with owner authorization to release `0.2.0` only when quality is
  proven.

## Present

- The `0.2.0` candidate adds isolated preview `@holmhq/sdk/admin`, explicit
  `createAdminClient({ runtime, caller })`, operator-gated web/Node transport,
  runtime-neutral uploads/binary handling, and 216 generated methods over 189
  source-pinned Holm route/method contracts (174 keys, 18 exclusions).
- Candidate commit `291fdaf` passed the four-mode CI matrix. Independent Review
  `#062` then found one P1: injected upload services ran before the operator
  caller gate. TDD remediation now preflights `holm.http.admin` before every
  upload side effect; web/Node source tests and generated-dist tests prove a
  non-operator produces zero upload calls.
- The remediated normal CI is green: 230 source tests, 24 dist tests, coverage
  `98.09` statements / `98.95` lines / `98.65` functions / `95.31` branches /
  `100.00` changed-reachable, 267 reproducible dist artifacts, and installed
  package smoke across all entry points. Fresh Review `#063` approves exact
  product target `96485b7`, closing Review `#062` with `P1=0 P2=0 P3=1`; the P3
  is a bounded caller-transition TOCTOU advisory with Holm remaining authority.
- Live read-only Holm authority at `773b00f` has no relevant admin/package drift
  from the committed ledger. Holm has unrelated dirty runtime work and remains
  read-only.

## Future

1. Commit Review `#063` and the reconciled issue/state metadata, then obtain
   fresh read-only Holm-authority acceptance against a named current commit.
2. Rerun the four-mode release/package/audit/dry-run gates from the exact final
   candidate and prepare immutable checksum/release assets.
3. Only with all gates green: push exact reviewed target, create annotated
   `v0.2.0`, publish GitHub release assets/checksums, publish npm `0.2.0`, and
   verify a clean registry install. Otherwise stop without publication.
