---
title: W4 S01 - Stable API inventory and freeze gate
status: in_review
issue: 017
plan: 004
slice: S01
type: implementation
queue_candidate: 005
owner: sdk-rc
created: 2026-07-17
updated: 2026-07-17
---

# Plan 004 S01: Stable API inventory and freeze gate

## User decisions captured

- `0.1.0-rc.1` is a private release-candidate code/artifact state, not a
  publish, tag, release, deploy, or production proof.
- Stable/frozen throughout `0.1.x`: `@holmhq/sdk`, `/core`, `/transports`,
  `/app`, `/web`, `/state`, and `/test`.
- Stable `0.1.x` compatibility means no breaking removal, rename, or behavioral
  contract change; additive changes only, with deprecation before any future
  removal.
- Preview `/node` and `/sobek`, reserved `/bridge`, and unavailable future
  surfaces are outside the stable freeze and handled by later slices.

## Capability statement

Create a deterministic manifest and gate for the exact stable public export and
declaration surface so v0.1-web cannot accidentally ship implementation-detail
exports or unreviewed stable API drift.

## Source and build-on checks

- Build on resolved Issues `#007` and `#009`, Issue `#017`, Review `#046`, and
  the approved architecture `D013` package export isolation decision.
- Read current `package.json`, stable source barrels under `src/{index,core,
  transports,app,web,state,test}.ts` or `src/*/index.ts`, declaration fixtures,
  `test/dist/index.test.mjs`, and generated `dist/**` only as needed.
- Authority drift check: verify Holm Issue `#534` remains readable at
  `fb34d6b768f15f9bc596e0b82430e5c678fd2088` via read-only `git show`; if live
  authority materially changes package/export assumptions, stop for owner
  review instead of widening the API.
- Confirm no queue, release, version bump, dependency, or cross-repo action is
  required for this slice.

## Expected seams / files

- A committed stable API manifest, likely under `test/fixtures/`, `scripts/`, or
  another existing test-owned location.
- A script or test that extracts/compares stable public exports and generated
  declaration entry points for the seven stable subpaths.
- Package/declaration/dist smoke fixtures proving stable subpaths expose only
  reviewed contracts and that root remains environment-neutral.
- Source barrel adjustments only to remove accidental exports or add missing
  stable exports already justified by completed issues.
- Generated `dist/**`, declaration files, maps, manifest, and size/license
  reports for any public source or build-script change.

## Red test or docs-first proof

First add a failing drift assertion that compares the current stable entry-point
exports/declarations against an explicit expected manifest. Include at least one
negative check that would fail if an internal implementation helper, preview
runtime, Node/Sobek/bridge type, DOM ambient, or unexported test fixture leaks
into a stable declaration graph.

## Implementation boundary and generated artifacts

- This slice inventories and gates the stable surface; it does not redesign API
  names, freeze preview surfaces, build BFBB bundles, or write RC docs.
- Do not add dependency-heavy API extraction tooling unless explicitly approved;
  prefer TypeScript/compiler output, package exports, and lightweight scripts.
- Any source/export change owns its generated JavaScript, declarations, maps,
  manifest, package smokes, and size check in the same implementation commit.
- If the manifest exposes a genuine product judgment about what is stable, stop
  for owner decision rather than guessing.

## Validation commands

```bash
npm run typecheck:core
npm run test:types
npm run test:declarations
npm run test:dist
npm run build
npm run check:repro
npm run size
npm run check:licenses
```

## Acceptance checklist

- [ ] Stable API manifest exists and names exactly `@holmhq/sdk`, `/core`,
      `/transports`, `/app`, `/web`, `/state`, and `/test`.
- [ ] Drift test fails on added/removed/renamed stable exports unless the
      manifest is intentionally updated in the same reviewed change.
- [ ] Root/core stable declarations remain free of DOM and Node ambient types.
- [ ] Stable entry points do not expose Node/Sobek/bridge production-only or
      implementation-detail helpers.
- [ ] Package/declaration/dist smokes pass from generated artifacts.
- [ ] Generated artifacts are reproducible and size/license gates remain green.

## Deferred / non-goals

- Preview/reserved labels and smokes for `/node`, `/sobek`, and `/bridge`.
- Credential/diagnostic P3 remediation.
- Bundle composition, vendoring integrity, docs, package version bump, release,
  publish, tag, deploy, or pilot proof.

## Estimate, risk, ambiguity, review posture

- Estimate: 90-120 minutes plus validation wall time.
- Risk: yellow; export manifests can become noisy if generated declarations are
  not normalized deterministically.
- Ambiguity: whether to bless an accidentally missing but intended stable export
  is a product/API decision, not an implementer judgment.
- Review posture: strict API review required; reviewers should compare manifest,
  package exports, declarations, and root/runtime isolation.

## Stop rules

Stop if the stable support matrix needs a change, a breaking API decision is
required, declaration extraction needs a new dependency, Holm authority conflicts
with the package boundary, reproducibility cannot be restored, or the work would
require any release action, publish/tag/push/deploy, credential, cloud mutation,
worktree, or cross-repository write.
