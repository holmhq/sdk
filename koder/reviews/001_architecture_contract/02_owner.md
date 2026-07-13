---
issue: 002
type: audit
verdict: approve
reviewer: user
created: 2026-07-14
reviewed_commit: 0d443cfedbc40634fec031f5ffb816743d1c9aa5
---

# Owner Decision: SDK Architecture Contract — Issue 002

## Decision

Approve `D001`–`D015` as the A1 implementation contract, with `D013` revised by
commit `0d443cf` to make `@holmhq/sdk/state` the canonical framework-neutral
state entry point.

## D013 clarification

- `/state` is chosen because it is the clearest product name and aligns with
  Holm's action/state/schema vocabulary.
- It is a clean-break API containing immutable query, mutation, derived-resource,
  `Resource`, and `ResourceSnapshot` contracts.
- It does not preserve the legacy `holm-state` exports or behavior merely because
  the word "state" is reused.
- There is no initial `/resources` alias.
- The handful of old apps may be refreshed explicitly; compatibility does not
  outrank the long-term API.

## Review reconciliation

The independent review in [`01_codex.md`](01_codex.md) found no P1 or P2 issues.
Its only P3 identified the README/D013 naming mismatch. The owner resolved that
finding by retaining the README's `/state` direction and revising D013 rather
than replacing the public name with implementation terminology.

## Authorization

A1 is approved. Issue `#002` may resolve and A2 may be activated for Issues
`#003`–`#006`, executed serially with strict TDD and a core API/conformance
review stop before Issue `#007`.
