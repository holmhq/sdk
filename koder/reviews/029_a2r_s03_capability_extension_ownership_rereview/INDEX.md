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
attempt: 05a
reviewed_commit: 4c2bff3fa2a3657d6cbd69506348ac583a88b31f
prior_review: 028
fix_commit: 4c2bff3fa2a3657d6cbd69506348ac583a88b31f
---

# Rereview: A2R S03 — Capability ownership and extension invocation seam

## Summary

Reviewed the S03 fix commit `4c2bff3fa2a3657d6cbd69506348ac583a88b31f` against `koder/plans/002_S03_capability_extension_ownership/INDEX.md` and Review `#028`. Verdict: **NEEDS FIXES** with one remaining P2 finding.

## Findings

### P2-1: Public capability registry still exposes runtime offer mutation

Review `#028` required moving `replaceOffers` / `registerExtensionOffer` onto an unexported internal updater and keeping the public visibility surface read-only. The fix removes `registerExtensionOffer` and `createCapabilityView` from the package barrels and wires extension registration through a private callback, but `CapabilityRegistry` still includes `replaceOffers` (`src/core/capabilities.ts:66-68`), `createCapabilityRegistry()` still returns that mutable type (`src/core/capabilities.ts:141-143`), and both are still re-exported from the public package barrels (`src/core/index.ts:50-70`, `src/index.ts:15-55`). Public seams that consume capability truth also still accept `CapabilityRegistry`, for example `InvokeRuntimeOptions.capabilities` (`src/core/invoke.ts:17-20`) and `RealtimeReconcileHookOptions.capabilities` (`src/state/reconcile.ts:58-61`).

Impact: package consumers can still manufacture a mutable registry with arbitrary `holm.*` offers and pass it through public capability gates outside `createHolm()`. That does not satisfy the S03 acceptance criterion that runtime-only updater ownership be explicit and non-exported, nor the Review `#024` correction that consumers/extensions must not manufacture `holm.*` offers.

Required fix: keep public package capability inputs and helpers on `CapabilityView`/read-only snapshots. Move `replaceOffers` and any runtime-owned updater factory/type behind an internal-only seam used by `createHolm()` and tests that intentionally exercise internals, without re-exporting mutable registry types or factories from the public package surface.

## Resolved items

- Review `#028` P2-2 appears fixed: `#commitWith()` validates the combined base/extension snapshot before assigning `#baseOffers` or `#extensionOffers`, and regression coverage covers duplicate extension registration and failed runtime replacement rollback.
- Extensions now receive a read-only capability view and an unwired registrar fails unless a runtime supplies the extension offer callback.

## Verification

```bash
npm run test:source -- test/source/core/capabilities.test.ts          # exit 0; path argument still enumerated the compiled source suite
npm run test:source -- test/source/core/extensions.test.ts            # exit 0; same path-forwarding behavior
npm run test:source -- test/source/core/runtime-invocation.test.ts    # exit 0; same path-forwarding behavior
npm run test:source                                                   # exit 0; fallback full source suite, 132 pass
npm run typecheck:core                                                # exit 0
```

## Verdict

NEEDS FIXES. Address the remaining public mutable capability-registry surface within S03 and request fresh independent rereview.
