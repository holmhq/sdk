# Issue 019 S1 red-test evidence

Command: `node --test test/tooling/refresh-holm-route-registry.test.mjs`

Outcome: failed before implementation as expected with exit 1 (`0` passed,
`7` failed). Six behavior groups rejected the absent
`scripts/refresh-holm-route-registry.mjs`; the CI contract independently
rejected the absent `test:holm-route-registry` package script.

The executable RED suite pins these missing behaviors before production code:

- deterministic normalization, canonical object serialization, preserved route
  order, and a trailing newline;
- fail-closed envelope, provenance, route-field, and vocabulary validation;
- preservation of rows sharing method + path across distinct Holm source/lane
  contexts, with exact duplicate `method + path + source_group + lane`
  identities rejected;
- argv-safe `--write` execution with explicit binary precedence;
- Holm-independent `--check` plus noncanonical-byte rejection;
- exact `--check-live` acceptance and attributable route/provenance drift;
- signed Holm `v0.207.0` evidence at commit
  `d66628674232b01e8c95d5b86617bc660d61410f` with 261 rows; and
- canonical CI wiring to the offline gate without a live Holm dependency.

## Composite-identity refinement RED

The first GREEN attempt correctly stopped on the signed authority export's two
intentional `POST /api/spaces/{space}/keys` rows. Holm's golden-table identity
is `method + path + source_group + lane`, not method + path alone. After owner
approval, the tests were amended before implementation.

Command: `node --test test/tooling/refresh-holm-route-registry.test.mjs`

Outcome: failed as expected with exit 1 (`11` passed, `7` failed). The positive
multi-lane regression, composite-identity rejection wording, write/check/live
paths, and evidence gate all remained RED because production still rejected the
second valid lane by method + path. The live-check test additionally pins the
composite key for attribute changes, lane/source added-and-removed diagnostics,
and route-order diagnostics.
