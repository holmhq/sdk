---
updated_at: "18 Jul 2026 | 12:02 AM IST"
state: IN_PROGRESS
active_window: "W5 — pilot shipped and production-hosted; trimmed Issue #015 remains"
active_issue: "015 (trimmed); pilot evidence in koder/evidence/001"
orchestration_mode: "direct owner-present; queues/blind mode retired for this phase"
stop_gate: "no SDK push/tag/npm publish/release; 0.1.0 promotion is a separate owner-present decision"
---

# Koder State

## Past

- W1–W4: Issues `#016`, `#007`, `#009`, `#014`, `#017` done; `dc4af0d` is
  private `0.1.0-rc.1` (Reviews `#058`/`#059`, Holm `748cbe5`).
- 2026-07-17: owner accepted the RC, adopted slim-process defaults, deferred
  `#008`/`#010`–`#013`, trimmed `#015` (`f288534`).
- W5 same day: sokoban pilot app built at `~/Projects/zyt/sokoban` (auth +
  leaderboard, tetris house style), consuming 232 vendored hash-verified SDK
  artifacts pinned to `cbba269`. Verified end-to-end in real Chromium on an
  isolated local Holm `0.185.1` — zero console errors. Evidence + four
  upstream-worthy findings: `koder/evidence/001_sokoban_web_pilot/INDEX.md`.
- Owner then directed production hosting: live at `https://sokoban.zyt.app`
  (`holm_app_R4ryNkZvbuLY`), with 19 solver-verified levels, contrast and
  dark-scheme fixes, and Enter/Backspace/Escape shortcuts. The `@holmhq/sdk`
  package itself remains private and unpublished.

## Present

- SDK repo clean; session commits `f288534`, `10d38fc`, `f2a3915` plus this
  close. Local `main` is ahead of upstream (push needs owner approval).
- The sokoban app is untracked (`?? sokoban/`) in the owner's
  `~/Projects/zyt` repo — owner to commit with their conventions.
- Local pilot Holm instance still running (port 4699, DB
  `~/.holm-sokoban-pilot/data.db`) — disposable once production suffices.

## Future

1. Trimmed `#015`: README, migration ledger, capability matrix, vendoring
   guide (fold in pilot findings 2–4: logout-redirect, auth-transition cache
   invalidation, deploy/route rebind), vanilla + React examples — sokoban
   serves as the vanilla evidence.
2. Owner-present decision on promotion to `0.1.0` (rebuild/revalidate first);
   SDK push/tag/publish/release remain separately gated.
3. Optional: file the Holm dev-login gate defect upstream (Holm repo write
   needs separate approval).
