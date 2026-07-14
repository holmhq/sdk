---
title: SDK Blind Queue Orchestration Contract
status: active
updated: 2026-07-14
applies_to: [queue-001-history, queue-002-when-authorized]
---

# SDK Blind Queue Orchestration Contract

## Applicability

A queue does not imply blind mode, and Harnex does not imply a worker chain.
Use the koder-pattern delivery-first mode gate before adding orchestration.

Direct owner-present work is the default for:

- planning, docs, artifact review, and research;
- queue/frontmatter/run-log/Issue/STATE metadata;
- one bounded capability when repo policy does not require isolation.

Do not dispatch planning or metadata-finalizer workers. Before planning-only or
blind authorization, disclose whether product code changes, expected workers,
artifact count, wall budget, and stop gate. Planning stops after two dispatches
or 30 minutes without explicit re-authorization.

Queue `#001` is complete and historical. Queue `#002`, if separately authorized,
is **blind-strict** because its rows change Holm protocol handling, caller/auth
transitions, capability ownership, credential safety, and response correlation.
Its independent per-row review remains risk-justified.

## Hard rule during an authorized blind run

The primary is a blind bounded coordinator, not an implementer or reviewer. It
routes fresh implementation, review, fix, and re-review workers and manages
process state without absorbing product implementation context.

For owner-present Queue `#002` work, the interactive primary is the coordinator.
Do not add a governor layer unless unattended relaunch is explicitly required.
If Harnex or an explicitly equivalent isolated harness cannot enforce the
queue's declared implementation/review boundaries, stop rather than weakening
the mode.

## Ownership

The coordinator owns:

- authorization, eligibility, dependencies, locks, caps, and stop rules;
- bounded worker briefs and lifecycle;
- compact semantic reports, Harnex terminal telemetry, validation exits,
  canonical review verdict/counts/path, blockers, and Git checks;
- queue/run-log/Issue/STATE metadata directly.

Fresh workers own:

- source/test/generated-file reads and edits;
- strict red -> green -> refactor execution;
- implementation reasoning and full diffs;
- independent review findings;
- finding-scoped fixes and re-review.

The coordinator must not edit product source, tests, build configuration,
generated artifacts, or review findings during a blind run.

## Context firewall

The coordinator may read:

- `koder/STATE.md`, `koder/docs/EXECUTION.md`, this contract, Queue `#002`, and
  its concise run log;
- only the current row's plan path and capability/validation/stop summary;
- compact semantic artifact reports and normalized review frontmatter;
- changed-path lists, command exits, canonical refs, blockers, and Git state;
- bounded diagnostic tails only after a stall, disconnect, malformed proof, or
  terminal disagreement.

It must not ingest product source, test bodies, generated bundles, full diffs,
review finding prose, future plan bodies, worker reasoning/transcripts, routine
panes, or long logs.

## Queue 002 strict loop

For each eligible row:

1. Verify authorization, clean/synced `main`, row dependency, worker ownership,
   and exact validation.
2. Dispatch one fresh implementation worker. The worker reads the canonical
   plan/source, demonstrates red evidence, implements/refactors, validates,
   commits/pushes, and writes a compact semantic artifact report.
3. Fence on work completion and verify the canonical commit/artifact, changed
   paths, validation exits, and Git state without reading the diff.
4. Dispatch one fresh independent reviewer over the row.
5. Consume only review path, normalized verdict/counts, validation, blocker, and
   Git evidence.
6. On `needs_fixes`, dispatch a fresh fixer that reads the review directly,
   followed by a fresh re-reviewer. Never relay finding prose through the
   coordinator.
7. On approval, update queue/run-log/Issue metadata directly and advance.
8. Stop completed sessions promptly; never overlap SDK implementation workers
   on `main`.

S06 remains the separate integrated validation/SDK review/Holm authority return
gate. Never continue into Issue `#007`.

## Process budget and circuit breaker

- Queue row estimates are caps, not time to consume deliberately. Finish early
  when acceptance is proven.
- Use a short first monitor fence: normally <=10 minutes for review and <=20
  minutes for implementation. On timeout, reconcile bounded process, canonical
  artifact, Git, and report facts before one extension.
- One acknowledgment/progress-only completion may receive one continuation. A
  second is a failed attempt.
- Two no-op, boot, registration, permission, or receipt-free attempts for one
  phase open the circuit breaker. Change adapter/config/brief or stop.
- Do not wait the full wall cap when the canonical artifact and verified clean
  commit already exist.
- Report product delta, quality delta, and process-only delta separately.

## Proof contract

Prefer Harnex native proof:

- `harnex.artifact_report.v1` carries semantic status, canonical refs,
  validation commands/exits, typed gate/review/blocker summaries, and confidence;
- normalized review frontmatter carries verdict and P1/P2/P3 counts;
- Harnex terminal telemetry plus live Git carry observed commit identity,
  changed paths, and clean/sync state.

Workers must not invent or expand commit SHAs in prose. If a report includes a
ref, obtain it with `git rev-parse HEAD`; the coordinator independently verifies
it. A malformed report does not erase a valid commit—reconcile once from the
first unproven phase rather than replaying valid work.

Proof order is: canonical artifact -> validation -> commit/push -> Git check ->
atomic report -> work-complete signal.

## Context rollover

Queue `#002` declares a coordinator cap of three completed implementation rows.
Roll over earlier after complex fix loops, at a natural boundary, near a
deadline, or under context pressure.

Before rollover: stop children, update metadata directly, commit/push, verify
clean synchronization, and run `close`. A fresh coordinator resumes from
canonical state and the first unproven phase without replaying prior output.

## Launch blockers

Do not start or continue Queue `#002` when:

- `execution_authorized` is not explicitly true in Queue `#002`, `EXECUTION.md`,
  and `STATE.md`;
- fresh implementation/review isolation is unavailable;
- another writer owns `main`, or Git is unexpectedly dirty/ahead/behind;
- the current row lacks its approved plan, exact validation, wall cap, or stop;
- semantic artifact reports, normalized review verdicts, or Git verification
  cannot be enforced;
- the circuit breaker, coordinator cap, owner gate, or A2 stop rule is reached.

Record the shortest actionable blocker and stop. Do not compensate by adding
more planning artifacts or reading implementation detail.
