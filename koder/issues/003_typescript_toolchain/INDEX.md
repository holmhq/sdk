---
status: open
priority: P1
created: 2026-07-13
updated: 2026-07-14
tags: typescript, build, tests, conformance, ci
parent: 001
depends_on: [002]
type: feature
issue_kind: slice
context: Establish strict TypeScript and generated-artifact proof before capability implementation begins.
---

# Issue 003: Strict TypeScript Toolchain and Conformance Harness

## Problem

The SDK must be authored in TypeScript but consumed as dependable JavaScript in
browsers, Node/CLI, and eventually Sobek/native shells. One permissive tsconfig
or source-only test suite would allow platform assumptions and broken bundles to
escape.

## Proposed Direction

Create the minimal toolchain needed for strict TDD:

- strict base TypeScript config;
- core config with ES libraries only and no DOM/Node ambient types;
- runtime-specific configs that add only their required globals;
- ESM build, declaration generation, source maps, and deterministic outputs;
- unit, type-level, adapter-conformance, and generated-bundle test layers;
- coverage and bundle-size reporting;
- package scripts suitable for local and CI use;
- one lockfile and an intentionally small, MIT-compatible dev dependency set.

`package.json` must remain private and no publish token/workflow may be added.

## Acceptance Criteria

- [x] A deliberately failing test/type fixture is observed before the scaffold
      turns green. (`S01`: `1c450cf`, review `48a772e`)
- [x] `src/core` compilation cannot access DOM or Node globals. (`S01`)
- [x] Runtime configs can opt into web or Node types without contaminating core.
      (`S01`)
- [x] Tests cover source ESM and at least one generated ESM artifact. (`S02`)
- [x] Declaration output is generated and type-tested from a consumer fixture.
      (`S02`)
- [ ] Build output is reproducible from a clean checkout.
- [ ] Coverage and raw/minified/gzip size commands exist and fail clearly.
- [ ] CI runs typecheck, tests, build, declaration consumer test, bundle smoke,
      license checks, and diff/reproducibility checks.
- [x] `npm publish` remains blocked by `"private": true`; no registry setup is
      required. (`S01`)
- [ ] README developer commands match the implemented scripts.

## Non-Goals

- Publishing to npm.
- Implementing SDK capabilities beyond the minimum fixture needed to prove the
  toolchain.
- Requiring downstream BFBB apps to run TypeScript or install Node.
