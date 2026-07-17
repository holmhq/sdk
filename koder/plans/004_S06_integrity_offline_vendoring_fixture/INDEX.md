---
title: W4 S06 - Integrity, offline vendoring, and compatibility fixture
status: implemented
issue: 017
plan: 004
slice: S06
type: implementation
queue_candidate: 005
owner: sdk-rc
created: 2026-07-17
updated: 2026-07-17
---

# Plan 004 S06: Integrity, offline vendoring, and compatibility fixture

## User decisions captured

- BFBB consumers vendor immutable commit-pinned ESM; deployed apps must not use
  mutable `@main` URLs or require a runtime CDN.
- Raw vendored BFBB has no Node runtime dependency. Node `>=20` is only the
  package build/tooling floor.
- Real browser/app soak is a post-queue pilot gate and cannot be claimed by this
  slice.
- This slice completes Issue `#014`'s integrity/offline fixture side after S05's
  deterministic artifacts.

## Capability statement

Prove v0.1-web artifacts can be hash-verified, tamper-detected, vendored, and
used offline in raw BFBB and Vite-style fixtures without relying on npm or a
runtime CDN.

## Source and build-on checks

- Build on S05 bundle artifacts and manifest schema.
- Read Issue `#014`, Issue `#017`, examples, `scripts/test-examples.mjs`,
  `scripts/check-repro.mjs`, `scripts/lib/artifacts.mjs`, `dist/manifest.json`,
  and current raw BFBB/Vite fixtures.
- Authority drift check: read-only Holm Issue `#534` at
  `fb34d6b768f15f9bc596e0b82430e5c678fd2088`; confirm the static BFBB floor and
  authored web precedence still hold.
- Confirm no external network, credential, package publication, or Holm test is
  needed.

## Expected seams / files

- Integrity verification script or test reading artifact SHA-256 records from
  the manifest/size reports and failing on tampered vendored files.
- Offline/no-build vendored BFBB fixture, likely under `examples/` or `test/`,
  that imports local vendored artifacts rather than package exports or CDN.
- Raw BFBB example and Vite production build checks updated to cover the new
  artifact(s) and capability-based web baseline.
- Documentation snippets only where needed to support immutable SHA/vendoring
  tests; S07 owns broader RC docs.
- Generated `dist/**` and reports if manifest or scripts change.

## Red test or docs-first proof

First add failing checks that:

- compute hashes from the generated manifest and reject a deliberately tampered
  artifact copy;
- run a vendored raw BFBB fixture with no package import, build step, npm runtime
  dependency, or runtime CDN;
- continue to pass Vite/package export compatibility for the stable web path;
- assert any docs/examples use immutable commit SHA or reviewed tag language and
  reject `@main` for deployed apps.

## Implementation boundary and generated artifacts

- This slice may add verification scripts, fixture files, and examples tests; it
  must not publish artifacts or contact a CDN at runtime.
- Do not claim real browser/vendor soak, production pilot success, or arbitrary
  SSR compatibility.
- Do not require Node in raw vendored BFBB; Node is allowed only for repository
  validation scripts.
- Any build-script or source change owns generated `dist/**`, manifest, size,
  license, and reproducibility checks.

## Validation commands

```bash
npm run test:examples
npm run test:dist
npm run test:declarations
npm run build
npm run check:repro
npm run size
npm run check:licenses
```

## Acceptance checklist

- [ ] Artifact hashes are recorded and verified from generated metadata.
- [ ] Tampering with a vendored artifact fails deterministically in a test or
      script.
- [ ] Raw vendored BFBB fixture works from local files with no package manager,
      build step, Node runtime dependency, or runtime CDN.
- [ ] Vite/package-export compatibility remains green for the stable web path.
- [ ] Docs/examples describe immutable SHA or reviewed tag vendoring and reject
      `@main` for deployed apps.
- [ ] Capability-based web baseline is asserted without claiming real browser
      soak.
- [ ] Issue `#014` bundle and vendoring acceptance gates are ready to close when
      S05+S06 are integrated and reviewed.

## Deferred / non-goals

- RC metadata and full upgrade/rollback/security/migration docs (S07).
- Integrated four-mode CI/final independent review/Holm acceptance (S08).
- Network CDN tests, npm publication, tags, releases, deploys, real app pilot,
  or browser/vendor compatibility matrix.

## Estimate, risk, ambiguity, review posture

- Estimate: 90-120 minutes plus validation wall time.
- Risk: yellow; offline fixtures can accidentally rely on package resolution or
  generated paths rather than vendored artifact layout.
- Ambiguity: exact fixture location can vary; the important proof is no build,
  no npm runtime, no runtime CDN, and tamper failure.
- Review posture: artifact-integrity and BFBB review required; reviewer should
  verify the fixture can be copied out of the repo with pinned files.

## Stop rules

Stop if immutable vendoring cannot be proven without network, artifact hashes are
not reproducible, Issue `#014` needs broader decomposition, a new dependency or
release action is requested, browser/pilot proof is demanded inside the queue,
Holm authority drifts, or any publish/tag/push/deploy/credential/cloud/worktree
/cross-repo action is needed.
