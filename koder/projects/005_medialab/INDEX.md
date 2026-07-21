---
name: Medialab
status: live-owner-testing
role: active-web-consumer-and-dogfood-target
updated: 2026-07-21
local_path: ~/Projects/zyt/medialab
remote: git@github.com:jikkuatwork/zyt.git
branch: main
verified_commit: ac12e76dec1eaaeb43a710a4d26d9fec463a5530
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
  `medialab.zyt.app` with 14 files and SPA routing.
- Root, hashed JavaScript, and `/gallery` return HTTP 200; owner interactive
  auth/generation/edit acceptance is pending.
- Zyt `main` is synchronized through deployment record commit `ac12e76`.

## Agent policy

- Read-only from SDK work unless the owner explicitly authorizes another Zyt
  write window.
- Follow `~/Projects/zyt/AGENTS.md`; preserve unrelated mono-repo work.
- Never use SQL as a migration shortcut.
- Further Zyt writes or Medialab deployments require separate explicit scope.
- During owner acceptance, verify browser auth/API behavior, generation refresh,
  edit-upload MIME, host binding, and rollback through the app's reviewed
  process.
