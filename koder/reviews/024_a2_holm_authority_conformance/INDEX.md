---
title: Holm Authority Review of the A2 Checkpoint
status: blocked
verdict: block
type: audit
reviewer: holm-authority
reviewed_at: 2026-07-14
sdk_commit: fe37f8528eeca38007f575307e7f3e26f642b615
holm_commit: bdcc8cc51eccef9d9f195a2d35d5db1af39b1655
holm_baseline: 11ceae0d88e9c800eb77916e3244fbd231ad81bb
prior_review: ../023_a2_final_core_api_conformance/INDEX.md
remediation_issue: ../../issues/016_a2_authority_conformance_remediation/INDEX.md
finding_counts:
  P1: 4
  P2: 1
  P3: 0
---

# Holm Authority Review of the A2 Checkpoint

## Verdict

**BLOCK.** A2 is not accepted. Four foundation-level P1 findings and one P2
must be remediated and independently re-reviewed before A2 owner acceptance or
any formal A3 planning window.

Review `#023` remains valid historical evidence of the SDK-side review at
`56a81d1`; this later cross-repository authority review governs owner acceptance.

## Reviewed authority

- SDK target: `fe37f8528eeca38007f575307e7f3e26f642b615`
- Holm current HEAD: `bdcc8cc51eccef9d9f195a2d35d5db1af39b1655`
- SDK-pinned Holm baseline: `11ceae0d88e9c800eb77916e3244fbd231ad81bb`
- Holm platform marker: `v0.182.0`

## Drift summary

No material Holm authority drift was found. Between the pinned baseline and
reviewed Holm HEAD, only `.harnex/dispatch.jsonl`, `koder/SESSION.jsonl`, and
`koder/STATE.md` changed. Relevant SDK, state, route, runtime, realtime,
protocol, and design paths are unchanged, and the platform marker remains
`v0.182.0`.

## Findings

### P1-1: The transport decoder does not implement Holm's response protocol

**SDK evidence**

- `src/transports/index.ts:296-305,469-527` treats successful JSON as the
  operation payload, parses only flat top-level error fields, discards Holm
  `meta`, and ignores response headers.
- `test/conformance/transport/fixtures.ts` has JSON/raw/binary payload fixtures
  but no Holm success/meta/error envelope fixture.
- `koder/evidence/001_issue005_transport_uploads/INDEX.md` classifies the upload
  seam only; it does not evidence response unwrapping, nested errors, metadata,
  headers, cache parity, or the `/api/cmd` exception.
- Read-only generated-artifact probes left `{"data":{"ok":true}}` wrapped and
  reduced a nested `FORBIDDEN` error to generic `holm.remote_error`.

**Holm evidence**

- `internal/api/response.go:12-27` defines canonical `{data,meta}` success and
  `{error:{code,message,details}}` failure envelopes.
- `packages/holm-sdk/client.js:72-89,188-189` unwraps `data` and preserves nested
  error fields.
- `internal/remote/client.go:946-1004` follows the same envelope authority.

**Impact**

A3 app/admin methods would expose incorrect result types and lose Holm error
codes, details, pagination metadata, and header-dependent behavior. This is an
accidental parity gap, not an intentional redesign recorded by Issue `#005`.

**Required correction**

Add source-pinned Holm envelope fixtures and a Holm protocol layer over generic
transport. Preserve `meta` and relevant response headers, handle `/api/cmd`'s
HTTP-200 command envelope explicitly, and expand the Issue `#005` migration
ledger.

### P1-2: Caller partitions are not safe across auth changes

**SDK evidence**

- The approved contract requires a provider-owned
  `CallerProvider.fingerprint(context)`, but `src/core/caller.ts:35-37` omits it
  and `:85-87` derives a fingerprint only from public caller context.
- Browser-session rotations and id-less operator/token rotations therefore
  reuse the same fingerprint.
- `src/state/mutation.ts` resolves the caller once, never subscribes to caller
  changes, and can commit a prior caller's result at `:213` after a provider
  transition. A read-only probe reproduced this with synthetic callers.

**Holm evidence**

- Proposal 001 requires surface-dependent caller resolution per invocation:
  `koder/proposals/001_universal_app_runtime/INDEX.md:446-452`.
- `internal/runtime/handler.go:492-495` and its auth resolution paths resolve the
  authoritative caller for each serverless request.

**Impact**

Logout/login, selected-member, token, app, or scope changes can reuse cache
partitions or let a prior principal's mutation result enter a new caller's
resource snapshot. Holm remains the final server authorization boundary, but
client data isolation is not safe.

**Required correction**

Restore a provider-owned non-secret partition fingerprint/epoch. Integrate
caller subscriptions with cache, query, mutation, and in-flight fencing: cancel
old work, clear old snapshots, and reject late results. Cover browser-session,
explicit-token, operator, agent, app, and scope transitions.

### P1-3: The capability/extension control plane is overpowered and underpowered

**SDK evidence**

- `CapabilityRegistry.replaceOffers()` is public at
  `src/core/capabilities.ts:59-64`.
- The same mutable registry is exposed as `holm.capabilities` at
  `src/core/create-holm.ts:36,79` and passed to extensions through
  `src/core/extensions.ts:36-38,429-435`.
