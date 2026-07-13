---
plan: 001_S00
issues: [003, 004, 005, 006]
type: plan-review
verdict: approve
reviewer: codex
date: 2026-07-14
reviewed_commit: 3f0cc8ddbc06db321e7d588e2a7c0f731fb34e17
---

# Re-review: A2 Core Queue Accounting Fix

## Summary

I re-reviewed only the Queue `#001` accounting fix at
`3f0cc8ddbc06db321e7d588e2a7c0f731fb34e17`, bounded to the prior P2 and its
regression surface. The fix changes only S00 and Queue `#001`, and the queue
accounting now matches the 16 row estimates.

Verdict: `APPROVE`. Queue `#001` is safe to launch, still bounded by A2's stop
before Issue `#007` for independent core API/conformance review.

## Prior Finding Resolution

Prior P2: Queue effort target did not match the row estimates.

Resolution:

- Queue `#001` frontmatter now declares `queued_effort_target: 28h20m`.
- Queue progress accounting now says nominal queued effort is `28h20m`.
- S00 progress accounting now says nominal queue work is `28h20m`.
- Queue run log records `16 rows sum to 1,700m (28h20m), 3.54x`.

The previous 18-24h mismatch is exactly resolved. No P1/P2 remains.

## Regression Check

The fix commit changed only:

- `koder/plans/001_S00_a2_core_conveyor/INDEX.md`
- `koder/queue/001_a2_core_foundation/INDEX.md`

The diff does not alter slice order, plan references, queued statuses,
estimates, risk/ambiguity/modes, validation commands, stop rules, constraints,
completion contract, A2 boundary, or the Issue `#007` stop.

Queue properties remain intact:

- Exactly 16 queued entries.
- Row estimates total exactly 1,700 minutes, or 28h20m.
- `28h20m / 8h = 3.54x`, satisfying the required `>=2x` packing.
- Local links in S00 and Queue `#001` resolve.
- `git diff --check` passes for the fix commit.

## Verification

Commands and checks run:

```text
git fetch origin
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git diff --stat 133e0a043d88d6d7992a8e06e8cba59054ec2b01..3f0cc8ddbc06db321e7d588e2a7c0f731fb34e17
git diff --name-status 133e0a043d88d6d7992a8e06e8cba59054ec2b01..3f0cc8ddbc06db321e7d588e2a7c0f731fb34e17
git diff --unified=20 133e0a043d88d6d7992a8e06e8cba59054ec2b01..3f0cc8ddbc06db321e7d588e2a7c0f731fb34e17
git diff --check 133e0a043d88d6d7992a8e06e8cba59054ec2b01..3f0cc8ddbc06db321e7d588e2a7c0f731fb34e17
awk queue estimate sum check
python local-link and declaration checks
```

Preflight: clean synchronized `main`;
`HEAD == origin/main == 3f0cc8ddbc06db321e7d588e2a7c0f731fb34e17`.

Mechanical result:

- `rows=16`
- `sum_minutes=1700`
- `declared=28h20m`
- `packing_multiple=3.54`
- `local_links=true`
- `diff_check=true`

I did not run implementation tests, reopen S01-S16, edit plans/queue/state, or
inspect outside the requested re-review surface.

## Verdict

`APPROVE`: 0 P1, 0 P2, 0 P3.

Queue `#001` is safe to launch. It remains bounded to Issues `#003`-`#006`,
must run serially on `main`, requires per-slice review, and must stop before
Issue `#007` even if all A2 entries drain early.

## Next Action

Launch Queue `#001` only under the existing A2 window and preserve the final
A2 review gate before Issue `#007`.
