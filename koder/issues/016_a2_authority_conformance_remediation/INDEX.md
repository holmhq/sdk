---
status: blocked
priority: P1
created: 2026-07-14
updated: 2026-07-14
tags: a2, authority, conformance, security, transport, caller, capabilities
parent: 001
depends_on: [004, 005, 006]
type: bug
issue_kind: track
slice_count: 6
slices_done: 2
source_review: ../../reviews/024_a2_holm_authority_conformance/INDEX.md
context: Holm's authority review found four P1 and one P2 foundation defects that block A2 acceptance and all formal A3 work.
---

# Issue 016: A2 Authority and Conformance Remediation

## Problem

SDK-side implementation and review completed A2, but the read-only Holm
authority review at Review `#024` found protocol and security contradictions in
the foundation:

- the transport layer does not decode Holm's canonical response envelopes;
- caller partitions do not survive browser-session/token transitions safely,
  and mutations do not react to caller changes;
- public and extension code can replace runtime capability offers, while
  extensions lack the narrow core invocation seam they need;
- credentials can enter diagnostics and cache keys;
- adapter response IDs are not correlated with requests.

These are implementation/conformance gaps under approved decisions
`D003`-`D006`, `D008`, `D011`, and `D015`; they do not authorize reopening A3 or
inventing new Holm server semantics.

## Authority baseline

- SDK checkpoint: `fe37f8528eeca38007f575307e7f3e26f642b615`
- Holm baseline used by A2: `11ceae0d88e9c800eb77916e3244fbd231ad81bb`
- Holm HEAD reviewed by authority: `bdcc8cc51eccef9d9f195a2d35d5db1af39b1655`
- Material authority drift between those Holm commits: none
- Governing finding set:
  [`Review #024`](../../reviews/024_a2_holm_authority_conformance/INDEX.md)

Review `#023` remains historical SDK-side evidence. Review `#024` governs A2
owner acceptance.

## Blocker and authorization

This issue is filed but no remediation implementation window is active. The
owner must explicitly authorize a bounded A2R planning window in
`koder/docs/EXECUTION.md` and `koder/STATE.md`.

After planning, implementation remains blocked until thin strict-TDD slices and
a new blind Queue `#002` are independently reviewed. Queue `#001` stays done and
historical. Issue `#007` must not start.

## Required direction

### 1. Holm transport protocol conformance

Create source-pinned fixtures for canonical `{data,meta}` success and
`{error:{code,message,details}}` failure envelopes. Preserve relevant response
headers and explicitly model the `/api/cmd` HTTP-200 command envelope. Expand
the Issue `#005` migration ledger to distinguish adopted behavior from intended
redesign and deferral.

### 2. Caller partition lifecycle

Restore a provider-owned, deterministic, non-secret partition fingerprint or
epoch. Caller changes must synchronously fence old data across transport cache,
queries, mutations, and in-flight work. Cover browser sessions, explicit tokens,
operators, agents, app changes, and future scope changes without moving server
authorization into the SDK.

### 3. Capability and extension control plane

Expose a read-only capability view publicly. Keep runtime offer replacement
private to core/runtime ownership, constrain extension-local offers to
`sdk.*`, and provide extensions a narrow lifecycle/cancellation/caller-aware
invocation function. No client or extension may manufacture a `holm.*` offer.

### 4. Secret-safe diagnostics and cache identity

Represent auth/query/path sensitivity structurally. Redact exact proof headers
and sensitive URL components; keep raw credentials out of cache keys,
diagnostics, snapshots, serialized errors, and observational hooks. Preserve
deterministic partitioning without using a credential as identity material.

### 5. Correlation, provenance, and final authority return

Validate response/request ID correlation and diagnose duplicate/late mailbox
responses. Reconcile generated artifact source provenance with the approved
contract, run the complete source/type/declaration/dist/repro/license/size gate,
obtain independent SDK re-review, and return to Holm authority at current HEAD.

## Slice Ledger

| Slice | Status | Finding | Expected proof | Closure gate |
| --- | --- | --- | --- | --- |
| Holm envelope/error/meta/header conformance and migration ledger | done | `P1-1` | implementation `a15b3df`, fix `da7cd8d`, rereview approve (`P1/P2/P3=0/0/0`) | complete |
| Caller epoch, cache/query/mutation reset, and late-result fencing | done | `P1-2` | implementation `5d0df5d`, review approve (`P1/P2/P3=0/0/0`) | complete |
| Read-only capabilities and narrow extension invocation | blocked at Queue #002 S03 | `P1-3` | fix `5596d0b` + rereview `4ed5d64` (`P1/P2/P3=0/1/0`) | canonical findings in `koder/reviews/030_a2r_s03_capability_extension_ownership_rereview_2/INDEX.md`; max two fix cycles exhausted |
| Structural credential redaction and opaque cache identity | candidate | `P1-4` | arbitrary-header/query/path secret tests | no proof appears in public observability surfaces |
| Response correlation, artifact provenance, and final review | candidate | `P2-1` + note | mismatch tests + full clean validation + two reviews | SDK and Holm authority approve A2 |

## Queue #002 implementation checkpoint

- 2026-07-15 02:35 IST: S03 fix attempt `05b` landed at `5596d0b`
  with required validation exits `0`; fresh Pi rereview returned `needs_fixes`
  (`P1/P2/P3=0/1/0`) at review commit `4ed5d64`, canonical findings
  `koder/reviews/030_a2r_s03_capability_extension_ownership_rereview_2/INDEX.md`.
  S03 exhausted the max two fix cycles, so Queue `#002` is blocked at S03.
