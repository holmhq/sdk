---
title: Blind Queue Orchestration Contract
status: active
updated: 2026-07-14
applies_to: [A2, queue-001]
---

# Blind Queue Orchestration Contract

## Hard rule

During a queue run, the primary agent is an **orchestrator, not an
implementer or reviewer**. It routes bounded work to fresh worker sessions and
manages durable process state. It must not absorb implementation context merely
to feel informed.

If a runner cannot dispatch fresh implementation and review workers through
harnex (or an explicitly equivalent isolated harness), Queue `#001` is not
launchable. Stop cleanly and ask for an execution harness; never collapse the
queue into one giant direct-coding session.

## Ownership boundary

The orchestrator owns only:

- queue status, eligibility, dependency order, locks, timebox, and stop rules;
- bounded dispatch briefs and worker lifecycle;
- work-level completion state, compact sidecars, validation status, commit refs,
  review verdicts, blockers, and clean/synchronized Git checks;
- concise queue run-log, issue/slice accounting, and handoff updates.

Fresh workers own:

- source/test/generated-file reads and edits;
- red → green → refactor execution;
- implementation reasoning and full diffs;
- independent code review and finding details;
- targeted fixes and re-review.

The primary may directly edit queue/run-log/handoff metadata. It must not edit
product source, tests, build configuration, generated artifacts, or review
findings during an active queue run.

## Context read budget

The orchestrator may read:

- `koder/STATE.md`, `koder/docs/EXECUTION.md`, and this contract;
- Queue `#001` metadata and its concise run log;
- only the **current row's** plan path, capability/validation/stop summary, when
  needed to construct a brief;
- harnex `status`/`watch` results and compact worker summary sidecars;
- changed-path lists, commit hashes, validation command outcomes, finding
  counts, review verdict summaries, and blockers;
- Git status, branch/upstream state, and concise commit stats.

The orchestrator must not read into its conversation context:

- product source, test implementations, generated bundles, or full diffs;
- full worker transcripts, prompts, reasoning, or routine pane output;
- full implementation reviews or finding prose when a fix worker can consume
  the review artifact directly;
- future plan bodies or all sixteen plans up front;
- long test/build logs when exit status plus a compact failure excerpt/sidecar is
  sufficient.

Pane/log reads are diagnostic exceptions only. Use a bounded tail after harnex
reports a stall, disconnect, or terminal failure; never poll panes for progress.
If the primary feels it must inspect a full diff to judge safety, the entry is
too risky for blind execution: dispatch a reviewer or stop.

## Per-entry dispatch loop

For each eligible queue row:

1. Read queue metadata and identify the current plan path; do not preload later
   plans.
2. Dispatch one fresh implementation worker with a self-contained task file.
   The worker reads the plan/source, runs strict TDD, validates, commits, pushes,
   and writes a compact summary sidecar.
3. Fence on harnex work-level `done`; process/pane state is diagnostic only.
4. Verify only the summary, changed paths, commit, validation outcomes, clean
   status, and synchronization.
5. Dispatch a **fresh independent review worker**. That worker reads the plan,
   implementation diff/source/tests, writes and commits the review, and emits a
   compact verdict summary.
6. The orchestrator consumes only verdict, finding counts, review path, and
   next action. It does not read the review body.
7. On `NEEDS_FIXES`, dispatch a fresh fix worker that reads the review directly,
   then a fresh re-review worker. Do not translate the findings through primary
   context.
8. On `PASS`/`APPROVE`, update queue/issue/run-log metadata and advance one row.
9. Stop completed sessions promptly. Never overlap implementation workers on
   SDK `main`.

Every worker brief must include prior digestion, a numeric read budget, an
output ceiling, an override/block path, exact validation, forbidden actions,
queue/entry metadata, commit/push policy, and a wall-clock cap.

## Compact worker return contract

Each worker writes one machine-readable summary (or equivalent harnex artifact
sidecar) containing only:

```json
{
  "status": "completed|blocked|failed",
  "queue": "001",
  "entry": "SNN",
  "phase": "implement|review|fix|rereview",
  "commit": "<sha-or-null>",
  "changed_paths": ["path"],
  "red_evidence": {"command": "...", "observed": true},
  "validation": [{"command": "...", "exit": 0}],
  "review": {"path": "...", "verdict": "approve", "p1": 0, "p2": 0},
  "clean_synced": true,
  "blocker": null
}
```

Omit fields that do not apply. Do not include code excerpts, full diffs,
transcripts, prompts, secrets, payloads, or long command output. Canonical
plans/reviews remain committed artifacts for workers to read directly.

## Context rollover

- One primary coordinator may route at most **four completed implementation
  entries** before a mandatory durable handoff and fresh coordinator context.
- Rollover earlier at a child-issue boundary when practical or whenever the
  harness reports high context pressure.
- Before rollover: stop workers, update queue/run log and issue evidence, commit
  and push, verify clean synchronization, then run `close`.
- A fresh coordinator resumes via `open`, Queue `#001`, and the first eligible
  row. It does not replay prior worker output.
- If an unattended harness cannot start/resume a fresh coordinator, stopping at
  the rollover boundary is explicitly permitted and safer than context
  accumulation.

## Launch blockers

Do not start or continue Queue `#001` when:

- harnex/equivalent fresh worker isolation is unavailable;
- another implementation worker owns SDK `main`;
- the repo is dirty, ahead/behind unexpectedly, or the current row lacks a
  reviewed plan;
- compact summary and independent review return contracts cannot be enforced;
- the four-entry context rollover is due and no fresh coordinator can resume;
- queue, A2, or owner stop rules would be crossed.

A blocked coordinator records the shortest actionable reason and closes cleanly.
It does not compensate by reading or implementing more.
