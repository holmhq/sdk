---
plan: 002
issue: 016
type: code-rereview
verdict: needs fixes
p1: 0
p2: 1
p3: 0
reviewer: pi
created: 2026-07-15
queue: 002
entry: S03
phase: rereview
attempt: 05b
reviewed_commit: 5596d0b5b0b263fb5a7ddd3d9470f6d277cfa31c
prior_review: 029
fix_commit: 5596d0b5b0b263fb5a7ddd3d9470f6d277cfa31c
---

# Rereview: A2R S03 — Capability ownership and extension invocation seam (cycle 2)

## Summary

Reviewed the second S03 fix commit `5596d0b5b0b263fb5a7ddd3d9470f6d277cfa31c` against `koder/plans/002_S03_capability_extension_ownership/INDEX.md` and Review `#029`. Source now removes the mutable public `CapabilityRegistry` barrel export and returns a read-only `CapabilityView` from `createCapabilityRegistry()`, but the tracked package artifacts under `dist/` were not regenerated. Because `package.json` exports `dist/*`, current package consumers still receive the stale mutable capability registry and stale extension lifecycle seam. Verdict: **NEEDS FIXES** with one P2 finding.

## Findings

### P2-1: Tracked `dist/` package artifacts still expose the pre-S03 mutable capability and extension seams

The source fix is not reflected in the artifacts that `package.json` exposes to consumers. `dist/core/capabilities.d.ts:48-53` still declares `CapabilityRegistry` with `replaceOffers`, and `dist/core/capabilities.d.ts:55` still declares `createCapabilityRegistry()` returning that mutable type. The public barrels still re-export it (`dist/core/index.d.ts:11-12`, `dist/index.d.ts:1-2`). The runtime artifact is stale too: `dist/core/capabilities.js:54-56` still returns `new InstanceCapabilityRegistry(offers)`, so a package consumer can still obtain a `replaceOffers`-bearing registry.

The extension artifacts are also behind the S03 source contract: `dist/core/extensions.d.ts:20-23` exposes setup context with only `capabilities` and `extension`, and `dist/core/extensions.js:248-251` passes only those fields. `dist/core/create-holm.js:22-25` wires extension lifecycle without the S03 `invoke` or `registerExtensionOffer` callbacks, and `dist/core/create-holm.js:37` exposes the mutable registry as `holm.capabilities`.

Impact: the actual package export surface remains the exact stale public mutable/runtime-owned surface Review `#029` required removing, and consumers of `@holmhq/sdk` / `@holmhq/sdk/core` do not get the narrow extension invocation or capability registration seam implemented in source. This fails the S03 acceptance criteria for public read-only capability visibility, runtime-only updater ownership, and extension invocation ownership on the distributable SDK surface.

Required fix: regenerate and commit the tracked `dist/` JavaScript, declarations, and maps from the S03 source, then rerun the declaration/package smoke checks that exercise the public package exports. Ensure the generated artifacts no longer export `CapabilityRegistry`, `createCapabilityRegistry()` returns the read-only view at runtime/types, `createHolm()` exposes only the read-only capability view, and extension setup context includes the wired `invoke` / `registerCapabilityOffer` seam.

## Resolved items

- Source `src/core/capabilities.ts` now separates `CapabilityView` from `CapabilityRuntimeUpdater`; the root and core source barrels export `CapabilityView` but not `CapabilityRuntimeUpdater` or `CapabilityRegistry`.
- Source `createCapabilityRegistry()` now returns a frozen read-only view with no runtime mutation method.
- Source `InvokeRuntimeOptions`, `ExtensionLifecycleOptions`, and realtime hook options consume `CapabilityView` rather than a mutable registry type.
- Source extension setup receives a read-only capability view, gated `sdk.*` capability offer registration, and the lifecycle/cancellation/caller-aware invocation seam.

## Verification

```bash
npm run test:source -- test/source/core/capabilities.test.ts          # exit 0; path argument still ran the full source suite
npm run test:source -- test/source/core/extensions.test.ts            # exit 0; path argument still ran the full source suite
npm run test:source -- test/source/core/runtime-invocation.test.ts    # exit 0; path argument still ran the full source suite
npm run typecheck:core                                                # exit 0
```

Additional read-only artifact inspection found the stale generated/public package surface above.

## Verdict

NEEDS FIXES. Regenerate and commit the tracked distributable artifacts so the public package surface matches the S03 source contract.
