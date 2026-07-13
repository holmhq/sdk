# Close Index

Use this index as the first loaded reference for this skill. Render the final hand-off with `FORMAT.md`.

# Close Session

Use this skill at the end of a work session. A close is complete only when every intentional change is committed and the working tree plus index are clean. Do not claim success while `git status --porcelain=v1 --untracked-files=all` prints anything.

## Workflow

0. Read `koder/STATE.md` and, when present, `koder/docs/EXECUTION.md`. Identify the active autonomous window and stop gate. A close may record that the gate is ready for review or blocked; it must not activate or begin the next window.
1. Establish the repository root and inspect the complete delta, including staged, unstaged, and untracked work:
   ```bash
   git status --short --untracked-files=all
   git diff HEAD --stat
   git diff HEAD
   git diff --cached --name-only
   git ls-files --others --exclude-standard
   ```
   If this is not a Git repository, initialize it only when the user has asked to use the koder pattern or otherwise approved repository initialization.
2. Review every changed path before committing. Check implementation, docs, tests, deleted files, permissions, and untracked files. Inspect for secrets, credentials, private payloads, generated output, caches, and unrelated work. Never use `git add -A` blindly.
3. Run the repository's relevant tests, linters, formatters, validators, and `git diff --check`. Record failures honestly. Do not commit code that is known incomplete or unreviewed merely to make the status green.
4. Commit all reviewed, intentional work in logical commits. Stage selected paths only. If unrelated or unknown dirty work exists, stop and ask rather than absorbing it or deleting it. A successful close must not strand reviewed work.
5. Refresh `koder/STATE.md` with the India-time timestamp. If the active stop gate was reached, set frontmatter `state: REVIEW_READY`, keep the current window/issue, and name the exact review required. If blocked, set `state: BLOCKED`. Never mark the next window active during close:
   ```bash
   TZ='Asia/Kolkata' date '+%d %b %Y | %I:%M %p IST'
   ```
   Keep it under 100 lines and update its Past/Present/Future hand-off. The hand-off change itself must be included in a grepable commit with subject `state: close - <semantic result>` and the commit body must name `State file: koder/STATE.md`, the session result, delta, and validation.
6. Re-run the final review after the state commit:
   ```bash
   wc -l koder/STATE.md
   git diff --check
   git status --short --untracked-files=all
   git diff --cached --name-only
   git log --grep='^state:' --oneline -5
   ```
7. Render `FORMAT.md` only after the final status check. Use `Git clean` only when both the index and working tree are empty. Report upstream ahead/behind separately; do not push or rewrite history unless the repository instructions or the user explicitly require it.

## Completion invariant

- **Clean close:** no output from `git status --porcelain=v1 --untracked-files=all`; all intended work is in commits; `koder/STATE.md` is current and under 100 lines; validation results are reported.
- **Blocked close:** if any path is unknown, unsafe, incomplete, unreviewed, or cannot be committed safely, do not pretend the session closed. Render `Session Close Blocked`, list exact paths and the reason, and name the next action.
- A pre-existing dirty tree is not an excuse to skip the final check. Either review and commit the intentional paths, or leave the close explicitly blocked.

## Rules

- Preserve unrelated dirty/staged work; never reset, discard, force-push, or overwrite it to manufacture cleanliness.
- Never commit secrets, credentials, caches, build outputs, or private data.
- Do not commit failed or incomplete implementation work just to satisfy the clean-state invariant; ask for a decision when needed.
- Every intentional `koder/` state transition gets a `state:` commit by default.
- Honor `koder/docs/EXECUTION.md`: do not continue into a review-gated issue/window merely because time or context remains.
- If a user explicitly says not to commit, report the resulting dirty paths and mark the close blocked rather than claiming a clean close.
