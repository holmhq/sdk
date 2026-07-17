# S07 red-test evidence

Command: `npm run test:rc-docs`

Outcome: failed before documentation and metadata implementation as expected
with exit 1. The new deterministic RC docs/metadata gate rejected the missing
private `0.1.0-rc.1` contract document, the old `0.0.0-dev` package metadata,
missing exact stable/preview/reserved/unavailable support matrix, missing
stable `0.1.x` compatibility policy, missing immutable vendoring/hash/update/
rollback/security notes, missing non-release/non-pilot boundaries, and missing
Issue `#015` non-completion wording.
