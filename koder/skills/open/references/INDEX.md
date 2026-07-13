# Open Index

Use this index as the first loaded reference for this skill. Render the final hand-off with `FORMAT.md`.

# Open Session

Use this skill at the beginning of a work session in this repository. Opening is observational: do not modify files, start services, repair drift, or commit anything.

## Workflow

1. Locate the repository root from the current working directory.
2. Read `koder/STATE.md` completely before making changes. Treat it as the durable narrative hand-off.
3. When `koder/docs/EXECUTION.md` exists, read it completely and surface only the active autonomous window, its allowed scope, and its stop gate. Do not activate a future window or follow its linked source material during `open`.
4. When `koder/projects/INDEX.md` exists, read that index only (not every project card) and report the registry as context when it affects the active window.
5. Inspect live repository facts:
   ```bash
   git status --short --untracked-files=all
   git branch --show-current
   git log --oneline -5
   git rev-list --left-right --count @{u}...HEAD 2>/dev/null || true
   ```
   If this is not a Git repository, say so clearly and continue with the file-based hand-off.
6. Summarize the hand-off as **Past**, **Present**, and **Future**. Include dirty/staged/untracked paths, branch and upstream drift, when relevant. Render `state`, `active_window`, `active_issue`, and `stop_gate` from STATE frontmatter when present.
7. Render the response using `FORMAT.md`:
   - use `━━━` separators, not Markdown horizontal rules;
   - keep the stat block compact;
   - omit **Notes** when there is nothing that needs attention;
   - use inline code for paths, commits, and issue numbers;
   - finish with one judgment line and one suggested next action.
8. Ask what the user wants to do next unless they already gave a concrete task. When an active window exists, make the default suggestion the bounded window itself and explicitly include its stop condition.

## Output contract

The opening report should make it immediately obvious whether the repository is safe to start work in. Never describe a dirty repository as clean. If `koder/STATE.md` is missing, say so prominently and offer to create it; do not silently invent a hand-off.

## Rules

- Do not modify files as part of opening unless the user explicitly asks.
- Do not auto-repair dirty state, stale artifacts, services, remotes, or version drift.
- Do not dump secrets or private account details into the report.
- Prefer concise bullets over copied history; link to deeper artifacts by path instead of reading them speculatively.
- `open` grants no implementation permission by itself. It reports the active window from `EXECUTION.md`; the agent begins only after the user accepts the suggested action or already asked for that work.
- Never suggest continuing into the next issue/window when the active window has a review stop gate.
