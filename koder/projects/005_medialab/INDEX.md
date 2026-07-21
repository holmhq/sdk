---
name: Medialab
status: live-blocked-holm-runtime-pool
role: active-web-consumer-and-dogfood-target
updated: 2026-07-21
local_path: ~/Projects/zyt/medialab
remote: git@github.com:jikkuatwork/zyt.git
branch: main
verified_commit: b79d7044fda874a7e739e2021d8d07ecdab1e516
write_policy: explicit-authorization-only
---

# Project 005: Medialab

## Relationship

Medialab is an active Vite/Vue Holm app and the first external application to
migrate from a copied legacy `holm-sdk` client to immutable public
`@holmhq/sdk`. Its dogfood upload path exposed SDK Issue `#018`, which was fixed
and released in `0.2.1`.

## Contract surfaces

- Exact npm pin: `@holmhq/sdk@0.2.1`.
- Browser composition through `@holmhq/sdk/web` and one app-local adapter.
- App auth, HTTP, cache refresh, error compatibility, and structured edit upload.
- `/api/edit` requires `upload.jpg` to retain declared `image/jpeg` MIME.
- Medialab's custom `/_ws` generation transport remains application-owned; SDK
  realtime is not substituted.
- Backend `api/**` does not import the npm SDK.

## Current checkpoint

- Pushed Zyt commit `fe81675` contains the migration and removes the copied SDK.
- Ten adapter tests, syntax checks, a clean temporary Vite bundle, and an
  installed-package multipart fallback smoke pass.
- Independent integrated review approved with `P1=0 P2=0 P3=0`.
- Holm redeployed existing app `holm_app_fBb09CTIJsIJ` at
  `medialab.zyt.app`; follow-up `b0c8f10` adds an authored browser-valid
  manifest and the current deployment contains 15 files with SPA routing.
- Root, hashed JavaScript, `/gallery`, and `manifest.webmanifest` return HTTP
  200; the manifest has string `display: standalone` and correct MIME.
- On Holm `0.185.7`, one bounded 15-image parallel probe produced 10 app-auth
  responses and 5 retryable `503` envelopes with `reason: runtime_vm_pool`.
  Pressure/governor stayed `ok`, pool capacity was 3, and misses rose 25→30.
- Browser `<img>` fan-out cannot consume the JSON retry envelope; owner
  acceptance is blocked on Holm P1 design Track `#550`, not SDK code.
- Issue `#550` requires measured runtime memory, primary-source prior-art
  research, architecture convergence, and small/large-node proof before code.
- Zyt `main` records the cross-repo handoff through commit `b79d704`.

## Agent policy

- Read-only from SDK work unless the owner explicitly authorizes another Zyt
  write window.
- Follow `~/Projects/zyt/AGENTS.md`; preserve unrelated mono-repo work.
- Never use SQL as a migration shortcut.
- Further Zyt writes or Medialab deployments require separate explicit scope.
- Do not add app retries or concurrency throttles to hide `runtime_vm_pool`.
  Follow Holm `#550` through its research/design gate before implementation,
  then resume browser auth/generation/edit acceptance.
