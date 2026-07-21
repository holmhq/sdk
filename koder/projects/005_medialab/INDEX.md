---
name: Medialab
status: migration-reviewed-not-deployed
role: active-web-consumer-and-dogfood-target
updated: 2026-07-21
local_path: ~/Projects/zyt/medialab
remote: git@github.com:jikkuatwork/zyt.git
branch: main
verified_commit: fe816757ab8fe2df7d060be60a9206bbd182a152
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

- Local Zyt commit `fe81675` contains the migration and removes the copied SDK.
- Ten adapter tests, syntax checks, a clean temporary Vite bundle, and an
  installed-package multipart fallback smoke pass.
- Independent integrated review approved with `P1=0 P2=0 P3=0`.
- The Zyt commit is one ahead of its upstream and has not been pushed.
- Medialab has not been deployed from this migration.

## Agent policy

- Read-only from SDK work unless the owner explicitly authorizes another Zyt
  write window.
- Follow `~/Projects/zyt/AGENTS.md`; preserve unrelated mono-repo work.
- Never use SQL as a migration shortcut.
- A Zyt push and any Medialab deployment require separate explicit approval.
- At cutover, verify exact package identity, browser auth/API behavior, upload
  MIME, host binding, and rollback through the app's normal reviewed process.
