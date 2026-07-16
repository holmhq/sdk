---
review: 036
issue: 007
type: focused-code-rereview
verdict: needs_fixes
reviewed_commit: 78e2667743d37e7bd8d51681ec9b98cd7507ea45
prior_review: ../035_issue007_independent_sdk_review/INDEX.md
p1: 0
p2: 1
p3: 0
reviewer: pi/gpt-5.5 via Harnex dispatch w2-independent-rereview
date: 2026-07-16
---

# Focused rereview — Issue 007 P2 remediation

Fresh read-only focused rereview of `78e2667`. Full `npm run ci`, focused probes,
artifact validation, and clean-tree checks passed.

## Confirmed closed

- Prior P2-2: shared-load leases abort/fence when the final waiter leaves while
  preserving an active peer waiter.
- Prior P2-3: built-in dynamic tokens carry a non-secret epoch; unknown
  bearer/header providers without a cache partition bypass cache.
- Prior P2-4: successful app uploads invoke local per-caller runtime cache
  invalidation without a duplicate Holm mutation.

## Remaining P2

**P2-1 — mixed slash/backslash authority bypass.** In browser-default mode with
no explicit `baseUrl`, values such as `/\\evil.example/...` and
`\\/evil.example/...` bypassed the authority detector, while browser URL
resolution treated them as cross-origin. Runtime and upload auth could still be
sent to the resolved hostile origin.

## Disposition

Fixed at `3a164d7`: every browser-default URL is parsed against ambient origin,
all parsed origin changes are rejected before auth resolution, and no-ambient
mixed authority prefixes fail closed. Source regressions cover URL helper,
runtime, and upload service; full `npm run ci` passed at the fix.

A final focused independent zero-P1/P2 confirmation of `3a164d7` is still
required before Issue `#007` can close.

Sidecar proof validated final at
`.harnex/reports/w2-independent-rereview.json`; scratch full report was
`.tmp/w2-independent-rereview-result.md`.

`verdict=needs_fixes p1=0 p2=1 p3=0`
