---
status: approved
priority: P1
created: 2026-08-18
review_kind: independent_sdk_mapping_rereview
issue: 019
slice: S4
cumulative_base: c06f98fd6bd8ad447f2ae3dbe925b911e7e64bef
cumulative_target: f623a8cd7042baf9f64a9835f440023eedf5a173
remediation_base: 1ca72c8de0c577e19f5e4d41891bdd992af93285
verdict: APPROVED
p1: 0
p2: 0
p3: 0
date: 2026-08-18
reviewer: pi/gpt-5.6-terra
---

# Review: Issue 019 S4 non-HTTP parity remediation

## Scope

Independent re-review of the committed cumulative S4 range:

`c06f98fd6bd8ad447f2ae3dbe925b911e7e64bef..f623a8cd7042baf9f64a9835f440023eedf5a173`

Remediation delta reviewed independently:

`1ca72c8de0c577e19f5e4d41891bdd992af93285..f623a8cd7042baf9f64a9835f440023eedf5a173`

This was a review-only pass. No SDK product code, generated output, release
state, Holm checkout, Medialab, or other repository was modified.

## Review basis

- `AGENTS.md`, `koder/STATE.md`, the active Issue `#019` contract, Review
  `#072`, `HOLM_SOURCE_MAP.md`, and the Holm project card;
- Evidence `#009`, its complete 47-entry JSON map, remediation RED chronology,
  focused tests, checker, and cumulative/remediation diffs;
- the exact pinned Holm Git object
  `44d51d0f785ff6208ecc034c720e76a8543891be`, not moving worktree content;
- pinned admin bindings/injectors, WebSocket/policy implementation and focused
  tests, member-storage bindings, Default Projection handoff/payloads, and
  every map source hash through the checker; and
- package/script and path-level scope evidence for the full cumulative range.

## Findings

### P1

None.

### P2

None.

### P3

None.

## Prior-review remediation assessment

1. **Operator-admin authorization — fixed.** `sobek:operator-admin` no longer
   extends compound member/storage/audit guards to every role call. Pinned
   `admin_bindings.go` confirms that `roles.remove`, `roles.list`, and
   `roles.find` have argument plus database/app-context behavior without a
   general authenticated-caller or manifest-capability guard. Arbitrary role
   values in `roles.add` likewise have no blanket guard; selected reserved or
   elevated values retain their source-specific capability, caller, or reserved
   rejection branches. `node:app-admin-capabilities` now limits its claim to
   selected bindings and role additions.
2. **Typed-channel limit — fixed.** Pinned `policy.go` defines the app-scoped,
   app-overridable `realtime.max_channels_per_socket` integer at default `0`
   (unlimited). Pinned `ws.go` applies it after typed authorization and returns
   `realtime_policy_channel_limit_exceeded` when the resulting count exceeds a
   positive limit. Its focused test subscribes `private:one` then rejects
   `presence:two` at limit one. A no-colon channel returns before typed policy;
   an already subscribed bare channel still contributes to a later typed count.
3. **Logged-out media availability — fixed.** Pinned `app_bindings.go` installs
   all three member-media methods for real and anonymous owners, but the
   no-owner branch installs only login-required `media.serve`. It omits
   `media.probe` and `media.transcode`; the map now says exactly that.
4. **Complete provenance — fixed.** The checker rejects malformed capture date,
   stable nearest-release tag, nearest-release commit, marker/tag relation, and
   describe relation. Pinned mode independently resolves the nearest tag and
   its commit as well as the mapped commit, version, describe output, and every
   source hash.
5. **Authority/status matrix — fixed.** The checker maps all seven accepted
   Holm statuses to their required authority and rejects a wrong authority for
   each. This includes `absent → negative-evidence` and
   `superseded → converged-design`.
6. **Default Projection payload pinning — fixed.** The nine payloads named by
   `HANDOFF.md` are direct map sources and direct fixture evidence. Their
   handoff hash, mapped hash, and independently read pinned-Git bytes matched
   for each payload.

