---
issue: 017
type: holm-authority-acceptance
verdict: accepted
sdk_product_head: dc4af0d924c5a9b8e7989e924e0046dd5bcb0b38
sdk_review_head: 59614d517bbe71ad12c6c56aad58bf54a5b746ac
holm_commit: 748cbe5e8f673d9a5a3d276e6826eecac32b8612
holm_version: 0.185.1
p1: 0
p2: 0
p3: 0
reviewer: pi-holm-authority
model: api-coding-assistant
date: 2026-07-17
---

# Review 059: Issue 017 Holm-authority acceptance

## Scope

Fresh read-only Holm protocol/conformance acceptance for the private
`0.1.0-rc.1` v0.1-web SDK release-candidate state. The reviewed SDK product
candidate is `dc4af0d924c5a9b8e7989e924e0046dd5bcb0b38`; the current SDK head at
review start was `59614d517bbe71ad12c6c56aad58bf54a5b746ac`, containing the
independent integrated SDK Review `#058`, which approved the same product
candidate with `P1=0 P2=0 P3=0`.

This review did not fix SDK product code, mutate Holm, run Holm builds/tests,
checkout/reset/stash Holm, push, tag, publish, release, deploy, use credentials,
start a pilot, or mutate cloud/production state.

## Verdict

**Accepted.** Counts: **P1=0, P2=0, P3=0**.

No Holm-authority findings were identified. The SDK RC can be accepted against
the live Holm authority inspected below without requiring a Holm repository
change. Stop-before-pilot/release remains in force.

## Live Holm authority evidence

Holm checkout: `/home/glasscube/Projects/holmhq/holm/master`.

Pre-review fingerprint:

```text
HEAD:    748cbe5e8f673d9a5a3d276e6826eecac32b8612
branch:  master
describe: v0.185.1-1-g748cbe5e
version: 0.185.1
status:  clean (`git status --short --untracked-files=all` printed no paths)
```

Post-review fingerprint was identical:

```text
HEAD:    748cbe5e8f673d9a5a3d276e6826eecac32b8612
branch:  master
describe: v0.185.1-1-g748cbe5e
version: 0.185.1
status:  clean (`git status --short --untracked-files=all` printed no paths)
```

No pre-existing dirty Holm paths were present, and none changed.

Mapped Holm paths inspected included:

- `koder/issues/534_contract_first_holm_apps/INDEX.md` — live canonical
  contract-first app direction superseding `#486`.
- `koder/proposals/001_universal_app_runtime/INDEX.md`,
  `koder/issues/486_universal_app_runtime_extraction_map/INDEX.md`,
  `koder/issues/085_holm_protocol/INDEX.md`, and
  `koder/issues/485_node_lite_framework_compatibility_probe/INDEX.md`.
- Current app/runtime/server paths: `cmd/server/main.go`,
  `cmd/server/app_request.go`, `internal/hosting/handler.go`,
  `internal/handlers/deploy.go`, `internal/hosting/deploy.go`,
  `internal/hosting/deploy_validation.go`, `internal/runtime/handler.go`,
  `internal/runtime/runtime.go`, `internal/runtime/auth_bindings.go`,
  `internal/runtime/proxy_response.go`, `internal/runtime/holm.go`,
  `internal/storage/app_bindings.go`, `internal/hosting/realtime.go`, and
  `internal/hosting/ws.go`.
- Current Holm SDK/state sources and docs routed by `HOLM_SOURCE_MAP.md`:
  `packages/holm-sdk/{index.js,entry.js,client.js,cache.js,app.js,runtime.js,errors.js,app.audit.js,surface.audit.js,package.json,build.sh}`,
  `packages/holm-state/src/{index.js,signals.js,remote.js,channel.js}`,
  `docs/concepts/sdk.md`, `docs/reference/sdk.md`,
  `knowledge-base/skills/app/SKILL.md`,
  `knowledge-base/skills/app/references/client-primitives.md`,
  `knowledge-base/workflows/holm-sdk/{caching.md,distribution.md,extending.md}`,
  and `knowledge-base/skills/app/references/multiplayer-patterns.md`.

## SDK evidence inspected

SDK paths inspected included `AGENTS.md`, `koder/docs/HOLM_SOURCE_MAP.md`, Issue
`#017`, Plan `004_S08`, Review `#058`, `package.json`, `README.md`,
`docs/v0.1-web-rc.md`, `examples/README.md`, `dist/manifest.json`,
`test/fixtures/stable-api-manifest.json`, generated BFBB bundle
`dist/holm.js`, and representative source for app HTTP/auth/upload, caller
identity, transport request/response/sensitivity/cache, web runtime/caller,
state resources/queries, Node/Sobek preview labels, and bridge reserved labels.

