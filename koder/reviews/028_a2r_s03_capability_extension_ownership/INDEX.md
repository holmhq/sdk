---
plan: 002
issue: 016
type: code-review
verdict: needs fixes
p1: 0
p2: 2
p3: 0
reviewer: pi
created: 2026-07-15
queue: 002
entry: S03
reviewed_commit: 206b0e8178b9ed5b55775ad0e6d0942c2dabcf7a
base_commit: ebf057bcfac0ddf9d26e7cbc2187452bdf61678b
---

# Review: A2R S03 — Capability ownership and extension invocation seam

## Summary

Reviewed S03 implementation commit `206b0e8178b9ed5b55775ad0e6d0942c2dabcf7a` against `koder/plans/002_S03_capability_extension_ownership/INDEX.md`, the implementation receipt, changed capability/extension/createHolm source, export surfaces, and targeted source tests. Verdict: **NEEDS FIXES** with two P2 findings.

## Findings

### P2-1: Runtime-owned capability updater remains part of the public package surface

S03 requires the read-only public capability view to be separated from a private runtime-owned updater, and its acceptance criteria require updater ownership to be explicit and non-exported. The implementation correctly changes `Holm.capabilities` and extension setup `capabilities` to `CapabilityView` (`src/core/create-holm.ts:41`, `src/core/extensions.ts:57`), but the mutating updater is still exported as public API: `CapabilityRegistry` extends `CapabilityView` with `replaceOffers` and `registerExtensionOffer` (`src/core/capabilities.ts:66-68`), and both the factory/type are re-exported from `src/core/index.ts:52-68` and `src/index.ts:15-56`. The S03 implementation also adds public `createCapabilityView` exports without recording an explicit public surface approval.

Impact: SDK consumers no longer receive the live Holm instance updater from `createHolm()`, but the package still publishes the runtime/extension mutation interface instead of keeping it internal to core. That does not meet the S03 non-exported updater criterion and keeps standalone consumers/extensions able to manufacture capability registries through public API rather than a narrow runtime-owned seam.

Required fix: keep the public visibility surface read-only (`CapabilityView` is fine), but move `replaceOffers` / `registerExtensionOffer` onto an unexported internal updater interface used by `createHolm()` and the extension registrar. Avoid exporting new helper values unless the public expansion is explicitly accepted and type/declaration tests reflect it.

### P2-2: A rejected duplicate extension offer poisons future capability updates

`InstanceCapabilityRegistry.registerExtensionOffer()` appends the normalized extension offer to `#extensionOffers` before validating/committing the combined snapshot (`src/core/capabilities.ts:185-188`). If `#commit()` throws, for example because the extension registers the same `sdk.*` offer twice, the duplicate remains in `#extensionOffers`. Subsequent valid runtime `replaceOffers()` calls then keep failing because `createSnapshot()` repeatedly sees the hidden duplicate.

Impact: a failed controlled extension registration can leave the registry internally inconsistent and cause later runtime-owned offer replacement to fail. That violates the controlled mutation boundary S03 is trying to establish, especially because extensions can catch the wrapped registration error and continue after poisoning the registry.

Required fix: validate the next combined offer set before assigning `#extensionOffers` or roll back the append on commit failure. Apply the same atomicity pattern to `replaceOffers()` when the new runtime base conflicts with existing extension offers, and add regression coverage for failed duplicate extension offer registration followed by a valid runtime offer replacement.

## Passing Checks

- `createHolm().capabilities` now exposes a frozen delegating `CapabilityView`, not the live registry updater.
- Extension setup receives a read-only capability view and a narrow registrar that rejects non-`sdk.*` offers.
- Extension invocation routes through the Holm core invocation path and carries caller/cancellation/lifecycle behavior in the tested ready/disposed paths.
- Runtime `holm.*` offers are preserved across runtime replacements while extension `sdk.*` offers remain visible in the snapshot.

## Verification

```bash
npm run test:source -- test/source/core/capabilities.test.ts          # exit 0; script maps path to --test-name-pattern and still enumerates compiled suite
npm run test:source -- test/source/core/extensions.test.ts            # exit 0; same path-forwarding behavior
npm run test:source -- test/source/core/runtime-invocation.test.ts    # exit 0; same path-forwarding behavior
npm run test:source                                                   # exit 0; fallback full source suite, 129 pass
npm run typecheck:core                                                # exit 0
```

Additional focused check against the compiled test-source output reproduced P2-2: after registering duplicate `sdk.reports.export` and catching `DuplicateCapabilityOfferError`, a later valid `replaceOffers()` still throws `DuplicateCapabilityOfferError` because the duplicate remains in hidden extension state.

## Verdict

NEEDS FIXES. Address both P2 findings within S03, rerun the S03 validation commands including the fallback full `test:source`, and request fresh independent re-review.
