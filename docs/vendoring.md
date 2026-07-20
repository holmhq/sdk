# Vendoring and updating the Holm SDK

BFBB apps can use `@holmhq/sdk` without a package manager or public CDN at
runtime. The preparation step copies the whole `dist/` tree into the app,
verifies it, and records an immutable source. Copying only `holm.js` does not
work: it imports a relative ESM module graph.

## Choose an immutable source

Use one of:

- the immutable npm version `@holmhq/sdk@0.2.1`;
- an immutable Git SHA; or
- the reviewed Git tag `v0.2.1`.

Use an immutable Git SHA or reviewed tag for Git/CDN addresses. Never use `@main`
for a deployed app. A branch can move after review and invalidate both
the evidence and rollback path.

## Copy from npm

This uses npm only while preparing the app. The deployed app serves local
files.

```bash
set -eu
SDK_VERSION=0.2.1
TMP="$(mktemp -d)"
TARBALL="$(cd "$TMP" && npm pack "@holmhq/sdk@${SDK_VERSION}" --silent)"
tar -xzf "$TMP/$TARBALL" -C "$TMP"
rm -rf vendor/holm-sdk
mkdir -p vendor
cp -R "$TMP/package/dist" vendor/holm-sdk
printf '%s\n' "$SDK_VERSION" > vendor/holm-sdk.version
rm -rf "$TMP"
```

For a Git source, check out the SHA or reviewed tag in a temporary directory
and copy its tracked `dist/` directory in the same way. A jsDelivr URL may be a
download source for an individually verified file, but BFBB composition still
needs the complete relative module tree and must not depend on the CDN at
runtime.

## Verify every artifact

`dist/manifest.json` contains the SHA-256 and byte count for every generated
artifact except the generated reports themselves. Run this after copying:

```bash
node --input-type=module - vendor/holm-sdk <<'NODE'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.argv[2]
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'))
for (const artifact of manifest.artifacts) {
  const relative = artifact.path.replace(/^dist\//, '')
  const bytes = readFileSync(join(root, relative))
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (sha256 !== artifact.sha256 || bytes.byteLength !== artifact.bytes) {
    throw new Error(`Integrity mismatch: ${relative}`)
  }
}
console.log(`Verified ${manifest.artifacts.length} Holm SDK artifacts`)
NODE
```

Record the version/ref and the manifest hash next to the vendored tree:

```bash
sha256sum vendor/holm-sdk/manifest.json > vendor/holm-sdk.manifest.sha256
```

A useful app pin records `{ version, gitRef, manifestSha256 }`; the production
Sokoban pilot additionally refuses to accept a dirty source `dist/` tree.

## Import the local composition

```js
import { createWebApp } from './vendor/holm-sdk/holm-web.js'

const holm = createWebApp()
const member = await holm.app.auth.me()
```

Use `holm.js` when the preview admin namespace and stable test helpers are
intentionally wanted in the BFBB composition; use the narrower `holm-web.js`
for normal app code.

## Update checklist

1. Read the target release notes and capability matrix.
2. Fetch the exact npm version, immutable Git SHA, or reviewed tag.
3. Replace the entire vendored tree and pin metadata together.
4. Verify every manifest entry and the saved manifest checksum.
5. Run the app's static/build tests and a real-browser auth/API smoke test.
6. Review auth transitions, console output, and any size delta.
7. Commit the vendored files, pin, and app changes as one update.

### Auth and cache transitions

An iframe login, external redirect, or logout cookie change can happen outside
the SDK caller provider. After the transition, call:

```js
await holm.app.http.invalidateCache()
await sessionResource.refresh({ force: true, reason: 'auth-transition' })
```

Some Holm versions clear the cookie and then redirect the logout request; the
followed request may fail even though logout succeeded. Put `invalidateCache()`
and session refresh in cleanup/finally logic, then trust the new session probe
rather than the redirect-follow error by itself. The shared example contract
implements this pattern.

### Deploy and host route check

A forced Holm app deployment can create a new app id while an existing host
route still points to the old id. After deploy, inspect the live host binding
and use `holm host update` with the intended app id when necessary. This is a
Holm operator step, not an SDK API, but it prevents a correct vendored update
from appearing absent in production.

## Rollback

Rollback is an app change, not a fetch from a mutable branch:

1. restore the previous complete vendor directory, version/ref pin, and
   manifest checksum (normally by reverting the vendoring commit);
2. run the integrity verifier;
3. run the app smoke tests; and
4. redeploy the restored app through its normal reviewed process.

Do not mix files from two SDK versions. Relative imports can appear to work
while declarations, maps, or secondary entry points silently drift.
