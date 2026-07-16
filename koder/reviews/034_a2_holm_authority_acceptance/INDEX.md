---
review: 034
title: A2 Holm-authority acceptance (Issue 016 closeout)
date: 2026-07-16
verdict: accepted
p1: 0
p2: 0
p3: 0
reviewer: owner-present direct session (Claude Fable 5), read-only Holm access
sdk_commit: fe7879e985b4b26815ac5463e2c03555ac591b8d
holm_commit: ded755f8033e8abfe7b0efa8c4faa2aaef1072a4
holm_version: 0.184.0
prior_authority_review: ../024_a2_holm_authority_conformance/INDEX.md
scope: A2 acceptance at named current Holm commit + entry-1 P2 remediation confirmation
---

# Review 034: A2 Holm-Authority Acceptance

Fresh read-only Holm-authority review accepting A2 at Holm commit
`ded755f8033e8abfe7b0efa8c4faa2aaef1072a4` (v0.184.0, clean checkout of
`~/Projects/holmhq/holm/master`). SDK reviewed at `fe7879e`. No Holm writes.

## Verdict

**A2 accepted — 0 P1, 0 P2.** All five Review `#024` defect areas remain
remediated against the live authority source, and the authority surface has
not drifted since the reviewed baselines.

## Authority drift check (read-only)

`git diff --name-only bdcc8cc5..ded755f8` (Review `#024` HEAD → current HEAD)
is **empty** for every A2-relevant authority path:

- `internal/api/` (canonical `{data,meta}` / `{error:{code,message,details}}`
  envelopes — verified live in `internal/api/response.go`)
- `cmd/server/app.go` (`/api/cmd` command surface)
- `internal/hosting/` (realtime/ws runtime)
- `packages/holm-sdk/` (also unchanged since baseline `11ceae0d`; existing
  client remains operational untouched)
- `packages/holm-state/`
- `docs/{concepts,reference}/sdk.md`

Holm advanced v0.182.0 → v0.184.0 with no change to the protocol surfaces the
SDK conforms to. SDK fixture pins to `11ceae0d` therefore remain valid.

## Area-by-area confirmation

| # | Area (Review `#024`) | Evidence |
| --- | --- | --- |
| 1 | Envelope conformance (`{data,meta}`/`{error}`/headers/`/api/cmd`) | S01 approved at `da7cd8d`; authority source unchanged; conformance fixtures + gates green at `fe7879e` |
| 2 | Caller isolation / transition fencing | S02 approved at `5d0df5d`; P2-2 residue (unbounded `keyGenerations`) fixed at `9825963` with red-proof and structural zero-residue regression test |
| 3 | Capability ownership (read-only offers) | S03 confirmed clean by integrated rereview `#033` |
| 4 | Secret-safe identity/observability | S04 confirmed clean by `#033` |
| 5 | Correlation/provenance + reproducible artifacts | S05 confirmed clean by `#033`; `check:repro` green; clean-tree `npm run build` now regenerates all owned `dist/` artifacts with zero diff (`fe7879e`) |

## Entry-1 remediation confirmation (stop-gate leg 1)

- Independent entry review (pi/gpt-5.5 high effort, fresh session, own gate
  runs 4/4): `verdict=needs_fixes p1=0 p2=1 p3=0` on `9825963`.
- The single P2 (documented build script left `dist/license-report.json` /
  `dist/size-report.json` deleted from a clean tree) is fixed by `fe7879e`
  (build now chains `check:licenses` + `size`). Acceptance test re-run by this
  reviewer: clean-tree `npm run build` exit 0, `git status --porcelain` empty.
- Cache-fix semantics re-reviewed directly: generations retained only while an
  active load (refcounted), inflight entry, or scheduled refresh can observe
  them; overlapping-load edge cases covered; regression test proves no residue
  for inactive keys (red-proof exit 1 against base).
- All four CI gate modes green at `fe7879e` (normal, FORCE_COLOR, TAP,
  TAP+color), run by this reviewer. **0 outstanding P1/P2.**

`fe7879e`'s `package.json` touch exceeded the queue row's declared scope; the
owner directed direct resolution and this review accepts the change as the
correct minimal fix. No dependency, privacy, or publication field changed.

## Standing constraints verified

- `package.json` `"private": true` intact; no publish/tag/release/deploy.
- Holm checkout untouched (read-only; clean before and after).
- Existing Holm `packages/holm-sdk` / `packages/holm-state` unchanged and
  operational.

## Advisories

The 9 P3 advisories logged by `#033` remain open and non-blocking; carry them
as backlog input, not A2 conditions.
