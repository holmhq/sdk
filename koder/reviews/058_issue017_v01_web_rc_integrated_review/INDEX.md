---
issue: 017
type: integrated-sdk-review
verdict: approved
reviewed_product_head: dc4af0d924c5a9b8e7989e924e0046dd5bcb0b38
reviewed_range: 3049b5410e01000a3f20234d6f5d268ab64cf758..dc4af0d924c5a9b8e7989e924e0046dd5bcb0b38
p1: 0
p2: 0
p3: 0
reviewer: pi-independent
model: api-coding-assistant
date: 2026-07-17
---

# Review 058: Issue 017 v0.1-web RC integrated SDK review

## Scope

Fresh local independent SDK review of the private `0.1.0-rc.1` release-candidate
state at SDK product head `dc4af0d924c5a9b8e7989e924e0046dd5bcb0b38`, covering
W4 range `3049b5410e01000a3f20234d6f5d268ab64cf758..dc4af0d924c5a9b8e7989e924e0046dd5bcb0b38`.

Reviewed scope included Issue `#017`, approved Plans `004_S01`-`004_S08`,
Issue `#014` resolution evidence, W4 source/test/docs/generated/package diffs,
`package.json` exports and scripts, generated `dist/` JavaScript/declarations/
maps/manifests/reports, examples/BFBB fixtures, S08 gate report
`.harnex/q005/reports/q005-gov-e08-gate-a01.json`, and the live read-only Holm
Issue `#534` authority document needed for SDK-side compatibility. I did not
modify product code, queue/state/issues/plans, Holm, or any other repository.

## Verdict

**Approved.** Counts: **P1=0, P2=0, P3=0**.

No findings were identified in the reviewed SDK release-candidate state. This is
an integrated SDK review only; the separate fresh read-only Holm-authority
acceptance required by Plan `004_S08` remains a downstream gate before W4 can be
claimed complete.

## Findings

None.

## Command evidence

All commands were run independently in this review session from a clean tree.

| Command | Exit | Evidence |
| --- | ---: | --- |
| `npm run ci` | 0 | Source tests `220` pass; dist tests `22` pass; repro `235` dist artifacts; integrity `232` manifest artifacts; size `231182` raw / `169206` minified / `50254` gzip bytes; licenses `66` locked packages. |
| `FORCE_COLOR=1 npm run ci` | 0 | Same test/artifact counts and metrics as normal CI. |
| `NODE_OPTIONS='--test-reporter=tap' npm run ci` | 0 | Same test/artifact counts and metrics as normal CI. |
| `FORCE_COLOR=1 NODE_OPTIONS='--test-reporter=tap' npm run ci` | 0 | Same test/artifact counts and metrics as normal CI. |
| `npm run build` | 0 | Regenerated tracked `dist/` JS/declarations/maps, web bundles, stable API check, license report, size report, and manifest. |
| `git diff --exit-code --stat` | 0 | No generated/source drift after build. |
| `npm run check:repro` | 0 | `235` dist artifact(s) reproduced byte-identically. |
| `npm run test:stable-api` | 0 | Stable API drift check passed for `7` entry point(s). |
| `npm run test:declarations` | 0 | Stable API plus package/web declaration consumers passed. |
| `npm run test:dist` | 0 | `22` generated package/dist tests passed. |
| `npm run test:examples` | 0 | Raw BFBB import, offline vendored integrity fixture, Vite production build, preview labels, and reserved bridge labels passed. |
| `npm run test:rc-docs` | 0 | RC docs/metadata check passed for private `0.1.0-rc.1`. |
| `node scripts/verify-dist-integrity.mjs` | 0 | `232` manifest artifacts verified; altered-byte rejection, offline BFBB fixture, immutable vendoring docs, and package-export compatibility passed. |
| `npm run size` | 0 | Size check passed: `231182` raw / `169206` minified / `50254` gzip bytes. |
| `npm run check:licenses` | 0 | License check passed for `66` locked package(s). |
| `git status --short --untracked-files=all` | 0 | Clean before writing this review artifact. |

Four-mode coverage metric equality was exact:

| Mode | Statements | Lines | Functions | Branches | Changed reachable |
| --- | ---: | ---: | ---: | ---: | ---: |
| normal | 98.02 | 98.91 | 98.58 | 95.45 | 100.00 |
| FORCE_COLOR | 98.02 | 98.91 | 98.58 | 95.45 | 100.00 |
| TAP | 98.02 | 98.91 | 98.58 | 95.45 | 100.00 |
| TAP + color | 98.02 | 98.91 | 98.58 | 95.45 | 100.00 |

## Integrated assessment

### Stable API and ambient boundaries

The stable/frozen `0.1.x` entry points are exactly `@holmhq/sdk`,
`@holmhq/sdk/core`, `@holmhq/sdk/transports`, `@holmhq/sdk/app`,
`@holmhq/sdk/web`, `@holmhq/sdk/state`, and `@holmhq/sdk/test`. The stable API
manifest records those `7` entry points and is enforced by
`scripts/check-stable-api.mjs`; it rejects drift, `export *` wildcards in stable
declarations, forbidden preview/reserved stable names, forbidden declaration
paths, and DOM/Node ambient tokens through root/core declaration graphs.
`tsconfig.core.json` keeps core/runtime-neutral surfaces on `ES2022` with
`types: []`, while runtime-specific ambient APIs remain behind explicit web/node
adapter tests.

