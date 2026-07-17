---
title: Sokoban real-app pilot — v0.1-web SDK evidence
created: 2026-07-17
window: W5
sdk_version: 0.1.0-rc.1
sdk_pin_commit: cbba269df081007247dd4f558b144c15179265b2
holm_runtime: 0.185.1 (local instance, domain localhost, port 4699)
app: ~/Projects/zyt/sokoban (Holm app `sokoban`, host sokoban.localhost:4699)
---

# Sokoban Web Pilot — Evidence

First real application consuming `@holmhq/sdk` v0.1-web outside the SDK's own
fixtures: a complete Sokoban game (11 machine-verified levels, auth,
leaderboard) in the zyt house style, served by a local Holm 0.185.1 instance.

## What the pilot exercised

- **Vendoring contract** — all 232 `dist/` artifacts copied and SHA-256
  verified against `dist/manifest.json`; pin recorded
  (`vendor/holm-sdk.pin.json`); refusal on dirty dist. The documented
  "vendor `holm.js` alone" snippet is insufficient (relative module graph);
  the S06 whole-tree layout is what works, as the fixture already implied.
- **Web surface** — `createWebApp` with a shared `createWebCaller`; ambient
  same-origin base URL; cookie session default. Booted in real Chromium with
  zero console errors or warnings.
- **Auth surface** — `app.auth.me()` session probe (guest and signed-in),
  `loginHref()` composition with the platform embed params, `logout()`.
  Sessions created via operator simplelogin were correctly reflected through
  the SDK transport.
- **State surface** — `createQueryResource` (leaderboard) with
  `refresh()/getSnapshot()/subscribe()` driving live UI re-render, and
  `createMutationResource` (score submit) with invalidate → forced refresh.
  Envelope passthrough (plain-JSON API responses) worked as specified.
- **HTTP caching interaction** — GET cache is caller+auth partitioned; auth
  transitions (iframe sign-in, logout) are SDK-invisible, so the app calls
  `app.http.invalidateCache()` on them. This is a real integration
  requirement that should be documented in #015's guides.

## Observed behaviours (browser, headless Chromium via Playwright)

- Boot → idle overlay, level 1 solve (+1,000, par badge), guest submit landed
  on the daily rail, toast shown. Screenshots in the app repo
  (`docs/screenshots/`).
- Signed-in submit: keep-best semantics confirmed (improved true/false), rank
  and me-pin resolution correct, leaderboard drawer rendered SDK query data in
  light and dark themes.
- Server-side contract verified over curl as well: member submit, lower-score
  keep-best, guest rate-limited daily rail, `?guest=` me-resolution.

## Findings worth upstreaming

1. **Holm dev login is unreachable on a real local server** (0.185.1): startup
   rewrites the auth domain to `holm.localhost`/nip.io, which fails
   `devLoginExplicitlyEnabled`'s loopback-host gate, so
   `HOLM_ENABLE_DEV_LOGIN=1` never registers `/auth/dev/*`. The
   knowledge-base claim that dev login is "automatic locally" is stale.
   Workarounds used: operator simplelogin; anonymous members policy exists as
   an alternative. → candidate Holm issue (read-only here; not filed).
2. **SDK `auth.logout()` vs Holm's 307-to-login answer**: the transport
   follows the redirect and the re-issued request can fail even though the
   cookie was cleared. Apps must treat logout errors as success. → candidate
   #015 doc note or small SDK affordance later.
3. **Auth-transition cache invalidation** (above) — document in #015.
4. `holm app deploy --force` creates a new app id each time and leaves the
   host route on the old id; route must be moved with `holm host update`.
   Platform behaviour, worth noting in the vendoring/operations guide.

## Boundaries respected

- Nothing pushed, tagged, published, released, or deployed beyond the local
  pilot instance. The CLI's *default* peer is production `zyt.app` — deploys
  were made only via the explicit `@pilot` peer to the isolated local
  instance (`~/.holm-sokoban-pilot/data.db`). Holm repo untouched.