- A read-only probe inserted `holm.actions.registry` after startup and passed the
  core capability gate on the test adapter.
- `ExtensionSetupContext` provides no narrow invocation function, despite the
  approved architecture requiring one.

**Holm evidence**

- Holm has no implemented universal action discovery/invocation capability at
  the reviewed HEAD; Proposal 001 and Issue `#486` leave it to future work.
- Holm Issue `#517` confirms private realtime and presence are also absent.

**Impact**

Consumers/extensions can fabricate runtime capability truth. Legitimate A3
extensions cannot invoke through the core caller/cancellation/lifecycle
boundary and would be pushed toward capturing adapters directly.

**Required correction**

Split a public read-only capability view from a private runtime-owned updater.
Provide a controlled extension-local `sdk.*` offer registrar and a narrow,
lifecycle-aware invocation function. Consumers/extensions must not manufacture
`holm.*` offers.

### P1-4: Credentials can enter diagnostics and cache keys

**SDK evidence**

- `redactTransportRequest()` retains raw URL and params at
  `src/transports/index.ts:350-359`.
- Custom auth headers are redacted only when their names match a heuristic at
  `src/transports/index.ts:578-583`.
- `src/core/cache-key.ts:16-25` embeds canonical operation data verbatim.
- Transport cache update hooks receive the full request at
  `src/transports/cache.ts:382-390`.
- Read-only probes confirmed leakage of a synthetic custom-header proof into a
  diagnostic and a synthetic sensitive query parameter into a cache key.

**Holm evidence**

Holm treats header/query credentials as explicit secret material; for example,
`internal/runtime/proxy_response.go` separates secret references and supplies
redaction values rather than relying on header-name heuristics.

**Impact**

Credentials or capability tokens can enter diagnostics, observational callback
events, or copied cache-key strings, violating the approved security invariant.

**Required correction**

Track sensitivity structurally. Always redact the exact auth-provider header;
sanitize or hash sensitive URL/path/param material in keys and events; expose
only redacted request metadata to observational hooks. Add arbitrary-header and
query/path-token tests.

### P2-1: Runtime responses are not correlated to their requests

**SDK evidence**

`src/core/invoke.ts:54,88-93` accepts and returns any adapter
`response.requestId` without checking it against the request.

**Holm evidence**

Proposal 001 requires message-passing boundaries. The approved SDK mailbox
contract requires each request ID to correlate exactly one logical response and
late or duplicate responses to be ignored and diagnosed.

**Impact**

A mailbox or multiplexed adapter can cross-wire one operation's response into
another operation.

**Required correction**

Reject mismatched response IDs with `ProtocolError`; require mailbox adapters to
ignore and diagnose duplicate or late responses.

## Passing checks

- No direct SQLite access or competing storage protocol appears in A2 source.
- Holm remains documented as the final authorization boundary.
- `@holmhq/sdk/state` is an honest clean break with no legacy `holm-state` alias
  or Vue-style public API.
- Public realtime is marked non-durable and explicitly not private,
  presence-capable, collaborative, or replayable.
- No production desktop/mobile adapter or action implementation is shipped.
- Existing Holm app/admin route inventories remain mechanically current at the
  reviewed Holm HEAD; the Holm SDK suite passed `209` tests with zero failures.

## Evidence refresh required

- Expand Issue `#005` migration evidence beyond uploads.
- Add source-pinned Holm protocol fixtures.
- Reconcile `dist/manifest.json`'s null source commit with the approved artifact
  provenance contract.
- Repin the final remediation review to current Holm HEAD even if relevant
  source remains unchanged.

## A3 readiness

The legacy `packages/holm-sdk/{app,admin,surface}.audit.js` files remain useful
migration inventories, not protocol authority. In particular, `GET /api/me` is
classified as implicit/app-owned and is not a registered Holm platform route.

Issue `#009` depends on the repaired invocation/capability seam. Issue `#010`
may later plan plain registry builders and in-memory fixtures, but production
discovery/invocation remains unsupported until Holm Issue `#486` Child 4 defines
and implements the canonical protocol.

## Explicit decisions

- Accept A2: **no**
- Authorize A3 planning only: **no**
- Authorize A3 implementation: **not requested**
- Owner decision still required: whether `app.auth.me()` remains an app-owned
  `/api/me` convention, becomes a Holm platform route, or is deferred
- New Holm issue before eventual A3 planning: none, unless `/api/me` is chosen
  as platform-owned
- Holm prerequisite before production Issue `#010`: Issue `#486` Child 4

## Verification

Read-only review only; no source, generated artifact, release, tag, deploy, or
repository mutation was performed during authority inspection.

- Relevant Holm diff from baseline to reviewed HEAD: empty
- Holm legacy SDK tests: `209 passed, 0 failed`
- Focused generated-artifact probes reproduced all four P1 behaviors
- Both repositories were clean after inspection

## Required next action

File and remediate Issue `#016` under a separately authorized A2R window. Use
strict red -> green -> refactor slices, fresh isolated implementers, independent
reviewers, and a final Holm-authority return. Do not begin Issue `#007`.