- 2026-07-15 02:10 IST: S03 fix attempt `05a` landed at `4c2bff3`
  with required validation exits `0`; fresh Pi rereview returned `needs_fixes`
  (`P1/P2/P3=0/1/0`) at review commit `2a06c0e`, canonical findings
  `koder/reviews/029_a2r_s03_capability_extension_ownership_rereview/INDEX.md`.
  Coordinator `05` is opening S03 fix cycle `2` without ingesting findings.
- 2026-07-15 01:45 IST: S03 implementation attempt `05a` landed at `206b0e8`
  with required validation exits `0`; fresh Pi review returned `needs_fixes`
  (`P1/P2/P3=0/2/0`) at review commit `fe604d0`, canonical findings
  `koder/reviews/028_a2r_s03_capability_extension_ownership/INDEX.md`.
  Coordinator `05` is opening S03 fix attempt `05a` without ingesting findings.
- 2026-07-15 01:14 IST: S02 implementation attempt `05a` landed at `5d0df5d`
  with required validation exits `0`; fresh Pi review approved
  (`P1/P2/P3=0/0/0`) with no canonical finding artifact. S02 is done;
  coordinator `05` is opening S03 implementation.
- 2026-07-15 00:50 IST: S01 fix attempt `05b` landed at `da7cd8d` with
  required validation exits `0`; fresh Pi rereview approved (`P1/P2/P3=0/0/0`)
  with no canonical finding artifact. S01 is done; coordinator `05` is opening
  S02 implementation.
- 2026-07-15 00:23 IST: Recovery coordinator `05` resumed first unproven
  phase S01 `fix` after adapter/config change to Claude (`sonnet`) via Harnex;
  no phase-only commit.
- 2026-07-15 00:16 IST: Recovery coordinator `04` attempted S01 `fix` routing
  twice through writable Codex legacy PTY with `--timeout 30`. Attempt `04`
  stopped at a CLI trust-prompt boot, and attempt `04b` disconnected before task
  receipt despite hook-trust bypass/YOLO mode; neither wrote a report, commit,
  or product WIP. The S01 `fix` phase circuit breaker remains open.
- 2026-07-14 23:49 IST: Recovery coordinator `03` attempted reconfigured S01
  `fix` routing through writable Codex legacy PTY twice. Both launches failed
  to register with Harnex before worker ownership began; no session, receipt,
  commit, or product WIP exists. The reconfigured phase circuit breaker is open.
- 2026-07-14 23:46 IST: Recovery coordinator `03` resumed at first unproven
  phase S01 `fix` after changing worker adapter/config/brief to writable Codex
  legacy PTY. No phase-only metadata commit was created.
- 2026-07-14 23:24 IST: S01 reached implementation commit `a15b3df`
  with row validation passing, then independent review commit `aa56435` returned
  `needs_fixes` (`P1/P2/P3=1/0/0`) at
  `koder/reviews/027_a2r_s01_envelope_implementation/INDEX.md`. The coordinator
  did not ingest finding prose. Two subsequent fix phase attempts produced no
  receipt and no commit due model/transport refusal, opening the phase circuit
  breaker. Next phase is S01 `fix` after adapter/config/brief change.

## Acceptance Criteria

- [ ] Review `#024` P1-1 through P1-4 and P2-1 are each mapped to reviewed,
      queueable strict-TDD plans.
- [ ] Every implementation slice preserves red -> green -> refactor evidence and
      receives independent implementation review before the next dependent
      slice.
- [ ] Actual Holm success, metadata, error, and `/api/cmd` exception fixtures are
      source-pinned and pass against source plus generated artifacts.
- [ ] Browser-session, token, operator, agent, app, and scope-transition tests
      prove old cache/resource data and late results cannot cross callers.
- [ ] Public consumers and extensions cannot replace or fabricate `holm.*`
      offers; extensions can invoke only through the narrow core seam.
- [ ] Credentials are absent from public envelopes, snapshots, diagnostics,
      serialized errors, cache keys, and observational hooks.
- [ ] Mismatched response IDs fail as protocol errors; late/duplicate mailbox
      behavior is explicit and tested.
- [ ] Issue `#005` migration evidence and generated artifact provenance satisfy
      the approved architecture contract.
- [ ] `npm run ci`, coverage, core typecheck, source/types/declarations/dist,
      reproducibility, license, and size checks all pass from a clean checkout.
- [ ] A fresh independent SDK review approves the remediation with no P1/P2
      findings.
- [ ] A fresh Holm authority review accepts A2 at a named current Holm commit.
- [ ] Queue `#001` remains historical, npm remains private, and no Issue `#007+`
      implementation begins under this issue.

## Owner decision carried into later A3 planning

Issue `#016` does not decide whether `app.auth.me()` remains an app-owned
`/api/me` convention, becomes a Holm platform route, or is deferred. Record that
decision during eventual Issue `#007` planning after A2 is accepted.

## Non-Goals

- Implementing or planning Issues `#007`-`#015`.
- Adding Holm action discovery, private realtime, presence, app scopes,
  collaboration, desktop, or mobile capabilities.
- Editing Holm, deleting its current SDK/state packages, or inventing a second
  server protocol.
- Publishing npm, tagging, releasing, deploying, using credentials, or creating
  cloud resources.
- Reopening approved architecture decisions unless a remediation worker proves
  an actual contradiction and stops for owner review.