Read-only SDK validation commands run in this authority session:

| Command | Exit | Evidence |
| --- | ---: | --- |
| `npm run test:stable-api` | 0 | Stable API drift check passed for `7` stable entry points. |
| `npm run test:rc-docs` | 0 | RC docs/metadata check passed for private `0.1.0-rc.1`. |
| `git diff --exit-code --stat` | 0 | No source/generated drift before this acceptance artifact. |
| `node - <<'NODE' ... dist/manifest.json summary ... NODE` | 0 | Manifest schema `holm.sdk.dist-manifest/1`, package `private: true`, `232` artifacts, and both BFBB bundles record immutable-SHA/reviewed-tag policy, `runtimeCdnRequired: false`, and unavailable runtime exclusions. |

## Criteria disposition

### Holm runtime/protocol authority and GET/POST wire

Accepted. Holm `#534` pins `GET` as observation/query, `POST` as commands/state
transitions/side effects, and `api/main.js` as the future route/schema/handler
registry. The SDK RC does not redefine this authority. Its stable app/web helper
surface transports Holm app HTTP requests through `holm.http.app` operations and
the web runtime ultimately uses Fetch against app paths; operation envelopes are
SDK-internal adapter mechanics, not a new canonical Holm app wire protocol.
Docs explicitly state that Holm app wire behavior remains GET/POST.

### Caller identity, auth/token sensitivity, validation, response/error, state, and request IDs

Accepted. Holm live runtime resolves caller/member identity server-side from
session/API-key/request context and exposes `holm.auth` / `holm.app.member.*`
under those resolved identities. The SDK keeps caller context explicit and
surface-dependent (`browser-session`, member/operator/agent/service, app/scope),
uses caller fingerprints for cache partitioning, and does not ask clients to
supply privileged Holm caller fields. Web session auth uses same-origin
credentials by default; bearer/header proofs stay private and are redacted in
diagnostics. URL/query/path/header/body sensitivity markers are explicit, with
header matching only as defense-in-depth.

Response/error handling remains compatible with current Holm JSON envelopes:
`{data, meta}` success payloads are unwrapped, `{error:{code,message,details}}`
and `/api/cmd` failure envelopes become `RemoteError`, and non-2xx statuses
preserve HTTP status in metadata/errors. Request IDs are SDK invocation/correlation
IDs and are validated for duplicate/terminal-window behavior in SDK tests; they
are not presented as Holm server authority.

### Stable API/export/runtime isolation

Accepted. Stable/frozen exports are exactly `@holmhq/sdk`, `/core`,
`/transports`, `/app`, `/web`, `/state`, and `/test`, enforced by the stable API
manifest. Core stays runtime-neutral. The RC does not expose direct SQLite,
server implementation ownership, universal UI DSL, self-HTTP fake authority,
admin support, generated CLI/action framework, framework bindings, CRDT engines,
realtime runtime support, arbitrary SSR, or production desktop/mobile runtime
claims.

### BFBB/static authored-root precedence and distribution

Accepted. Holm live static serving routes authored `/` to app `index.html`,
preserves static files, keeps SPA fallback optional, and routes `/api` to
serverless only when `api/main.js` exists. Holm `#534` further pins the permanent
zero-structure static floor and authored root `index.html` precedence over any
generated projection. SDK docs/examples/manifests preserve this: raw BFBB apps
vendor local ESM from an immutable Git SHA or reviewed tag, verify SHA-256 from
`dist/manifest.json`, never deploy from `@main`, and do not require a runtime
CDN, Node runtime, npm publication, tag, browser/vendor soak, or production
pilot proof.

### Node/Sobek preview and bridge reserved labels

Accepted. `@holmhq/sdk/node` and `@holmhq/sdk/sobek` are machine-labelled
`preview`, `not frozen`, and `not production`; they are not stable `0.1.x`
surfaces and are not included in BFBB bundle capabilities. `@holmhq/sdk/bridge`
is labelled `reserved`, desktop/mobile `unsupported`, and limited to mocks,
mailbox contracts, and service slots. This preserves Holm's Sobek/native-loop
boundary and message-passing preference without claiming production native
shells.

### Required Holm changes

None. The accepted SDK candidate is a private SDK code/artifact checkpoint and
does not require Holm implementation, source, docs, or repository changes before
W4 handoff.

## Findings

None. P3 is explicitly zero.

## Stop-before-pilot/release

This acceptance does not authorize real-app pilot, browser/vendor soak, package
publication, public release notes, push, tag, npm publish, GitHub release,
deploy, credentials, cloud/production mutation, or promotion to `0.1.0`. Those
remain future owner-present gates after the private RC handoff.
