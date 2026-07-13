---
name: Holm CDN
status: active
role: adjacent-browser-library-distribution
updated: 2026-07-13
local_path: ~/Projects/holmhq/cdn
remote: git@github.com-holmhq:holmhq/cdn.git
branch: main
verified_commit: 9a7a089cadc57f338f393ec56e1460cbd725b0ce
write_policy: read-only-from-sdk
---

# Project 004: CDN

## Relationship

Holm CDN distributes first-party browser UI libraries through immutable version
folders and jsDelivr. It provides useful publishing/integrity conventions, but
`@holmhq/sdk` is a separate product and will ship its own artifacts from this
repository.

## Relevant conventions

- Production consumers pin commit SHA and versioned path.
- Mutable `@main` links are development-only.
- Published/versioned artifacts are immutable.
- Source, build script, package metadata, and generated versions are reviewed
  together.
- Third-party packages are not mirrored casually.

## SDK boundary

- SDK jsDelivr URLs use `holmhq/sdk`, not the CDN repository.
- A BFBB app vendors the SDK artifact locally for runtime sovereignty.
- CDN may later host SDK-powered UI components, but framework/UI libraries must
  not become dependencies of SDK core.

## Agent policy

Read CDN conventions when designing distribution, but do not publish/copy SDK
artifacts into CDN or edit that repository without explicit approval.
