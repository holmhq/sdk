---
name: npm-release
description: Safely prepare, approve once, publish, verify, and harden genuine @holmhq/sdk npm and GitHub releases through one protected GitHub Actions OIDC workflow. Use when the owner asks to release or publish the SDK, run or troubleshoot Publish SDK release, verify npm/GitHub artifacts, audit trusted-publisher setup, recover a partial release, or harden release settings. Never create a dummy release.
---

# Holm SDK npm Release

Read and follow [`references/INDEX.md`](references/INDEX.md), resolving it relative
to this skill directory.

OIDC identity is proven by genuine `@holmhq/sdk@0.2.1` (tag `v0.2.1`, run
`29773856653`). The unified direct npm + GitHub Release workflow is intentionally
unproven until the next genuine release; never manufacture a version to test it.
The historical run used admin bypass (`state=skipped`), so require a real
protected-environment approval going forward.
