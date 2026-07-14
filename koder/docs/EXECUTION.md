---
title: SDK Autonomous Execution Windows
updated: 2026-07-14
active_window: A2
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
- **Current autonomy:** none. The prior A2 implementation grant is exhausted.
- **Stop gate:** independent SDK re-review and fresh Holm-authority acceptance;
  do not begin Issue `#007`.

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

- Read this checkpoint and ask the owner to authorize a bounded A2R planning
  window.
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

## Future window — A2R: authority conformance remediation

A2R is defined but **not authorized**.

### Entry gate

1. Owner explicitly authorizes A2R planning in this file and `koder/STATE.md`.
2. Fresh isolated planning workers map Issue `#016` into thin strict-TDD slices.
3. Independent plan review approves those slices and a new Queue `#002`.
4. Only then may the owner authorize blind implementation routing.

### Required outcomes

1. Holm envelope/error/meta/header conformance and expanded migration evidence.
2. Caller epoch plus cache/query/mutation transition safety.
3. Read-only capability view plus narrow extension invocation.
4. Structural credential redaction plus opaque cache identity.
5. Response correlation, artifact provenance, complete validation, independent
   SDK review, and Holm-authority return.

### Execution rules when authorized

- Strict red -> green -> refactor is mandatory for every code change.
- The primary remains a blind orchestrator and routes fresh implementation,
  review, fix, and re-review workers through harnex or an equivalent isolated
  harness.
- Work remains serial on `main`; no overlapping implementation ownership.
- Queue `#001` stays done and historical. A2R uses a separately reviewed Queue
  `#002`.
- Stop immediately if a finding requires changing approved decisions
  `D001`-`D015`, inventing Holm semantics, or editing another repository.
- Commit and push logical green checkpoints; keep sidecars compact and
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
