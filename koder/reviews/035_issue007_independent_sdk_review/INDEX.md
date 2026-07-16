---
review: 035
issue: 007
type: independent-code-review
verdict: needs_fixes
reviewed_commit: 30f6f5fc764e38ac999ff4a0f98b9e0666e2c037
p1: 0
p2: 4
p3: 0
reviewer: pi/gpt-5.5 via Harnex dispatch w2-independent-review
date: 2026-07-16
---

# Independent SDK review — Issue 007 web/app client

Fresh read-only review of W2 implementation `30f6f5f`; the reviewer authored
none of the reviewed commits. Required `npm run ci`, diff check, generated-ESM
probes, and clean-tree checks ran successfully. The implementation gate remained
blocked by four reproduced P2 defects.

## Findings

1. **P2-1 — cross-origin auth proof:** absolute web/app or upload URLs could
   carry bearer/header auth to an arbitrary origin.
2. **P2-2 — cancelled cache fill:** a cancelled final GET waiter did not abort
   or generation-fence the shared loader, allowing a late result to enter cache.
3. **P2-3 — auth/cache identity:** dynamic token changes were absent from cache
   identity, so a new token could receive an old-token cached response.
4. **P2-4 — upload invalidation:** upload/link-import mutations bypassed runtime
   cache invalidation, leaving cached link reads stale.

## Disposition

All four received strict red regressions and remediation in `78e2667`:
same-origin URL enforcement, shared-load leases, non-secret auth epochs with
fail-safe cache bypass, and local per-caller upload invalidation. Focused
rereview is recorded in Review `#036`.

Sidecar proof validated final at
`.harnex/reports/w2-independent-review.json`; scratch full report was
`.tmp/w2-independent-review-result.md`.

`verdict=needs_fixes p1=0 p2=4 p3=0`
