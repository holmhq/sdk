---
status: open
priority: P1
created: 2026-07-13
updated: 2026-07-13
tags: bfbb, bundles, jsdelivr, distribution, integrity, size
parent: 001
depends_on: [003, 004]
type: feature
issue_kind: slice
context: Produce reproducible vendorable JavaScript without requiring npm publication or a runtime CDN.
---

# Issue 014: BFBB Bundles and jsDelivr/GitHub Distribution

## Problem

Raw Holm apps need a checked, immutable JavaScript artifact they can vendor
without npm, Node, a build step, or a public CDN at runtime. jsDelivr can serve
GitHub files immediately, but mutable branch URLs and opaque generated output
would undermine reproducibility.

## Required Outputs

- complete convenience ESM bundle (`dist/holm.js` candidate);
- justified narrower web/Node artifacts where runtime isolation or size matters;
- declaration files/source maps as appropriate for package/tooling consumers;
- build manifest with package version, commit, artifact hashes, raw/minified/gzip
  sizes, included capabilities, and license notice;
- deterministic build/rebuild check;
- BFBB fixture that vendors the artifact and runs with a static server only;
- documented immutable jsDelivr GitHub URL and download/checksum workflow;
- optional tag workflow design, without publishing or creating release tags
  unless separately approved.

Actual GitHub source for initial links:
`https://github.com/holmhq-admin/sdk`.

## Acceptance Criteria

- [ ] Clean build produces byte-identical tracked artifacts or documents and
      tests any unavoidable deterministic metadata normalization.
- [ ] Source tests, declaration consumer tests, and each bundle smoke pass before
      generated output can be committed.
- [ ] Build manifest hashes match files and a vendor verification command fails
      on tampering.
- [ ] Raw/minified/gzip and parse/startup measurements are recorded; CI enforces
      reviewed budgets rather than an arbitrary guess.
- [ ] Complete bundle exports all approved capabilities without bundling
      framework runtimes or optional CRDT engines.
- [ ] A raw no-build browser fixture works from vendored local files with
      network disabled after load.
- [ ] README uses a commit SHA or immutable tag and explicitly rejects `@main`
      for deployed apps.
- [ ] `dist/` is tracked intentionally and includes MIT/license provenance.
- [ ] `package.json` remains private; no npm credentials or publish workflow are
      introduced.

## Non-Goals

- Publishing npm.
- Requiring applications to import jsDelivr at runtime.
- Creating a release/tag without explicit approval.
- Treating minification as a substitute for API/runtime correctness.