## Required review questions

1. **All Review `#072` findings fixed? — PASS.** The four P2 findings and the
   P3 direct-payload hardening are corrected semantically and mechanically.
2. **Role and node-capability truth? — PASS.** The map distinguishes ungated
   role paths from selected branch-specific role behavior and no longer calls
   the manifest strings blanket injected-admin guards.
3. **Private/presence policy and bare bypass? — PASS.** Both typed rows record
   the app override, `0` unlimited default, stable rejection, and typed-only
   evaluation; the legacy row records its early no-colon bypass accurately.
4. **No-owner member media? — PASS.** The map records only the installed
   login-required `media.serve` stub and the two absent media methods.
5. **Complete provenance fails closed? — PASS.** Validation covers capture,
   release tag/commit, describe/version consistency, malformed values, and
   pinned nearest-tag resolution.
6. **Status/authority contradictions? — PASS.** Direct mutation probes verified
   rejection for every status, including absent and superseded combinations.
7. **Nine Default Projection payloads direct and byte-verified? — PASS.** All
   nine are direct references, map hashes match `HANDOFF.md`, and pinned bytes
   match those hashes.
8. **RED-to-GREEN regressions meaningful? — PASS.** The remediation chronology
   records the intended 4-pass/7-fail RED state. Independent probes against
   `1ca72c8` reproduced all seven old defects; the current focused suite passes
   11/11 and exercises each correction.
9. **Map integrity and no-public-support boundary? — PASS.** The map has 47
   unique ordered identities: 9 WebSocket, 21 Sobek, 10 node, and 7
   action/schema. Exact summaries recompute; dispositions and SDK statuses
   retain the no-inferred-public-implementation boundary.
10. **Range scope clean? — PASS.** The cumulative range changes evidence,
    review/issue/source routing, checker/tests, and package CI wiring only. It
    contains no `src/**`, `dist/**`, dependency, version, release,
    publication, deployment, Holm, Medialab, or `@zyt` change.

## Fresh pinned Holm-authority verification

- Exact inspected commit:
  `44d51d0f785ff6208ecc034c720e76a8543891be`.
- Pinned version marker: `0.208.0`.
- Pinned describe: `v0.208.0-128-g44d51d0f7`.
- Exact nearest stable tag: `v0.208.0` at
  `93606188a1ee064e8aade678891406a671609eb5`.
- `node scripts/check-holm-non-http-parity.mjs --check-pinned` passed against
  the supplied Holm root. It verified all mapped source bytes via Git objects,
  so no moving or dirty Holm worktree detail was used.
- Manual source inspection corroborated the corrected role, channel-limit,
  bare-channel, no-owner media, and Default Projection claims.

## Validation

- Pre-review `HEAD` equaled expected target `f623a8c`; pre-review tree was
  clean.
- `git diff --check c06f98f..f623a8c` — passed.
- `npm run test:holm-non-http-parity` — passed: 11/11 focused tests plus the
  offline 47-entry map check.
- `npm run test:source` — passed: 231/231 source tests.
- `npm run ci` — passed, including type/declaration/dist/example/coverage,
  route checks, reproducibility, licenses, size, and installed-package smoke.
- `node scripts/check-holm-non-http-parity.mjs --check-pinned --holm-root
  ~/Projects/holmhq/holm/master` — passed: 47 entries and pinned provenance.
- Independent payload reconciliation passed for all nine `HANDOFF.md` payloads.
- Package scope remained `0.2.1` with unchanged dependency counts; package
  changes only add the offline non-HTTP parity CI/test script.

## Verdict

**APPROVED**

`P1=0`, `P2=0`, `P3=0`.

Issue `#019` S4 remediation at `f623a8c` satisfies the mapping-only review
checkpoint. This approval does not authorize public WebSocket, Sobek,
capability, or action/schema implementation; release, deployment, Holm writes,
and any next issue remain outside this review.
