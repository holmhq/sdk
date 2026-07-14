---
title: SDK Autonomous Execution Windows
updated: 2026-07-14
active_window: A2R-planning
active_issue: 016
orchestration_mode: blind
requires_review_after: true
---

# Autonomous Execution Windows

This document grants bounded autonomy without silently crossing product-design
or authority checkpoints. `koder/STATE.md` names the current checkpoint. No
future window is active unless the owner records that decision here and in
`koder/STATE.md`.

## Completed window — A1: architecture decision package

- **Result:** approved at SDK commit `0d443cf`.
- **Issue:** [`#002`](../issues/002_architecture_contract/INDEX.md).
- **Review:** [`01_codex.md`](../reviews/001_architecture_contract/01_codex.md)
  plus [`02_owner.md`](../reviews/001_architecture_contract/02_owner.md).
- **Decision:** `D001`-`D015` approved; `/state` is canonical and is not a
  legacy compatibility alias.

## Blocked checkpoint — A2: core foundation authority return

- **Implementation result:** Queue `#001` completed Issues `#003`-`#006` at SDK
  checkpoint `fe37f85`.
- **SDK-side review:** Review `#023` approved the implementation checkpoint.
- **Authority result:**
  [`Review #024`](../reviews/024_a2_holm_authority_conformance/INDEX.md) returned
  **BLOCK** with four P1 and one P2 findings.
- **Remediation track:**
  [`Issue #016`](../issues/016_a2_authority_conformance_remediation/INDEX.md).
- **Current autonomy:** none. A2R planning completed at Review `#026`; both the
  planning grant and prior A2 implementation grant are exhausted.
- **A2 acceptance stop gate:** independent SDK re-review and fresh
  Holm-authority acceptance; do not begin Issue `#007`.

### Authority facts

- SDK reviewed: `fe37f8528eeca38007f575307e7f3e26f642b615`.
- Holm baseline: `11ceae0d88e9c800eb77916e3244fbd231ad81bb`.
- Holm HEAD reviewed: `bdcc8cc51eccef9d9f195a2d35d5db1af39b1655`.
- Material Holm drift affecting A2/A3 assumptions: none.
- Blocking seams: Holm response envelopes, caller partition lifecycle,
  capability/extension ownership, credential-safe observability/cache identity,
  and response correlation.

### Required reading for the next coordinator

1. `koder/STATE.md`
2. `koder/docs/BLIND_ORCHESTRATION.md`
3. `koder/reviews/024_a2_holm_authority_conformance/INDEX.md`
4. `koder/issues/016_a2_authority_conformance_remediation/INDEX.md`
5. `koder/docs/{ARCHITECTURE,DECISIONS,HOLM_SOURCE_MAP}.md`

Do not preload product source, tests, prior worker transcripts, Queue `#001`
plans, or future Issue `#007+` bodies in the primary coordinator context.

### Allowed while blocked

- Review the approved Plan family `002`, Review `#026`, and ready-but-not-
  authorized Queue `#002`; ask the owner for a separate implementation grant.
- Perform observational Git/process checks.
- Preserve or clarify the authority handoff without changing product contracts.

### Forbidden while blocked

- No implementation, dependency installation, generated artifact rebuild, or
  Queue `#002` launch.
- No Issue `#007+` planning or implementation.
- No npm publication, package release, Git tag, deploy, cloud spend,
  credentials, or registry setup.
- No edit to Holm, Sobek, CDN, or another repository.
- No deletion, redirect, alias, or deprecation of Holm's existing SDK/state
  packages.
- No claim that action discovery, app scope, private realtime, presence,
  collaboration, desktop, or mobile capability ships.

## Completed window — A2R-P: authority conformance remediation planning

The owner authorized **planning only** on 14 Jul 2026. The window is complete;
A2R implementation is not authorized.

### Result

1. Plan family `002` maps Issue `#016` into six thin strict-TDD slices.
2. Review `#025` requested fixes; commit `68684ad` resolved them.
3. Independent Review `#026` approved the fixed plans and Queue `#002` with
   P1/P2/P3 all zero.
4. Commit `85271ba` marked Queue `#002` ready while preserving
   `execution_authorized: false`, serial `main`, blind routing, and the separate
   owner launch gate.

### A2R-P return gate

Reached. The clean checkpoint is `REVIEW_READY` and control has returned for
separate owner authorization. Do not launch Queue `#002` and do not begin Issue
`#007`.

## Future window — A2R implementation

A2R implementation remains **not authorized**.

### Entry gate

1. Thin strict-TDD plans and Queue `#002` exist and have independent plan
   approval. **Satisfied by Review `#026`.**
2. The owner separately authorizes blind implementation routing in this file and
   `koder/STATE.md`. **Pending.**

### Required outcomes

1. Holm envelope/error/meta/header conformance and expanded migration evidence.
2. Caller epoch plus cache/query/mutation transition safety.
3. Read-only capability view plus narrow extension invocation.
4. Structural credential redaction plus opaque cache identity.
5. Response correlation, artifact provenance, complete validation, independent
   SDK review, and Holm-authority return.

### Execution rules when authorized

- Strict red -> green -> refactor is mandatory for every code change.
- Planning is complete. Do not launch more mapping, plan, plan-review, or
  metadata-finalizer workers; the coordinator owns queue/run-log/Issue/STATE
  transitions directly.
- Queue `#002` is blind-strict because it changes protocol, caller/auth,
  capability ownership, credential handling, and response correlation. The
  primary routes fresh implementation/review/fix workers without ingesting
  implementation detail.
- For owner-present execution, the interactive primary is the bounded
  coordinator; add no governor layer unless unattended relaunch is explicitly
  required. Roll over after at most three completed implementation rows.
- Work remains serial on `main`; no overlapping implementation ownership.
- Use short first monitor fences (`10m` review, `20m` implementation), then
  reconcile canonical artifact, Git, semantic report, and process facts before
  extension. Two no-op/boot/permission attempts for one phase block retries
  until the adapter/config/brief changes.
- Queue estimates are caps, not time to consume deliberately. Report product,
  quality, and process-only deltas separately.
- Harnex terminal telemetry plus live Git own commit/path/clean-state evidence;
  workers must not invent expanded SHAs in summary prose.
- Queue `#001` stays done and historical. Stop immediately if a finding requires
  changing `D001`-`D015`, inventing Holm semantics, or editing another repo.
- Commit and push logical green checkpoints; keep reports compact and
  secret-free.

### A2R stop gate

Return after all Issue `#016` slices pass, the complete validation suite is
green, an independent SDK review has no P1/P2 findings, and a fresh Holm
read-only authority review accepts A2. Never roll directly into A3.

## Later windows — not authorized

| Window | Scope | Entry gate | Stop gate |
| --- | --- | --- | --- |
| A3 | Issues `#007`-`#010`: app/admin migration and surface/action adapters | A2R accepted by SDK and Holm authority | migration/API review |
| A4 | Issues `#011`-`#013`: realtime, collaboration seam, frameworks | A3 approved + relevant Holm capability truth refreshed | extension/framework review |
| A5 | Issues `#014`-`#015`: BFBB artifacts, docs, closeout | A4 approved | release-readiness decision; npm still blocked |

These rows are planning boundaries, not permission to execute. Activate one only
through an explicit reviewed state transition in this file and
`koder/STATE.md`.