### Preview/reserved labels and isolation

`@holmhq/sdk/node` and `@holmhq/sdk/sobek` expose machine-checkable
`status: "preview"`, `compatibility: "not frozen"`, and `production: "not production"`.
`@holmhq/sdk/bridge` exposes `status: "reserved"`, desktop/mobile
`"unsupported"`, and a mailbox/mock/service-slot-only scope. Generated stable
subpaths and BFBB bundles are tested not to evaluate `dist/node`, `dist/sobek`,
or `dist/bridge`, and docs/examples do not present preview or reserved imports
as stable production support.

### Review #033 advisory disposition and security

The nine Review `#033` advisories are covered by S03/S04 tests and docs:
credential diagnostics require explicit sensitivity markers for URL-borne
secrets, header matching is defense-in-depth, low-entropy bodies are not hashed
into cache keys, background `HolmError` messages are redacted before transport
cache diagnostics/hooks, the cache diagnostic title was narrowed, in-memory
runtime getters return frozen snapshots, prototype-reserved extension namespaces
are rejected, duplicate request IDs fail closed within the terminal window, and
whitespace-padded response IDs fail closed. Request IDs, namespace collisions,
caller fingerprints, cache partitions, and serialized diagnostic events remain
bounded and credential-safe under the reviewed contract.

### Distribution, generated artifacts, and reproducibility

The tracked private RC artifacts are deterministic and complete for the scoped
web/BFBB handoff. `dist/manifest.json` records package `0.1.0-rc.1`,
`private: true`, `232` artifact records, SHA-256/byte metadata, MIT notices,
source maps/declarations, included/excluded bundle capabilities, no runtime CDN
requirement, and immutable Git SHA or reviewed-tag address policy. `dist/holm.js`
and `dist/holm-web.js` are importable, covered by size/license/manifest gates,
exclude unavailable/preview/reserved runtimes, and are reproducible through
`npm run check:repro` (`235` generated dist artifacts).

### BFBB, examples, and Issue #014

Issue `#014` is resolved by S05/S06 evidence without redefining its acceptance
criteria. The reviewed state provides deterministic complete/narrow web ESM
artifacts, declarations/maps, manifest hashes, altered-byte rejection, copied
offline BFBB fixture, Vite/package-export compatibility, immutable vendoring
and rollback guidance, tracked `dist/` license/size reports, and package privacy.
No npm publication, tag, release, runtime CDN dependency, or browser/vendor soak
claim is made.

### Package, dependencies, and licenses

`package.json` is `@holmhq/sdk` version `0.1.0-rc.1` with `private: true`, MIT
license, Node `>=20` tooling floor, explicit subpath exports, and no wildcard
or deep export that bypasses labels. W4 changed package metadata/scripts but did
not add runtime or development dependencies; `package-lock.json` dependency set
is unchanged apart from the root version. License validation passes for `66`
locked package(s) against the repository's MIT-compatible allowlist.

### Documentation and support contract

`README.md`, `docs/v0.1-web-rc.md`, and `examples/README.md` accurately state
the private RC status, stable/preview/reserved/unavailable support matrix,
additive-only stable `0.1.x` compatibility rule, capability-based web baseline,
immutable SHA/reviewed-tag vendoring, `sha256sum -c` verification, update and
rollback workflow, private security reporting, Issue `#015` non-completion, and
future pilot/promotion gates. They explicitly stop before real-app pilot,
browser/vendor soak, push, tag, npm publication, GitHub release, deployment,
credentials, cloud/production mutation, and promotion to `0.1.0`.

### Holm compatibility note

Read-only SDK-side Holm compatibility was checked against the local Holm
checkout at `748cbe5e8f673d9a5a3d276e6826eecac32b8612` (`version.json`
`0.185.1`) by reading committed `koder/issues/534_contract_first_holm_apps/INDEX.md`.
The SDK RC claims remain aligned with Holm `#534`: GET observes resources/state,
POST performs commands/transitions, BFBB/static hosting remains first-class,
authored root `index.html` wins over generated presentation, and the SDK does
not claim Holm implementation ownership, direct SQLite/storage access, generated
CLI/default-projection implementation, production desktop/mobile, realtime,
collaboration, framework bindings, arbitrary SSR, or a second app wire contract.
This note is not the separate Holm-authority acceptance artifact required by
Plan `004_S08`.

## Forbidden-action and stop-gate check

No push, tag, npm publish, release, deploy, pilot, promotion, credential use,
cloud/production mutation, worktree, product fix, dependency expansion, Holm
write, or other-repository write occurred in this review. The package remains
private and unpublished. Stop before pilot/release remains in force after this
review; W4 still needs the separate fresh read-only Holm-authority acceptance
with zero P1/P2 before owner handoff can claim Queue `#005` complete.
