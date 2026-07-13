---
issue: 002
type: audit
verdict: approve
reviewer: codex
created: 2026-07-14
reviewed_commit: 986b5095acc0dfd742657c1f018c71edba5691dd
---

# Review: SDK Architecture Contract - Issue 002

## Summary

Verdict: **APPROVE**.

A1 is decision-ready. `ARCHITECTURE.md` and `DECISIONS.md` cover the Issue
`#002` contract boundaries and all `14` Issue `#001` invariants without
claiming unavailable Holm capabilities. I found no P1 or P2 findings.

One P3 documentation cleanup should be handled before the README becomes a
source of implementation truth, but it does not block A1 approval or Issue
`#003` planning under the architecture docs.

## Findings

- **P1:** None.
- **P2:** None.
- **P3:** `README.md` under "Planned package" still lists
  `@holmhq/sdk/state`, while `DECISIONS.md` `D013` and
  `ARCHITECTURE.md` "Package and subpath contract" explicitly say there is no
  initial `@holmhq/sdk/state` compatibility alias. Suggested cleanup: replace
  that README candidate list with the D013 subpath set, or remove
  `@holmhq/sdk/state` and point readers to the architecture contract until the
  owning slice validates exports. This is non-blocking because D013 is clear
  and the README marks the list as not frozen.

## Focused Decision Review

### D004 - Capability versioning

Pass. The proposal uses opaque namespaced IDs, integer major/minor matching,
highest-compatible minor selection, distinct missing/version errors, dynamic
offer removal before invocation, and conservative commit/probe-pinned
manifests until Holm ships a canonical registry. It correctly separates
`holm.*` runtime offers from `sdk.*` local capabilities and prevents Holm
version sniffing from becoming proof.

### D008 - Extension namespace sealing

Pass. Extension identity, namespace uniqueness, one public namespace per owner,
versioned dependencies, symmetric conflicts, cycle detection, topological
startup, reverse-order rollback, and reverse dependency disposal are precise
enough for tests. Extension-provided `sdk.*` capabilities cannot mutate runtime
`holm.*` offers, and installed methods fail closed when runtime requirements
are absent.

### D013 - Package boundaries

Pass, with the P3 README drift above. The root package remains ECMAScript-only;
web, Node, Sobek, bridge, test, app/admin, resources/actions, realtime,
collaboration, and framework bindings are explicit subpaths. The decision does
not force premature implementation because it says a subpath may be omitted
until its owning slice exists, but boundaries must not collapse.

### D014 - Artifact boundaries

Pass. The three tracked compositions are conceptually distinct:
`dist/holm.js` for complete browser/BFBB convenience,
`dist/holm-web.js` for app-focused browser use, and `dist/holm-node.js` for
Node/CLI. The plan requires deterministic ESM, manifests, SHA-256, size
reports, source/declaration/bundle smoke tests, reproducible rebuilds,
immutable GitHub/jsDelivr SHA or tag addressing, local BFBB vendoring, and
private npm state. It does not imply a runtime-sniffing universal bundle.

## Acceptance and Invariant Check

Issue `#002` acceptance criteria are covered:

- three-axis architecture is explicit in `ARCHITECTURE.md`;
- TypeScript-shaped sketches are illustrative and test-extractable;
- action/state/schema registry remains SDK-independent;
- caller identity, capability negotiation, and mailbox semantics cover web,
  CLI, server/Sobek, desktop, mobile, and test surfaces;
- resource, extension, error, cancellation, and lifecycle rules are precise
  enough for implementation tests;
- package identity, MIT license, private npm state, BFBB artifacts, and
  SHA-addressed jsDelivr distribution are recorded;
- non-blocking implementation details are delegated to named later slices;
- this review finds no conflict with the umbrella invariants.

All `14` Issue `#001` invariants are covered. Core ambient isolation, explicit
adapters, immutable resources, capability negotiation, surface-specific
caller/auth, no SQLite or auth bypass, optional framework/CRDT runtimes,
source/generated testing, source/commit evidence, no publication/deploy/Holm
mutation, reproducible hashed `dist/`, BFBB vendoring, license checks, and
existing Holm package preservation all have matching architecture rules.

## Passing Checks

- A1 stop gate is respected: Issue `#002` remains open and A2 remains
  unauthorized.
- Architecture commit `986b509` changed only `ARCHITECTURE.md`,
  `DECISIONS.md`, and Issue `#002`.
- `package.json` has `name: "@holmhq/sdk"`, `private: true`, `license: "MIT"`,
  and no publication state.
- README distribution guidance correctly requires immutable commit/tag
  jsDelivr URLs, vendoring for BFBB apps, and no deployed `@main` imports.
- No decision freezes endpoint payloads, build tooling, CRDT choice, framework
  semantics, or unavailable Holm capabilities.

## Verification

- Preflight confirmed `/home/glasscube/Projects/holmhq/sdk` on branch `main`
  tracking `origin/main`, clean before review.
- `git fetch --quiet origin` succeeded.
- `HEAD` and `origin/main` were both
  `53fb7a5e8f9a754a0fa769419c548025be1a18b8`.
- `986b5095acc0dfd742657c1f018c71edba5691dd` is an ancestor of `HEAD`.
- `git show --stat --oneline 986b509` matched the expected A1 changed paths.
- No implementation tests were run; this was a documentation/contract review.

## Verdict

**APPROVE.**

The architecture contract is coherent enough to approve A1 and use as the
input to Issue `#003`, subject to owner approval. The only finding is a
non-blocking README cleanup to keep public package sketches aligned with D013.

## Owner Gate

This artifact is a reviewer recommendation only. Issue `#002` remains open, A1
remains active, and A2/Issue `#003` remains unauthorized until the owner
explicitly approves.
