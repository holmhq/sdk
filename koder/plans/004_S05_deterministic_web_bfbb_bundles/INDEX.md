---
title: W4 S05 - Deterministic v0.1 web and BFBB bundles
status: implemented
issue: 017
plan: 004
slice: S05
type: implementation
queue_candidate: 005
owner: sdk-rc
created: 2026-07-17
updated: 2026-07-17
---

# Plan 004 S05: Deterministic v0.1 web and BFBB bundles

## User decisions captured

- Issue `#014` remains the source of truth for BFBB bundle distribution
  acceptance; this slice implements its deterministic bundle composition gate.
- v0.1-web ships a complete browser/BFBB convenience artifact plus any justified
  narrower web artifact needed for isolation/size.
- Bundles must exclude frameworks, CRDT engines, admin, future runtimes,
  generated CLI/actions, realtime, collaboration, arbitrary SSR, and production
  desktop/mobile.
- Package remains private; no tag, npm publish, release, push, deploy, or
  credentials.

## Capability statement

Produce deterministic v0.1-web/BFBB bundle artifacts, manifests, maps,
declarations, license and size outputs that satisfy Issue `#014` bundle
composition without claiming future runtime capabilities.

## Source and build-on checks

- Build on S01-S04 if they changed public exports or dist generation.
- Read Issue `#014`, Issue `#017`, architecture `D014`, `package.json`, current
  `scripts/{size,write-dist-manifest,check-repro}.mjs`, `tsconfig*`, examples,
  dist smoke tests, and relevant source barrels.
- Authority drift check: read-only Holm Issue `#534` at
  `fb34d6b768f15f9bc596e0b82430e5c678fd2088`; confirm BFBB/static floor and
  authored `index.html` precedence still align with bundled web artifacts.
- Confirm no dependency install is needed for bundle generation; if a bundler or
  minifier dependency is necessary, stop for owner approval.

## Expected seams / files

- Bundle build script/config producing reviewed artifacts such as `dist/holm.js`
  and a justified narrow browser artifact (for example `dist/holm-web.js`) if
  retained by the design.
- Source composition modules only if needed to define complete browser/BFBB and
  narrow web bundle entry points.
- Tests/smokes validating artifact exports, excluded capabilities, source maps,
  declaration paths, and no framework/CRDT/future-runtime code.
- `dist/manifest.json`, `dist/size-report.json`, `dist/license-report.json`, JS,
  declarations, and maps updated and reproducible.
- Package exports only if required for artifact/source seams; do not expose
  unstable bundle internals as stable API accidentally.

## Red test or docs-first proof

First add failing bundle tests that expect the v0.1 web artifacts to exist, be
ESM-importable, include the approved stable web/app/core/state/transports/test
composition where intended, exclude unavailable capabilities, and have source
maps/declarations/license/size/manifest records. Include a negative assertion
that the complete browser/BFBB artifact does not include Node/Sobek/bridge
production constructors, frameworks, CRDT engines, admin, actions/generated CLI,
realtime, or collaboration.

## Implementation boundary and generated artifacts

- This slice owns deterministic bundle creation and tracked generated outputs;
  missing generated artifacts are incomplete implementation.
- Do not implement offline vendoring/tamper checks beyond basic artifact hashes;
  S06 owns vendored fixture and integrity workflow.
- Do not write broad release docs; S07 owns RC documentation.
- Do not add dependencies or change private package/release status without owner
  approval.
- Keep raw vendored BFBB free of Node runtime dependency.

## Validation commands

```bash
npm run build
npm run check:repro
npm run test:dist
npm run test:examples
npm run test:declarations
npm run size
npm run check:licenses
git diff --exit-code --stat -- dist package.json scripts src test examples
```

## Acceptance checklist

- [ ] Complete browser/BFBB convenience artifact exists and is deterministic.
- [ ] Any narrower web artifact is justified by runtime isolation or size and is
      deterministic.
- [ ] Bundles include approved v0.1-web stable capabilities and exclude
      frameworks, CRDT engines, admin, future runtimes, generated CLI/actions,
      realtime, collaboration, SSR claims, and production desktop/mobile.
- [ ] Source maps, declarations where applicable, license report, size report,
      and manifest records cover the new artifacts.
- [ ] Size budgets are reviewed/measured rather than guessed and enforced by CI
      scripts.
- [ ] `dist/` regeneration is byte-reproducible and package remains private.

## Deferred / non-goals

- Offline vendored fixture, tamper failure, immutable SHA workflow, raw BFBB +
  Vite compatibility matrix (S06).
- RC docs/update/rollback/security notes (S07).
- Real browser/vendor soak, npm publish, tag, release, deploy, or promotion.

## Estimate, risk, ambiguity, review posture

- Estimate: 90-120 minutes plus validation wall time.
- Risk: yellow/red; bundle composition can affect export stability, size, and
  generated artifacts.
- Ambiguity: exact narrow artifact name/composition can differ if justified, but
  the complete BFBB convenience artifact and exclusions are mandatory.
- Review posture: distribution and API review required; reviewer should inspect
  generated artifacts, manifests, size, and excluded capability claims.

## Stop rules

Stop if Issue `#014` cannot be satisfied thinly, bundle generation needs a new
dependency, stable/preview/reserved status must change, size/reproducibility
cannot be proven, Holm BFBB authority conflicts, or any publish/tag/push/deploy
/release/credential/cloud/worktree/cross-repo action is needed.

## Queue #005 checkpoint

- 2026-07-17 `q005-coordinator-04`: S05 blocked before product delta after two
  implementation process failures. Primary `q005-c04-e05-implement-a01` and
  fallback `q005-c04-e05-implement-a02` both ended with no commit and no Git
  delta from base `17bac60a0d17b81a02ff44ea23845a30b8316db3`.
- No S05 acceptance proof exists yet: bundle composition, deterministic
  generated artifacts, manifest/size/license coverage, and fresh distribution
  review remain unproven. Next safe phase is S05 implementation only after an
  owner/operator recovery decision or materially changed dispatch capability.
