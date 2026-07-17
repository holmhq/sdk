---
updated_at: "17 Jul 2026 | evening IST"
state: IN_PROGRESS
active_window: "W5 — sokoban pilot built and verified; trimmed Issue #015 remains"
active_issue: "015 (trimmed); pilot evidence recorded in koder/evidence/001"
orchestration_mode: "direct owner-present; queues/blind mode retired for this phase"
stop_gate: "no push/tag/publish/release/deploy/credentials/cloud; 0.1.0 promotion only after owner accepts pilot"
---

# Koder State

## Past

- W1–W4 completed Issues `#016`, `#007`, `#009`, `#014`, `#017`; product
  checkpoint `dc4af0d` is private `0.1.0-rc.1` with reviewed deterministic
  `dist/` artifacts (Reviews `#058`/`#059`, Holm `748cbe5`).
- 2026-07-17: owner accepted the RC, adopted slim-process defaults, deferred
  Issues `#008`/`#010`–`#013`, trimmed `#015` (commit `f288534`).
- W5 pilot built the same day: a complete Sokoban game (auth + leaderboard,
  tetris house style) at `~/Projects/zyt/sokoban`, consuming the SDK via 232
  vendored hash-verified artifacts pinned to `cbba269`.

## Present

- Pilot verified end-to-end on an isolated local Holm `0.185.1` instance
  (`sokoban.localhost:4699`, DB `~/.holm-sokoban-pilot/data.db`): real-browser
  boot with zero console errors, auth session via SDK `auth.me()`, leaderboard
  query resource with live snapshot re-render, mutation submit with
  invalidate→refresh, guest daily rail. Evidence:
  `koder/evidence/001_sokoban_web_pilot/INDEX.md`; screenshots in the app repo.
- Four upstream-worthy findings recorded there (Holm dev-login gate defect,
  logout-redirect behaviour, auth-transition cache invalidation doc need,
  deploy/route rebind behaviour).
- The sokoban app is uncommitted work inside the owner's `~/Projects/zyt` git
  repo — left for the owner to commit with their conventions. The zyt CLI's
  default peer is production `zyt.app`; the pilot deployed only via the
  explicit `@pilot` local peer.

## Future

1. Owner-directed production hosting is done: `https://sokoban.zyt.app`
   (game app with pinned vendored SDK; the npm package stays private).
   Owner plays and files gaps if any.
2. Trimmed `#015`: README, migration ledger, capability matrix, vendoring
   guide (fold in pilot findings 2–4), vanilla + React examples — the sokoban
   app can serve as the vanilla evidence.
3. Owner-present decision on promotion to `0.1.0` (rebuild/revalidate first);
   push/tag/publish/release remain separately gated. Optionally file the Holm
   dev-login issue upstream (Holm repo write needs separate approval).
