---
title: Holm non-HTTP parity map
status: changes_requested
review: "#072 P1=0 P2=4 P3=1"
issue: 019
slice: S4
captured: 2026-08-17
holm_version_marker: 0.208.0
holm_commit: 44d51d0f785ff6208ecc034c720e76a8543891be
sdk_baseline: c06f98fd6bd8ad447f2ae3dbe925b911e7e64bef
schema: holm.sdk.non-http-parity/1
---

# Evidence 009: Holm non-HTTP parity

## Scope and authority

This is the mapping-only Issue `#019` S4 checkpoint. It covers contract truth
that Holm's 261-row HTTP registry cannot encode:

- app-host WebSocket upgrade, auth, frames, presence, whispers, lifecycle, and
  delivery limits;
- injected Sobek `holm.*` namespaces;
- Holm app-manifest/node gates versus the SDK Node adapter's actual offers; and
- current action/schema authority after Holm's contract-first redesign.

The machine-readable map is
[`non-http-parity.json`](non-http-parity.json). Every claim cites a source file
whose SHA-256 is pinned to clean Holm commit
`44d51d0f785ff6208ecc034c720e76a8543891be` or to SDK product baseline
`c06f98fd6bd8ad447f2ae3dbe925b911e7e64bef`. Holm remained read-only.

The Holm source snapshot is exact but post-release: its version marker is
`0.208.0` and `git describe` is `v0.208.0-128-g44d51d0f7`. The nearest release
commit is `93606188a1ee064e8aade678891406a671609eb5`. The map therefore records
implementation truth, fixture truth, design truth, and negative evidence
separately; it does not promote post-release source into a public compatibility
promise.

## Result

The map resolves 47 explicit identities:

- 9 WebSocket entries;
- 21 Sobek entries, including 20 grouped Holm host surfaces and the one current
  SDK preview adapter boundary;
- 10 node/capability entries; and
- 7 action/schema entries.

Disposition is 2 adopted, 12 redesigned, 31 deferred, and 2 excluded. SDK
status is 4 current, 1 partial, 9 candidate, 26 none, and 7 unsupported.
`candidate` means only that source is concrete enough for a separately gated
implementation decision; it is not implementation authorization.

## Material findings

### 1. Realtime authority advanced; SDK transport did not

Holm now implements the exact app-host `/_ws` path, same-origin upgrade checks,
session/API-key/space-token resolution, legacy bare channels, authenticated
`private:` and `presence:` channels, app policy gates, presence data, and
sender-excluded typed-channel whispers. The SDK still ships no production
WebSocket transport.

The source contract is narrower than a generic realtime promise:

- `public:<name>` is rejected while an untyped bare name remains anonymous
  legacy compatibility;
- private/presence subscribe requires app-read authority, but bare subscribe
  does not;
- the initial `presence_roster` currently contains only the joining principal,
  and join/fanout behavior must not be assumed to match conventional full-roster
  presence systems;
- outbound queued JSON can be newline-coalesced inside one text frame;
- per-client queues use non-blocking sends and can drop messages;
- no binary frame contract, general client publish, durable replay, or resume
  cursor exists; and
- reconnect/backoff/resubscription are client responsibilities.

A future realtime slice must preserve those distinctions and must not silently
fall private/presence back to a bare public channel.

### 2. The SDK Sobek adapter is not injected-namespace parity

The current `@holmhq/sdk/sobek` preview adapter models only
`holm.http.app/request` and cache invalidation through a caller-supplied
structural runtime. It never reads a global `holm`, is not wired into Holm, and
is correctly labeled not-production.

Holm's live injected surface is much broader: app/member storage, durable
queues/events, realtime hub control, task/worker, auth, app-scoped admin,
node analytics, private files, image transforms, net/proxy, AI, agents,
environment, secrets, logging, email, and worker-only time. These remain
mapped/deferred rather than mechanically exported. Their app, caller, policy,
manifest, storage, and execution-context gates differ too much for one broad
"Sobek supported" flag.

### 3. Holm manifest grants are not SDK capability offers

Holm currently reads exact unversioned strings from `manifest.json`, including
`app.queue.*`, `app.events.*`, admin/member grants, `node-analytics-read`, and
`worker-foreign-member-spawn`. Each is only one part of a compound runtime
gate; role, policy, app scope, and resource authorization still apply.

The SDK Node adapter advertises only `holm.http.app@1.0` and
`holm.http.admin@1.0`. Its injected fetch/auth/clock/scheduler/environment/
secure-store services are SDK-local runtime services, not Holm node grants.
No code should derive versioned SDK offers from Holm's current manifest strings
or from a Holm version number.

### 4. Standalone action-registry assumptions are superseded

Holm Issue `#534` supersedes the older `surfaces/cli/main.js` action-registry
model. Canonical invocation is schema-described GET/POST; operation names,
discovery, generated CLI, and default UI are projections over that route
contract, not a second action transport.

Holm does ship a language-neutral offline Default Projection fixture revision
`holm.default-projection.fixture/1` and an offline validator. That fixture is
useful future SDK conformance input, but production registry evaluation,
caller-filtered discovery, generic CLI projection, generated SDK actions, and
an independent state/query registry remain absent. SDK architecture decision
`D009` and deferred Issue `#010` require an explicit future reconciliation with
`#534` before product implementation.

## Validation contract

`scripts/check-holm-non-http-parity.mjs` fails closed on:

- wrong schema or malformed Holm/SDK provenance;
- missing one of the four required lanes;
- duplicate `lane + id` identity;
- unknown authority/status/disposition vocabulary;
- stale or unreferenced source evidence;
- non-deterministic source, entry, operation, or evidence order;
- mismatched exact summary;
- changed SDK evidence files or an expected-absent SDK surface appearing; and
- optional pinned/live Holm commit, version, describe, cleanliness, or source
  hash drift.

Normal CI runs the self-contained SDK/map check. Read-only authority checks are
explicit:

```text
npm run test:holm-non-http-parity
node scripts/check-holm-non-http-parity.mjs --check-pinned \
  --holm-root ~/Projects/holmhq/holm/master
node scripts/check-holm-non-http-parity.mjs --check-live \
  --holm-root ~/Projects/holmhq/holm/master
```

The pinned-object check is safe while another Holm session moves its checkout.
A live check intentionally reports any newer/dirty peer state instead of
silently changing this map.

## Concurrent Holm drift observed

The snapshot was read and hashed while Holm's tracked tree was clean at
`44d51d0f…`. Later in this SDK session the read-only checkout advanced and an
unrelated route-registry run began modifying tracked route-registration files.
The live mode correctly reported drift; the pinned-object mode continued to
verify every mapped byte at `44d51d0f…`. S4 did not inspect unfinished
implementation detail, alter Holm, or repin from a dirty peer tree.

## Review status and stop gate

Independent Review
[`#072`](../../reviews/072_issue019_s4_non_http_parity/INDEX.md) requested
changes with `P1=0 P2=4 P3=1`: correct grouped operator-admin auth truth, the
missing typed-channel count policy, logged-out member-media availability, and
fail-closed provenance/authority validation; directly verify the transitive
Default Projection payload manifest as P3 hardening. S4 remains open pending
remediation and fresh independent review.

This evidence and its validator are the full S4 product. No public SDK source,
`dist/**`, version, release, publication, deployment, Holm, Medialab, or `@zyt`
change is authorized here. WebSocket transport, direct Sobek capabilities,
capability discovery, action helpers, and architecture amendments each require
a separately activated slice with fresh RED evidence.
