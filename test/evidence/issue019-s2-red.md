# Issue 019 S2 RED evidence

Date: 2026-08-15

## Route-disposition validator absent

Command:

```text
node --test test/tooling/check-holm-route-dispositions.test.mjs
```

Expected RED result: exit `1`. Node failed with `ERR_MODULE_NOT_FOUND` for
`scripts/check-holm-route-dispositions.mjs`, proving that no executable
full-registry disposition validator existed before S2 implementation.

The RED test already required fail-closed full 261-row coverage, preservation of
both `POST /api/spaces/{space}/keys` lane identities, explicit admission of only
the two stable retention contracts from the 21-row admin delta, provenance
checks, and rejection of missing, duplicate, stale, conflicting, preview, or
contract-authority-free decisions.

## Offline CI gate absent

After the validator reached GREEN, the focused test added the required normal-CI
contract and failed with exit `1`: `package.json` had no
`test:holm-route-dispositions` script, so the expected offline checker command
was `undefined`. This RED preceded package/CI wiring.
