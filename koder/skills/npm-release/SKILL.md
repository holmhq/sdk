---
name: npm-release
description: Safely prepare, stage, approve, verify, and harden genuine @holmhq/sdk npm releases through GitHub Actions OIDC. Use when the owner asks to release or publish the SDK, run or troubleshoot the Stage npm release workflow, review an npm staged package, verify npm or GitHub release artifacts, audit trusted-publisher setup, or complete post-first-stage token hardening. Never create a dummy release.
---

# Holm SDK npm Release

Read and follow [`references/INDEX.md`](references/INDEX.md), resolving it relative
to this skill directory.

This runbook is proven for genuine OIDC staging and publication by
`@holmhq/sdk@0.2.1`: annotated tag `v0.2.1`, workflow run `29773856653`, and npm
stage `5194865d-de9e-4e92-b698-d0c5710e4553`. The first run used a GitHub admin
protection-rule bypass (`state=skipped`), so the normal required-reviewer path
remains a hardening item and must not be described as proven. Never manufacture
a package version merely to test the runbook.
