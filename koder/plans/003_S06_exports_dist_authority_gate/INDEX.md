---
title: W3 S06 - Package integration and authority gate
status: implemented
issue: 009
plan: 003
slice: S06
type: implementation
queue_candidate: 004
owner: sdk-runtime
created: 2026-07-16
updated: 2026-07-17
---

# Plan 003 S06: Package integration and authority gate

## Capability statement

Integrate Issue `#009` runtime subpaths into package exports, declarations, dist artifacts, examples, full validation, read-only Holm authority acceptance, and independent final review so the window can stop before Issue `#014`.

## Source and build-on checks

- Require S01-S05 implementation commits and slice reviews to be green or explicitly in the same integrated review range.
- Read `koder/issues/009_runtime_surface_adapters/INDEX.md`, changed public subpath manifests, `package.json`, `test/dist/index.test.mjs`, declaration fixtures, examples README/files, and Holm Issue `#534` at the named authority pin only as needed.
- Confirm no queue/state/execution/README mutation is required for product integration unless the owning coordinator separately authorizes metadata closeout.

## Expected files or seam

- `package.json` export map for any new `./sobek` and `./bridge` subpaths.
- `src/index.ts` only if root exports must expose environment-neutral contracts.
- Declaration fixtures under `test/declarations*` and type fixtures under `test/types`.
- Dist smoke under `test/dist/index.test.mjs`.
- Examples under `examples/` only when needed to prove Node/CLI or reserved bridge imports without making future capabilities look shipped.
- Generated `dist/**` JavaScript, declarations, maps, manifests, and size outputs for all public source changes.

## Red test

First add failing integration/package assertions proving:

- root import remains DOM/Node ambient-free and does not pull concrete runtimes implicitly;
- `@holmhq/sdk/web`, `@holmhq/sdk/node`, `@holmhq/sdk/sobek`, `@holmhq/sdk/test`, and `@holmhq/sdk/bridge` import only their intended runtime contracts;
- package consumers can typecheck runtime-specific adapters from declarations;
- generated ESM smoke can instantiate web, Node/CLI, in-memory, Sobek fake, and bridge mocks without hidden global runtime assumptions;
- examples and dist smoke label desktop/mobile as reserved/unsupported, not production runtimes.

## Implementation boundary

- This slice may perform integration fixes and generated artifact updates, but must not introduce new runtime semantics beyond S01-S05.
- Do not start Issue `#014`, publish, tag, release, deploy, push, or mutate Holm.
- Do not create a queue, update `koder/STATE.md`, or rewrite `koder/docs/EXECUTION.md`; those are coordinator/owner closeout responsibilities.
- If a preceding slice missed required generated output, treat it as implementation incomplete and fix it here only when ownership is still serial and bounded.

## Validation

- `npm run ci`
- `FORCE_COLOR=1 npm run ci`
- `npm run check:repro`
- `npm run test:holm-smoke` if the smoke is configured and does not require credentials or Holm writes; otherwise record a skip reason in implementation evidence.
- Read-only Holm authority check: `git -C /home/glasscube/Projects/holmhq/holm/master show 55cd8213af9878f63432586a8a58c093b3aaa47a:koder/issues/534_contract_first_holm_apps/INDEX.md >/tmp/holm-534-authority.txt` plus a manual acceptance note mapping SDK adapter boundaries to the pinned GET/POST contract.
- Independent SDK final review via the authorized dispatch model must report zero P1/P2 before issue closure.

## Deferred / non-goals

- npm publication, tags, releases, deployment, credentials, or production/cloud mutation.
- Issue `#014` and later program issues.
- Holm Issue `#534` implementation, generated CLI, Default Projection, action discovery, production desktop/mobile runtimes.
- README or execution-window changes unless owner/coordinator explicitly scopes them after implementation.

## Risk, ambiguity, and estimate

- Risk: yellow; generated dist/declaration drift and accidental export graph broadening are likely integration hazards.
- Ambiguity: final examples may be minimal import smokes rather than full user documentation.
- Estimate: 90-120 minutes plus full validation wall time.

## Stop rules

Stop and return to the owner/coordinator if:

- full validation cannot be made green on a clean tree;
- package exports require collapsing runtime boundaries or pulling all adapters into root;
- Holm authority at the named pin conflicts with approved decisions beyond the narrow compatibility statement;
- independent review reports P1/P2, or fixing findings would cross into Issue `#014` or unapproved Holm features.
