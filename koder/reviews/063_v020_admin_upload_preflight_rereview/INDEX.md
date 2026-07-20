---
status: approved
reviewer: pi/gpt-5.5 (harnex cx-cr-063)
date: 2026-07-20
base_commit: 291fdaf7a617888ef6170545c87e5c3632472686
target_commit: 96485b7d2922893efb3477cd174a3017e3de10ce
range: 291fdaf..96485b7
---

# Fresh SDK rereview: Review #062 upload-preflight remediation

Verdict: approved for exact target `96485b7d2922893efb3477cd174a3017e3de10ce`.
P1=0 P2=0 P3=1.
Review `#062`'s P1 is closed, with zero outstanding release blockers
(P1/P2=0). The one P3 is an advisory residual risk, not a release blocker.

## Finding disposition

- Prior P1, admin upload side effects before the operator caller gate: closed.
  `src/admin/client.ts` now calls `http.preflight("admin.upload.preflight")`
  before every direct upload; the member-picture composite path inherits the
  same `executeUpload` call before its create request.
- New P1/P2 findings: none.
- P3 advisory — client-side TOCTOU remains server-authorized: the SDK preflight
  proves the runtime capability and caller context at check time only. If a
  dynamic caller/auth source transitions after preflight but before the injected
  upload or post-upload cache invalidation, Holm/server authorization and the
  upload adapter's own auth handling remain the durable authority. I do not see
  a non-operator side effect in the remediated SDK path.

## Security and correctness assessment

- Non-operator web and Node behavior is covered by source test
  `admin upload services never run before web and Node operator caller gates`;
  the allowed `npm run test:source` run passed 230 tests. The generated-dist
  smoke test also exercises the web generated output and passed 24 dist tests.
- The preflight runs through `createAdminHttpClient(...).preflight()`, therefore
  `createHolm` starts the runtime, requires `holm.http.admin`, resolves the
  current caller, and enters the web/Node runtime `assertHttpOperation` before
  any injected `AdminUploadService.upload(...)` side effect.
- Web and Node runtimes accept `preflight` only for `holm.http.admin`; the
  operator caller check is still before the operation whitelist return, and the
  preflight branch returns before URL parsing, auth resolution, fetch, or cache
  mutation. App capability cannot use admin preflight, and unknown operations
  still fail for valid callers through the existing `ProtocolError` path.
- Successful operator upload behavior remains intact by inspection: after
  preflight, `executeUpload` calls the injected upload service and only then
  `http.invalidateCache()`. The all-method source inventory still exercises the
  upload and composite-upload descriptors.
- Normal admin request routes are not redirected through the new preflight path;
  request, raw/binary receipt attachment, command, URL helper, path validation,
  timeout/control, and malformed-operation tests continue to pass.
- No auth proof leak was introduced: preflight payload is `null`; non-operator
  web/Node rejection occurs before `applyTransportAuth`/fetch; token/session
  proof remains runtime-private.
- Generated artifacts match the source boundary: `dist/admin/{client,http,
  protocol,index}` export and use `ADMIN_HTTP_PREFLIGHT_OPERATION`,
  `dist/{web,node}/runtime.js` gate it, declaration files expose the new method
  and constant, and regenerated maps point back to the corresponding source
  files. Package export wiring for `./admin`, `dist/manifest.json`, and
  `dist/size-report.json` cover the affected artifacts and remain within budget.

## Commands and evidence

- `git status --short --untracked-files=all` — exit 0; clean before review
  artifact write.
- `git rev-parse HEAD` — exit 0;
  `96485b7d2922893efb3477cd174a3017e3de10ce`.
- `git rev-parse 291fdaf` — exit 0;
  `291fdaf7a617888ef6170545c87e5c3632472686`.
- `git merge-base --is-ancestor 291fdaf HEAD` — exit 0.
- `git diff --check 291fdaf..96485b7` — exit 0.
- `npm run test:source` — exit 0; 230/230 source tests passed.
- `npm run test:dist` — exit 0; 24/24 generated-dist tests passed.
- Boundary inspection command for source maps, package export, manifest, and
  size coverage — exit 0; all checked affected files were mapped, exported, in
  manifest/size reports, and under raw/gzip budgets.

## Exact-target gate recommendation

Accept exact target `96485b7d2922893efb3477cd174a3017e3de10ce` for the SDK
side of the Review `#062` remediation. Continue to the separate fresh read-only
Holm-authority acceptance and remaining release gates before any push, tag,
GitHub release, or npm publication.
