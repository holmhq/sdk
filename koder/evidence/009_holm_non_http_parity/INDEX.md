---
title: Holm non-HTTP parity map
status: accepted
review: "#073 approved P1=0 P2=0 P3=0"
issue: 019
slice: S4
captured: 2026-08-17
holm_version_marker: 0.208.0
holm_reference: the release tested (internal verification kept privately)
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

The original machine-readable source/parity dump (`non-http-parity.json`) was
removed during the public-tree privacy cleanup, together with its internal
provenance validator/tests. Maintainers keep the source map and exact internal
verification privately. This summary preserves the reviewed SDK boundary and
historical outcomes, not a production compatibility promise inferred from a
post-release implementation checkpoint around Holm `0.208.0`.

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
- app-overridable `realtime.max_channels_per_socket` has default `0`
  (unlimited); a typed private/presence subscription over a positive limit gets
  stable `realtime_policy_channel_limit_exceeded`, while a no-colon bare
  subscription returns before that policy check;
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

The app-scoped admin namespace is not uniformly guarded. Member/storage/audit
calls retain their operation-specific compound checks, but
`roles.remove`/`list`/`find` have only argument and database/app-context checks.
`roles.add` adds caller/capability checks only for selected reserved/elevated
role values; arbitrary app roles do not pass a blanket guard. Future SDK work
must preserve that runtime truth rather than presenting the manifest strings as
a guarantee, while any Holm hardening remains a separate owner decision.

Member storage also varies by owner context. Real-member and anonymous-owner
contexts install all three media methods (the anonymous methods reject use),
whereas the logged-out no-owner branch installs only login-required
`holm.app.member.media.serve`; `media.probe` and `media.transcode` are absent.

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

## Current contributor validation

```text
npm run check:public-privacy
npm run test:source
npm run release:check
```

The former internal parity validator is no longer part of public CI. Changes to
this SDK require versioned public behaviour evidence, deterministic fixtures and
a maintainer conformance verdict when a runtime contract is uncertain. Public
notes never contain internal source paths, provenance IDs or Go identifiers.

## Historical validation boundary

The original maintainer review distinguished implementation, fixture, design
and negative evidence. Later runtime changes did not silently expand the accepted
SDK support boundary or authorize new APIs. No Holm write occurred.

## Review status and stop gate

Independent Review
[`#072`](../../reviews/072_issue019_s4_non_http_parity/INDEX.md) requested
changes with `P1=0 P2=4 P3=1`. The mapping/tooling remediation now qualifies
operator role guards, records the typed-channel count policy and bare bypass,
fixes logged-out member-media availability, validates complete provenance and
the authority/status matrix, resolves the nearest release tag in pinned mode,
and directly hashes every Default Projection payload. Strict remediation RED
and focused GREEN are recorded in
[`test/evidence/issue019-s4-red.md`](../../../test/evidence/issue019-s4-red.md).
Focused `11/11`, 231 source tests, full `npm run ci`, diff hygiene, and fresh
pinned Holm verification pass. Independent Review
[`#073`](../../reviews/073_issue019_s4_non_http_parity_remediation/INDEX.md)
reproduced all seven prior defects against the old checkpoint, verified the
remediation and all nine payloads against pinned Holm `the Holm release tested…`, and approved
cumulative S4 range `c06f98f..f623a8c` with `P1=0 P2=0 P3=0`. S4 is accepted
and Issue `#019` is resolved at the mapping-only boundary.

The retained review summary records the historical S4 outcome. No public SDK source,
`dist/**`, version, release, publication, deployment, Holm, Medialab, or `@zyt`
change is authorized here. WebSocket transport, direct Sobek capabilities,
capability discovery, action helpers, and architecture amendments each require
a separately activated slice with fresh RED evidence.
