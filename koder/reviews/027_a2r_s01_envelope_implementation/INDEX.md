---
plan: 002
issue: 016
type: code-review
verdict: needs fixes
p1: 1
p2: 0
p3: 0
reviewer: pi
created: 2026-07-14
queue: 002
entry: S01
reviewed_commit: a15b3df9b185c28b8313e8ba56d7c104ac2e9e2b
base_commit: ca368d6d68931da2fabc885356a5a9805a4d62b4
---

# Review: A2R S01 — Holm envelope implementation

## Summary

Reviewed S01 implementation commit `a15b3df9b185c28b8313e8ba56d7c104ac2e9e2b` against `koder/plans/002_S01_holm_envelope_semantics/INDEX.md`, the changed transport source/tests, Issue `#005` ledger update, and pinned Holm envelope evidence. Verdict: **NEEDS FIXES** with one P1 protocol/conformance finding.

## Findings

### P1-1: Generic Holm success envelopes with `data.ok === false` are misclassified as remote errors

`src/transports/index.ts:488-490` calls `extractRemoteErrorEnvelope(decoded, ...)` before the HTTP status and before scoping `/api/cmd`. That helper treats any JSON object whose nested `data.ok === false` as an error at `src/transports/index.ts:604-618`, so a successful Holm response such as `{"data":{"ok":false,"reason":"state"}}` on HTTP 200 throws `RemoteError` instead of surfacing `payload: { ok: false, reason: "state" }`.

This violates S01's success-envelope rule: Holm success responses are `{data,meta}` and `data` may be arbitrary payload. Pinned Holm evidence supports this distinction: `internal/api/response.go` defines success envelopes as `Data` plus optional `Meta`, while `/api/cmd` is the special command branch where `CmdGatewayHandler` returns HTTP 200 with `api.Success(... CmdResponse{Success:false, Error:...})` (`internal/handlers/cmd_gateway.go:88-100`) and the remote client checks `cmdGatewayResponse.Success` only after decoding `/api/cmd` (`internal/remote/client.go:1599-1603`, `3464-3498`).

Required fix: preserve generic `{data: ...}` success payloads, including nested `ok: false`, and restrict nested command-failure interpretation to the `/api/cmd` branch. Add/adjust tests so a non-command success envelope with `data.ok === false` unwraps successfully, and the actual Holm `/api/cmd` `success:false` command envelope is covered.

## Passing Checks

- The implementation is confined to S01-owned source/test/Issue `#005` ledger paths; the actual Issue `#005` path is `koder/issues/005_transport_cache_auth/INDEX.md` and was used appropriately.
- `{error:{code,message,details}}` envelopes map to `RemoteError` with details preserved.
- `{data,meta}` success envelopes preserve `meta` and normalized response headers for the tested positive case.
- Non-JSON response modes still pass existing upload/runtime/source tests.

## Verification

```bash
npm run test:source -- test/source/transport/transport-contract.test.ts  # exit 0
npm run test:source -- test/source/transport/upload.test.ts              # exit 0
npm run test:source -- test/source/core/runtime-invocation.test.ts        # exit 0
npm run typecheck:core                                                   # exit 0
```

Additional spot check against compiled test output reproduced the P1: decoding HTTP 200 `{"data":{"ok":false,"reason":"state"}}` without `/api/cmd` throws `RemoteError` with code `holm.remote_error`.

## Verdict

NEEDS FIXES. Fix P1-1 within S01, then rerun the S01 validation commands and request fresh re-review.
