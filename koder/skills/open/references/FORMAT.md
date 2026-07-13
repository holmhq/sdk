# Open Output Format

Render this as plain text, not a fenced code block:

Session Opened: **<repository>**

━━━
Branch        `<branch>`
Git           `clean` or `dirty — <count> path(s)`
Sync          `✔` or `✘ <ahead/behind detail>`
Last Session  `<timestamp>` (`<time ago>`)
Commits       `<total>` total · `<since hand-off>` since hand-off
State         `<READY | IN_PROGRESS | BLOCKED | unknown>`

━━━
**Notes** (optional — only when something needs attention)
- <short warning, dirty path summary, or missing hand-off>

━━━
**Past**
- <durable completed work from STATE.md>

**Present**
- <current state and important caveat>

**Future**
- <next likely task or risk>

━━━
*<one-line judgment about the project's current position>*
*<suggested next action, phrased so typing "yes" is enough>*

## Rendering rules

- Use `━━━` as the separator; do not use `---`.
- Keep the stat block compact and aligned. Omit fields whose facts are unavailable rather than inventing values.
- Use inline code for branches, commits, issue numbers, and file paths.
- Omit **Notes** when the tree is clean, upstream is synchronized, and the hand-off has no warning.
- **Past**, **Present**, and **Future** come from `koder/STATE.md`; they are not a substitute for live Git facts.
- The final judgment is an interpretation, not another status list. The suggested action should be the most useful item from **Future** and answerable with “yes”.
