# Admin and operator client

`@holmhq/sdk/admin` is the preview operator surface introduced in `0.2.0`. It
covers all 216 methods in Holm's audited admin inventory through 189 HTTP
route/method contracts, while keeping credentials inside runtime adapters and
requiring an explicit operator caller context.

Preview describes compatibility maturity, not a reduced quality gate. The
entry point is built, typed, packaged, size-checked, and conformance-tested, but
its standardized operation-input shape may evolve from operator feedback.
Existing stable web entry points are unaffected.

## Security model

An admin method does not grant authority. Three pieces remain distinct:

1. `CallerProvider` supplies explicit, non-secret operator context for cache,
   diagnostics, and invocation isolation.
2. The runtime adapter applies private auth proof such as a bearer token or a
   same-origin operator session.
3. Holm authenticates and authorizes every route. Client-supplied `operator`
   context is never proof the server trusts.

Keep authentication tokens in adapter auth, never in caller context. A route
that inherently manages a secret (for example peer-token rotation) may carry it
only in that operation's body; never copy such payloads into diagnostics,
durable logs, cache identity, examples, or committed fixtures. Use transport
sensitivity metadata for signed or otherwise sensitive route/query values.

## Node/operator composition

The universal factory is `createAdminClient({ runtime, caller })`; both values
are mandatory. Node and the admin capability are preview. Inject fetch and auth explicitly;
there is no ambient token lookup:

```ts
import { createAdminClient } from '@holmhq/sdk/admin'
import {
  createNodeOperatorCaller,
  createNodeTokenAuth,
  nodeRuntime,
} from '@holmhq/sdk/node'

const runtime = nodeRuntime({
  baseUrl: 'https://holm.example.com',
  fetch: globalThis.fetch,
  auth: createNodeTokenAuth({
    token: process.env.HOLM_TOKEN!,
    operatorId: 'release-operator',
  }),
})

const holm = createAdminClient({
  runtime,
  caller: createNodeOperatorCaller({ operatorId: 'release-operator' }),
})

try {
  const health = await holm.admin.system.health()
  const apps = await holm.admin.apps.list()
  console.log({ health, apps })
} finally {
  await holm.dispose()
}
```

Applications should inject secret-store or environment access at their own
boundary rather than copy the example's environment lookup into universal code.

## Web/operator composition

A browser operator session must still declare operator caller context explicitly:

```ts
import { createAdminClient } from '@holmhq/sdk/admin'
import { createWebCaller, webRuntime } from '@holmhq/sdk/web'

const holm = createAdminClient({
  runtime: webRuntime(),
  caller: createWebCaller({ principal: { kind: 'operator' } }),
})
```

The default browser-session caller is intentionally insufficient for admin
invocation. Holm remains the authorization boundary for the session.

## Standard operation input

Every generated method accepts one immutable operation object. The generated
declarations require audited path parameters and expose shared transport
controls:

```ts
const app = await holm.admin.apps.get({
  path: { id: 'app_123' },
})

await holm.admin.webhooks.create({
  body: {
    name: 'build-events',
    endpoint: 'https://hooks.example.com/holm',
  },
})

const logsUrl = holm.admin.logs.streamUrl({
  params: { lines: 100, follow: true },
})
```

Operation fields are:

- `path`: values for generated `{id}`, `{folder}`, or `{path...}` templates;
- `params`, `headers`, `body`, `responseMode`, and `timeoutMs`: shared transport
  controls;
- `sensitive`: structural redaction metadata;
- `control` and `reason`: cancellation/timeout and audit intent;
- `route`: an explicit source route when one compatibility name has multiple
  audited routes (currently `members.list`);
- `command`/`args`: command-gateway input; and
- `upload`: runtime-neutral upload files/fields for upload-capable methods.

The low-level `admin.invoke(name, input)` uses the same generated method-name
union. `admin.methodNames`, `admin.describe(name)`, and
`adminMethodDescriptors` expose immutable, source-pinned inventory metadata for
operator tooling and tests.

## Command gateway

Command helpers preserve Holm's canonical `POST /api/cmd` envelope. Prefixes are
generated deterministically:

```ts
await holm.admin.peer.list()
await holm.admin.peer.add({ args: ['backup', '--url', peerUrl, '--token', token] })
await holm.admin.system.cmd({ command: 'peer', args: ['check'] })
```

Command arguments are non-empty strings. Failed HTTP-200 command envelopes are
normalized through the shared `RemoteError` behavior.

## Uploads and binary responses

Admin core has no DOM or Node ambient upload type. Inject an `AdminUploadService`
that accepts the shared transport `UploadRequest`. Before invoking that service,
the SDK runs an admin-capability preflight through the selected runtime, so a
non-operator web or Node caller fails before any upload side effect. Web and Node
applications can adapt their existing upload services without putting `Blob`,
`FormData`, or filesystem APIs into the admin entry point.

The redesigned upload methods are `apps.deploy`, `deploy.upload`, `links.import`,
`members.uploadPicture`, and the two-step `members.createNativeWithPicture`.
Callers provide a prepared archive/file rather than asking universal core to
construct a ZIP or inspect a platform `Blob`.

`email.receiptAttachment` uses binary response mode and returns the parsed
filename, content type, and SDK `ReadonlyBytes` value.

## Authority and drift

The packaged inventory is generated from
`koder/evidence/004_issue008_admin_routes/route-audit.json`, pinned to an exact
Holm commit. `npm run test:admin-api` fails if generated declarations or route
metadata drift from that ledger. Refresh the ledger only after checking live,
read-only Holm route registrations and the legacy `packages/holm-sdk` audit.

The legacy Holm admin client remains live. `0.2.0` does not delete, redirect, or
deprecate it, and it does not imply that possessing the SDK or browser bundle
confers operator authorization.
