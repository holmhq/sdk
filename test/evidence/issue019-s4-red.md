# Issue 019 S4 RED evidence

Date: 2026-08-17
Scope: non-HTTP parity map validation only; no public SDK implementation.

## RED command

```text
node --test test/tooling/check-holm-non-http-parity.test.mjs
```

## Expected failure observed

The focused test failed before collection with `ERR_MODULE_NOT_FOUND` for
`scripts/check-holm-non-http-parity.mjs`. This pins the absent validator before
implementation. The authored tests require:

- one complete deterministic map spanning `websocket`, `sobek`, `node`, and
  `action-schema` lanes;
- fail-closed provenance, vocabulary, source-reference, and duplicate-identity
  validation;
- deterministic entry/member ordering; and
- an exact checked-in summary that rejects drift.

This RED introduced no public `src/**`, generated API, or `dist/**` change.

## Review #072 remediation RED — 2026-08-18

Before remediation, the focused suite was expanded and rerun:

```text
node --test test/tooling/check-holm-non-http-parity.test.mjs
```

The result was the intended `4 pass / 7 fail`. The seven failures independently
pinned every requested correction before product changes:

- malformed `captured_at` and `nearest_release` provenance was accepted;
- contradictory `absent`/`implementation` and supersession authority was
  accepted;
- pinned verification did not resolve the declared nearest release tag;
- grouped operator-admin auth still overstated role-method guards;
- typed-channel count policy and legacy bypass were absent;
- logged-out member-media availability still claimed all methods; and
- six Default Projection payloads were not direct hashed sources.

The RED diff changed tests and this chronology only. It did not change the map,
checker, public `src/**`, generated API, `dist/**`, version, release state, or
Holm.
