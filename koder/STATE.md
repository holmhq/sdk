---
updated_at: "21 Jul 2026 | 06:36 PM IST"
state: READY
active_window: "none; release automation ready and awaiting genuine product demand"
active_issue: "none"
orchestration_mode: "direct; no queue or blind run active"
stop_gate: "before the next genuine release, re-confirm npm lockout and complete exact-target review, authority, and release gates"
---

# Koder State

## Past

- W1–W5 delivered stable web/BFBB, framework-neutral state, runtime adapters,
  reproducible artifacts, docs, and public `@holmhq/sdk@0.1.0`.
- W6 delivered the audited preview admin/operator client and public `0.2.0`;
  Reviews `#063` and `#064` accepted the remediated SDK/Holm boundaries.
- Genuine `v0.2.1` proved npm OIDC identity in workflow run `29773856653`.
  The old publish token is revoked and local npm CLI auth remains removed.
- Commit `2352321` adds a no-development-dependency Node 20 CI consumer gate for
  the tracked distribution and packed package; independent review approved it
  with `P1=0 P2=0 P3=0`.

## Present

- `@holmhq/sdk@0.2.1` remains public, verified, and immutable on npm/GitHub.
- Commit `246ab34` provides one protected workflow and one owner action: approve
  `npm-release`; the unified direct npm plus GitHub path remains pending proof
  by the next genuine release.
- Security Review `#068` has no unresolved findings. Fresh `release:check` is
  green: 230 source tests, 25 dist tests, changed-reachable coverage `100.00`,
  and size `296327` raw / `226159` minified / `58504` gzip.
- GitHub hardening remains complete. The owner reports npm trust is
  **`npm publish` only** and **Require two-factor authentication and disallow
  tokens** appears persisted. Treat configuration as ready, with a mandatory
  browser recheck before the next genuine release dispatch.
- Owner-authorized Medialab adoption is live at `medialab.zyt.app` from pushed
  Zyt commit `fe81675`: exact `0.2.1`, 10 adapter tests, syntax/Vite/MIME gates,
  and independent review are green with `P1=0 P2=0 P3=0`. Follow-up `b0c8f10`
  adds a browser-valid manifest and is deployed with 15 files.
- Owner retest on Holm `0.185.7` reproduced a distinct platform boundary. One
  controlled 15-image parallel batch yielded 10 app-auth responses and 5
  retryable `503`s with exact reason `runtime_vm_pool`; pressure/governor stayed
  `ok`, pool capacity was 3, and misses rose 25→30. The browser cannot consume
  the JSON retry contract for `<img>` fan-out. No app workaround or SDK change
  was added.
- No dummy SDK version, SDK workflow dispatch, or package release occurred.

## Future

1. Wait for real product demand and an owner-approved release scope; do not
   manufacture a package merely to exercise release plumbing.
2. At the next genuine release, use `koder/skills/npm-release/`, re-confirm the
   npm lockout in the UI, complete exact-target review and Holm acceptance, and
   require one accountable `npm-release` approval with no skipped decision.
3. Medialab owner acceptance is blocked on Holm runtime-pool fan-out. Obtain
   explicit authorization to file/fix a Holm issue (or reopen `#510`/`#529`);
   do not throttle/retry around it in the app or migrate another app yet.
