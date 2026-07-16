---
review: 046
title: Issue 009 integrated SDK review
status: approved
issue: 009
queue: 004
session: q004-c03-final-review-a03
reviewer: pi/gpt-5.5
created: 2026-07-17
updated: 2026-07-17
reviewed_commit: f06d1c0ef8fd1fd2e1225ab4c60759d58a7a9c22
reviewed_range: a865ce78586d97b8d033421d420df215a92241db..f06d1c0ef8fd1fd2e1225ab4c60759d58a7a9c22
verdict: approved
p1: 0
p2: 0
p3: 0
---

# Review 046: Issue 009 Integrated SDK Review

## Verdict

Approved. Findings: `P1=0`, `P2=0`, `P3=0`.

Reviewed SDK product range
`a865ce78586d97b8d033421d420df215a92241db..f06d1c0ef8fd1fd2e1225ab4c60759d58a7a9c22`
at product commit `f06d1c0ef8fd1fd2e1225ab4c60759d58a7a9c22`.

Scope reviewed: runtime-neutral root/core, web/node/test/Sobek/bridge subpaths,
caller propagation, validation, response/stable-error behavior, copied/frozen
wire boundaries, request correlation, injected-runtime behavior, package exports,
declarations, tracked `dist/`, manifests, examples, size/license gates, reserved
bridge mocks, and Issue `#009` boundary.

## Validation

| Command | Exit | Result |
| --- | ---: | --- |
| `npm run ci` | 0 | Green; final comparison run metrics below. |
| `FORCE_COLOR=1 npm run ci` | 0 | Green; metrics matched final comparison set. |
| `NODE_OPTIONS='--test-reporter=tap' npm run ci` | 0 | Green; metrics matched final comparison set. |
| `FORCE_COLOR=1 NODE_OPTIONS='--test-reporter=tap' npm run ci` | 0 | Green; metrics matched final comparison set. |
| `npm run check:repro` | 0 | Reproducibility check passed for 227 dist artifacts. |
| `npm run test:declarations` | 0 | Declaration consumers typechecked. |
| `npm run test:dist` | 0 | Generated ESM smoke passed, including runtime subpaths. |
| `npm run build` | 0 | Regenerated tracked artifacts successfully. |
| `git diff --exit-code --stat` after build | 0 | No product diff remained after generation. |
| `npm run size` | 0 | Size check passed: 225933 raw / 165824 minified / 48830 gzip bytes. |
| `git status --short --untracked-files=all` | 0 | Clean before writing this review artifact. |

A prior normal `npm run ci` also exited `0`; its coverage branch metric was
`95.47` before the final comparison rerun. The final four-mode comparison set is
below and matched exactly.

## Coverage equality

Final comparison metrics from `coverage/coverage-summary.json`:

| Mode | Statements | Lines | Functions | Branches | changed_reachable |
| --- | ---: | ---: | ---: | ---: | ---: |
| normal | 98.01 | 98.90 | 98.58 | 95.50 | 100.00 |
| `FORCE_COLOR=1` | 98.01 | 98.90 | 98.58 | 95.50 | 100.00 |
| TAP | 98.01 | 98.90 | 98.58 | 95.50 | 100.00 |
| TAP + color | 98.01 | 98.90 | 98.58 | 95.50 | 100.00 |

Coverage equality gate: passed.

## Package, generator, and reproducibility status

- `package.json` stays private and exports isolated `./web`, `./node`,
  `./sobek`, `./test`, and `./bridge` subpaths without making root import pull
  concrete runtimes.
- Declaration and dist smoke cover package consumers, generated ESM, and runtime
  subpath isolation.
- `npm run check:licenses` passed inside CI/build/size flows for 66 locked
  packages.
- `npm run test:examples` passed inside CI, including raw BFBB import, Vite
  production build, and reserved/unsupported bridge labels.
- Tracked generated JavaScript, declarations, maps, `dist/manifest.json`, and
  `dist/size-report.json` were reproducible after `npm run build`.

## Holm compatibility note

Read-only Holm authority was checked from SDK side against live Holm Issue
`#534` at `/home/glasscube/Projects/holmhq/holm/master` commit
`2f7eb0d074b4feb6d40d81a23022f8104fdb46ea`. The Holm worktree had unrelated
pre-existing dirty paths and was not modified.

Compatibility assessment: SDK Issue `#009` remains aligned with Holm `#534` by
preserving GET/POST as the canonical app wire, keeping `OperationRequest` as an
internal SDK adapter envelope, preserving caller-authoritative contexts for web,
CLI/operator, and Sobek/server surfaces, mapping stable error/response semantics,
copying/freeze-checking serializable boundaries, avoiding direct SQLite or Holm
server implementation, and keeping desktop/mobile bridge support reserved to
mock/mailbox contracts only.

## Findings

None.
