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
