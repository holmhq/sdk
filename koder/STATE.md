---
updated_at: "20 Jul 2026 | 11:32 AM IST"
state: BLOCKED
active_window: "W6 — Issue #008 admin/operator preview and conditional 0.2.0 release"
active_issue: "#008"
orchestration_mode: "direct owner-authorized autonomous execution"
stop_gate: "owner restores npm authentication (`npm whoami` succeeds); then exact-target publish/tag/GitHub verification and clean close"
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
- Fresh Holm-authority Review `#064` accepts candidate `189eaa6` against Holm
  `9a02784`, `P1=0 P2=0 P3=1`; its P3 is an unrelated stale generated Holm
  inventory document, while all admin route authority checks pass.
- Exact-target normal release check plus FORCE_COLOR/TAP/TAP+color CI pass with
  identical metrics. Dry-run publication, audit, reproducibility, package smoke,
  and a fresh 11-entry-point tarball install pass. Release assets/checksums are
  recorded in `koder/evidence/005_v020_release_candidate/INDEX.md`.
- Real release is externally blocked: `npm whoami` returns `E401 Unauthorized`.
  `0.2.0` is absent from npm; no tag, GitHub release, or real publish occurred,
  avoiding a partial release.

## Future

1. Owner authenticates npm (for example `npm login --auth-type=web`) and confirms
   `npm whoami` succeeds; do not paste credentials into chat or repo files.
2. Resume exact-target release: verify version/tag absence, publish npm `0.2.0`,
   compare registry shasum to `6fb216c...`, create annotated `v0.2.0` and GitHub
   release assets, then run a clean registry-consumer import of all entry points.
3. Commit/push final release state and close only when Git is clean and synced.
