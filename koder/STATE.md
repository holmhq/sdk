---
updated_at: "20 Jul 2026 | 10:43 AM IST"
state: IN_PROGRESS
active_window: "W6 — Issue #008 admin/operator preview and conditional 0.2.0 release"
active_issue: "#008"
orchestration_mode: "direct owner-authorized autonomous execution"
stop_gate: "independent SDK review + fresh read-only Holm-authority acceptance + final release gates before push/tag/GitHub/npm publication"
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
- Normal, FORCE_COLOR, TAP, and TAP+color full CI are green. Latest measured
  coverage is at least `98.14` statements, `98.99` lines, `98.65` functions,
  `95.32` branches, and `100.00` changed-reachable; 267 dist artifacts reproduce
  and installed-package smoke imports all entry points.
- Live read-only Holm authority at `773b00f` has no relevant admin/package drift
  from the committed ledger. Holm has unrelated dirty runtime work and remains
  read-only.

## Future

1. Commit the complete product/generated/docs candidate and run one fresh
   independent SDK review; remediate every accepted finding.
2. Obtain fresh read-only Holm-authority acceptance against a named current
   commit and rerun the final release/package/audit/dry-run gates.
3. Only with all gates green: push exact reviewed target, create annotated
   `v0.2.0`, publish GitHub release assets/checksums, publish npm `0.2.0`, and
   verify a clean registry install. Otherwise stop without publication.
