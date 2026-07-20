---
status: changes_requested
reviewer: pi/gpt-5.5
date: 2026-07-20
base_commit: 3f93cc8f02f0fb36661294b8a2fd1826d36d7cee
target_commit: 291fdaf7a617888ef6170545c87e5c3632472686
range: 3f93cc8..291fdaf
---

# Independent SDK review: Issue #008 / `@holmhq/sdk` 0.2 admin preview

Verdict: changes requested. P1=1 P2=0 P3=0.

## Findings

### P1 — Admin upload methods execute upload side effects before the operator caller gate

- Evidence: `src/admin/client.ts:69-73` dispatches `upload` and
  `composite-upload` descriptors to the upload path instead of the admin HTTP
  request path. `src/admin/client.ts:114-128` then calls the injected
  `uploads.upload(...)` at line 126 before the only admin-runtime invocation,
  `http.invalidateCache()`, at line 127. The two-step member-picture helper
  inherits the same ordering at `src/admin/client.ts:137-145`.
- The explicit web/Node operator checks live inside runtime invocation:
  `src/web/runtime.ts:348-373` and `src/node/runtime.ts:394-419`. Because the
  upload service is called before `http.invalidateCache()`, those guards run
  only after the injected upload service has already had a chance to perform
  network I/O or other side effects.
- Concrete failure mode: a non-operator caller context can call
  `admin.deploy.upload`, `admin.apps.deploy`, `admin.links.import`,
  `admin.members.uploadPicture`, or the upload phase of
  `admin.members.createNativeWithPicture`; if the supplied upload service uses
  an operator token/session or any other side-effecting transport, the SDK has
  already started the privileged upload before rejecting with the promised
  `UnsupportedCapabilityError`. The targeted proof command returned
  `{"uploadCalls":1,"name":"UnsupportedCapabilityError",...}` for a web
  member caller.
- Why this blocks release: the candidate and docs promise explicit operator
  caller checks before web/Node admin network I/O. Normal admin requests satisfy
  that property; upload/composite-upload methods do not. Holm remains the final
  server authority, but the SDK's fail-closed client boundary and caller/auth
  partitioning are not consistently enforced for the highest-risk admin routes.
- Required remediation: run an operator/capability guard before invoking any
  `AdminUploadService`, or route admin uploads through an adapter boundary that
  applies the same caller/auth check before upload side effects. Add web and
  Node/non-operator upload tests that assert the upload service is not called.

## Boundary assessment

- API and ledger: the committed generator and source inspection represent the
  174 supported ledger keys, 189 route/method contracts, 216 generated method
  paths, and 18 exclusions deterministically. I did not find a silent claim of
  excluded routes.
- Route mechanics: path substitution, route selection, URL helpers, command
  prefixes, binary attachment parsing, cancellation/timeout forwarding, and
  shared response error handling are covered by source tests and the generator
  check. The upload ordering issue above is the material fail-closed defect.
- Security/isolation: normal web and Node admin requests reject non-operator
  caller contexts before fetch/auth application. Auth proof stays adapter-private
  and cache keys include caller and auth partitions. Upload methods bypass that
  preflight until after upload side effects, so the security boundary is not
  release-ready.
- Universal core: admin/core source is compiled under the ES-only core tsconfig;
  runtime-specific globals remain in explicit web/node subpaths.
- Public declarations: `@holmhq/sdk/admin` exposes the preview status,
  generated method-name union, path-parameter requirements, URL helper return
  types, upload input requirement, and immutable descriptors. Stable root/web
  graphs remain isolated; `holm-web.js` excludes admin.
- Generated/package/release: `dist/admin`, BFBB bundle composition,
  size/license/manifest coverage, package allowlist, installed-package import
  smoke, and prepublish gate wiring are present and validated by the allowed
  package test. Release should still stop until the P1 is fixed and regenerated
  source/dist artifacts are revalidated.
- Docs: release/admin docs correctly state preview status, explicit operator
  caller composition, adapter-private auth, legacy Holm package preservation,
  immutable distribution, and final review/Holm-authority gates. The upload
  guard finding makes those security claims untrue for upload methods today.

## Commands

- `git status --short --untracked-files=all` — exit 0; clean before review
  artifact write.
- `git rev-parse HEAD` — exit 0; `291fdaf7a617888ef6170545c87e5c3632472686`.
- `git diff --check 3f93cc8..291fdaf` — exit 0.
- `npm run test:admin-api` — exit 0.
- `npm run test:package` — exit 0.
- `node --input-type=module --eval '<non-operator web admin upload proof>'` —
  exit 0; showed `uploadCalls: 1` before `UnsupportedCapabilityError`.

## Gate recommendation

Do not approve or release exact target
`291fdaf7a617888ef6170545c87e5c3632472686`. Stop for remediation of the upload
preflight gap, regenerate affected source/dist artifacts, rerun the admin and
package gates, and obtain a fresh independent SDK review before Holm-authority
acceptance and publication.
