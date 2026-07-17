---
title: W4 S02 - Preview and reserved boundary enforcement
status: approved
issue: 017
plan: 004
slice: S02
type: implementation
queue_candidate: 005
owner: sdk-rc
created: 2026-07-17
updated: 2026-07-17
---

# Plan 004 S02: Preview and reserved boundary enforcement

## User decisions captured

- `/node` and `/sobek` are shipped and tested but preview/not frozen for v0.1-web.
- `/bridge` is reserved/not production and may prove mailbox/mock boundaries only.
- Stable entry points must not pull preview runtime dependencies or imply future
  desktop/mobile, production Sobek host, or frozen Node/CLI ergonomics.
- Node `>=20` is the package build/tooling floor; raw vendored BFBB has no Node
  runtime dependency.

## Capability statement

Enforce honest preview/reserved labels and import isolation so v0.1-web stable
surfaces cannot accidentally claim Node/Sobek/bridge production support.

## Source and build-on checks

- Build on S01's stable API manifest when available; otherwise read the current
  stable barrels and package exports directly.
- Read Issue `#017`, Review `#046`, Review `#048`, `package.json`,
  `src/node/index.ts`, `src/sobek/index.ts`, `src/bridge/index.ts`, examples,
  declaration fixtures, and dist smokes as needed.
- Authority drift check: read-only Holm Issue `#534` at
  `fb34d6b768f15f9bc596e0b82430e5c678fd2088`; confirm it still supports the
  SDK claim that generated CLI/default projection/production native runtimes are
  Holm-owned or future, not shipped by this SDK.
- Confirm no `package.json` public publish metadata, tag workflow, release
  workflow, or dependency install is needed.

## Expected seams / files

- Type/declaration fixtures that assert `/node` and `/sobek` are preview-labelled
  and `/bridge` is reserved-labelled without contaminating stable imports.
- Dist/package smokes proving stable subpaths load without importing preview
  Node/Sobek/bridge modules.
- Examples or docs-local labels, likely `examples/README.md` or RC docs if S07
  has not yet taken them, but only enough to support the boundary tests.
- Source JSDoc/type literals/constants only if tests need a machine-readable
  preview/reserved status; avoid broad API shape changes.
- Generated `dist/**` and reports for any source or build-script change.

## Red test or docs-first proof

First add failing tests that require machine-checkable preview/reserved wording
or status exports for `/node`, `/sobek`, and `/bridge`, and negative package
smokes showing a stable web/root import does not evaluate or depend on preview
runtime modules. Include a docs/example assertion that desktop/mobile bridge
imports are called reserved/unsupported, not production.

## Implementation boundary and generated artifacts

- This slice may add labels, metadata, tests, and small boundary-preserving
  source/docs fixes; it must not freeze `/node` or `/sobek` or promote `/bridge`.
- Do not implement higher-level CLI ergonomics, Sobek host APIs, production
  desktop/mobile runtime services, generated CLI, admin, realtime, or
  collaboration.
- Any public-source change owns generated JS, declarations, maps, dist manifest,
  size, license, and relevant package smoke outputs.
- If stable entry points currently require preview runtime imports, stop and
  split or ask; do not hide the coupling.

## Validation commands

```bash
npm run test:types
npm run test:declarations
npm run test:dist
npm run test:examples
npm run build
npm run check:repro
npm run size
npm run check:licenses
```

## Acceptance checklist

- [ ] `/node` and `/sobek` are explicitly preview/not frozen in tested labels,
      declarations, examples, or docs.
- [ ] `/bridge` is explicitly reserved/not production and only proves mocks,
      mailbox contracts, and service slots.
- [ ] Stable subpaths import without evaluating Node, Sobek, bridge, desktop, or
      mobile runtime implementations.
- [ ] BFBB/raw web imports have no Node runtime dependency.
- [ ] Package/declaration/dist/example smokes pass and do not claim future
      capabilities.
- [ ] Generated artifacts remain reproducible.

## Deferred / non-goals

- Stable API manifest design beyond consuming S01's gate.
- Credential/diagnostic hardening, P3 edge disposition, bundle generation,
  offline vendoring, RC docs beyond minimal labels, or integrated final review.
- Node 20/22/24 compatibility guarantee or production Sobek/native support.

## Estimate, risk, ambiguity, review posture

- Estimate: 60-90 minutes plus validation wall time.
- Risk: yellow; import-isolation failures may reveal genuine export graph
  coupling that should be fixed narrowly or escalated.
- Ambiguity: exact label mechanism can be JSDoc, tested docs text, status
  constants, or declaration fixture assertions as long as it is deterministic.
- Review posture: boundary review required; reviewer should reject fake
  production claims and stable-to-preview coupling.

## Stop rules

Stop if a support label needs to change, a stable API would need preview runtime
coupling, a browser/BFBB promise expands beyond capability-based baseline, a new
dependency is requested, Holm authority drifts, reproducibility is missing, or
any publish/tag/push/deploy/credential/cloud/worktree/cross-repo action becomes
necessary.
