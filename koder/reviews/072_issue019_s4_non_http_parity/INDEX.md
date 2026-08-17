---
status: changes_requested
priority: P1
created: 2026-08-17
review_kind: independent_sdk_mapping_review
issue: 019
slice: S4
base_commit: c06f98fd6bd8ad447f2ae3dbe925b911e7e64bef
target_commit: d941db5e5ebe15699d75316687d213550901f703
verdict: NEEDS_FIXES
p1: 0
p2: 4
p3: 1
reviewer: pi/gpt-5.6-sol
---

# Review: Issue 019 S4 Holm non-HTTP parity

## Scope

Independent SDK mapping and authority review of exact product range:

`c06f98fd6bd8ad447f2ae3dbe925b911e7e64bef..d941db5e5ebe15699d75316687d213550901f703`

Review boundaries honored:

- assessed the committed product range rather than the later handoff-state
  commit;
- reviewed all 47 map identities, their dispositions and SDK statuses, checker
  failure modes, and source-map/project-card updates;
- read Holm only through pinned Git objects and read-only live checks;
- made no product implementation, public API, generated output, release,
  publication, deployment, Holm, Medialab, or cloud/production change; and
- wrote only this review artifact as the review result.

This review does not approve S4 or resolve Issue `#019`.

## Evidence reviewed

- `AGENTS.md`
- `koder/STATE.md`
- `koder/docs/EXECUTION.md`
- `koder/docs/{ARCHITECTURE,DECISIONS,HOLM_SOURCE_MAP}.md`
- `koder/issues/019_holm_route_registry_refresh/INDEX.md`
- `koder/evidence/009_holm_non_http_parity/{INDEX.md,non-http-parity.json}`
- `koder/projects/{INDEX.md,001_holm/INDEX.md}`
- `git diff --find-renames c06f98f..d941db5`
- `package.json`
- `scripts/check-holm-non-http-parity.mjs`
- `test/evidence/issue019-s4-red.md`
- `test/tooling/check-holm-non-http-parity.test.mjs`
- SDK baseline `c06f98f` evidence files named by the map
- all 30 Holm files named by the map at
  `44d51d0f785ff6208ecc034c720e76a8543891be`
- the omitted Default Projection payload files transitively named and hashed by
  the pinned `HANDOFF.md`
- bounded pinned Holm tests/source used to confirm the channel-limit and role
  behavior described below

## Findings

### P1

None.

### P2

#### P2-1 — The operator-admin row overstates runtime authorization

The map says all grouped `holm.admin` calls require authenticated
owner/admin/app-role checks plus one of the named manifest capabilities
(`non-http-parity.json:761-810`, especially line 806). That is not the pinned
runtime behavior.

At Holm `44d51d0f…`:

- `holm.admin.roles.remove` performs its app-scoped update after only argument
  and database/app-context checks (`internal/runtime/admin_bindings.go:187-210`);
- `holm.admin.roles.list` and `holm.admin.roles.find` read role data after only
  argument and database/app-context checks (`:212-291`);
- `holm.admin.roles.add` applies caller/capability checks only to selected
  reserved/elevated role values; arbitrary app role values do not pass through
  a general authenticated-caller or manifest-capability guard (`:119-185`);
- `InjectAdminNamespace` is installed by the normal injector chain even when
  those caller gates are absent (`internal/runtime/injectors.go`).

The member/storage/audit branches do have the compound guards summarized by the
map, but the 36-operation grouped statement incorrectly extends them to the
role methods. The related `node:app-admin-capabilities` wording is also too broad
for a row titled as the gate for injected admin bindings.

**Impact:** S4's principal purpose is to preserve exact auth/caller truth. A
future direct-host adapter could rely on this row and present role calls as
runtime-guarded when current Holm expects app code to supply additional guards.

**Required remediation:** split or explicitly qualify the role operations and
record their actual source-level checks. Do not silently change Holm from this
repository; any runtime hardening is a separate Holm owner decision.

#### P2-2 — The WebSocket map omits the typed-channel count limit

The private/presence rows record their enable policies but omit
`realtime.max_channels_per_socket` entirely. Pinned Holm defines it as an
app-overridable integer with default `0` (unlimited)
(`internal/policy/policy.go:71,160,643-646`) and applies it to typed private and
presence subscriptions (`internal/hosting/ws.go:868-895`). An over-limit
subscription fails with `realtime_policy_channel_limit_exceeded`; pinned tests
exercise private-one followed by presence-two at a limit of one.

The source also returns early for a channel without `:`, so legacy bare-channel
subscriptions bypass this typed-channel policy. That distinction is absent from
both the machine map and the narrative evidence.

**Impact:** the map is incomplete on an explicit availability/lifecycle bound
required by the S4 contract and could lead a future SDK to promise or model the
wrong subscription limit behavior.

**Required remediation:** record the default, app override, stable rejection,
and typed-only scope in the private/presence and legacy-channel truth without
inventing a new SDK capability.

#### P2-3 — Member-storage availability is false for logged-out media methods

`sobek:member-storage` states that all listed methods are installed in every
context (`non-http-parity.json:669-710`). Pinned
`internal/storage/app_bindings.go` installs all three member media methods for a
real member and anonymous-owner stubs (`:165-167,192-194`), but the no-owner
login-required branch installs only `holm.app.member.media.serve` (`:206-252`,
line 240). `media.probe` and `media.transcode` are absent in that context.

**Impact:** the exact operation inventory and availability statement disagree
with the runtime for one caller class. This is within S4's required caller and
availability truth, even though the whole namespace remains deferred.

**Required remediation:** qualify per-owner method availability (or split the
identity if that is clearer) and add a focused fixture/check that prevents the
all-context claim from returning.

#### P2-4 — Declared provenance and authority semantics do not fail closed

The checker validates the main Holm commit/describe/version fields, but ignores
`source.captured_at` and the entire `source.nearest_release` object even in
`--check-pinned`. It also permits an entry with `holm_status: "absent"` and
`authority: "implementation"`, despite the map's explicit distinction between
implementation and negative-evidence authority.

A bounded in-memory probe changed:

```text
nearest_release = { tag: "", commit: "not-a-commit" }
captured_at = 17
```

and both `validateNonHttpParity(...)` and
`verifyPinnedHolmSources(...)` returned no errors. A second probe changed an
absent entry to implementation authority, recomputed the summary, and validation
again returned no errors.

**Impact:** the post-release distinction (`v0.208.0` nearest release versus the
128-commit-later source pin) is material evidence, and the authority vocabulary
is used to prevent implementation, fixture, design, and absence claims from
being flattened. The advertised fail-closed provenance/semantic gate can accept
contradictory evidence.

**Required remediation:** validate the complete declared provenance, verify the
nearest tag resolves to the recorded commit, enforce the authority/status
matrix (including absence and supersession), and add focused regression tests
for these cases.

### P3

#### P3-1 — Default Projection payload pinning is only transitive and unchecked

The action/schema fixture row claims discovery views, invocation/result examples,
and bounded theme input, but the map's `sources` array does not directly list:

- `result.schema.json`;
- `theme-input-v1.schema.json`;
- `fixtures/discovery-caller-views.json`;
- `fixtures/invocations.json`;
- `fixtures/results.json`; or
- `fixtures/presentation/runo-theme-input-v1.json`.

Pinned `HANDOFF.md` does list their hashes, and this review independently
recomputed all nine payload hashes successfully. Therefore the current evidence
is not false. However, the SDK checker only hashes `HANDOFF.md`; it neither
parses that manifest nor verifies the payload bytes it relies on.

**Recommended remediation:** either list every relied-on payload as a source or
verify the pinned handoff manifest and payload bytes in the checker. This would
make the “every relied-on source byte” claim direct rather than dependent on a
manual transitive check.

## Review questions

1. **Exact scope:** PASS. The range changes only evidence, issue/source-map
   routing, project metadata, tooling/tests, and package CI wiring. No `src/**`,
   `dist/**`, version, dependency, release, publication, deployment, or
   cross-repository file is changed.
2. **Identity and summary integrity:** PASS. There are 47 unique ordered
   identities: 9 WebSocket, 21 Sobek, 10 node/capability, and 7 action/schema.
   Counts for authority, Holm status, disposition, and SDK status recompute to
   the checked-in summary.
3. **Disposition truth:** PASS. No adopted/current public support was inferred
   from Holm existence. Existing SDK HTTP/caller behavior remains the only two
   adopted identities; direct namespaces stay deferred, unsupported negative
   surfaces stay unavailable, and candidates remain implementation-gated.
4. **WebSocket source fidelity:** NEEDS FIXES. Upgrade/auth, frame coalescing,
   queue loss, heartbeat, legacy channels, private/presence fanout, server
   broadcast, whispers, and negative binary/publish/replay claims match pinned
   source, but the typed-channel count policy is missing.
5. **Sobek source fidelity:** NEEDS FIXES. The grouped namespace inventory and
   current SDK preview boundary are otherwise source-backed, but operator-admin
   auth and logged-out member-media availability are inaccurate.
6. **Node/capability fidelity:** NEEDS FIXES only where it inherits the broad
   app-admin gate statement. SDK `0.2.1` Node offers, explicit caller/auth, local
   runtime services, non-HTTP rejection, analytics gates, queue/events grants,
   and foreign-member worker gate match source.
7. **Action/schema authority:** PASS for current facts. Issue `#534` supersedes
   the standalone CLI action transport; S02 production registry/discovery and
   S04 generic CLI remain pending; the offline fixture is concrete; SDK actions,
   production discovery, and a separate state/query registry remain absent.
8. **Source-map/project-card updates:** PASS. The newer non-HTTP checkpoint is
   clearly separated from the older architecture baseline, and Holm remains
   read-only authority.
9. **Checker and tests:** NEEDS FIXES. Canonical shape, ordering, source hashes,
   expected absence, summary, and main pinned/live provenance work, but P2-4 and
   P3-1 leave declared evidence outside the fail-closed boundary.
10. **TDD and regression boundary:** PASS for chronology and scope. RED records
    the absent validator before implementation, and focused/full validation is
    green; green tests do not negate the semantic findings above.

## Authority verification

- Fresh pinned command passed against exact Holm commit
  `44d51d0f785ff6208ecc034c720e76a8543891be`.
- The pinned version is `0.208.0`; `git describe` is
  `v0.208.0-128-g44d51d0f7`; tag `v0.208.0` resolves to
  `93606188a1ee064e8aade678891406a671609eb5`.
- SDK baseline `c06f98f` has neither `src/actions` nor `src/realtime`.
- All nine files named by the Default Projection handoff manifest independently
  matched their recorded SHA-256 values.
- At the live-check instant, the read-only Holm checkout was clean at
  `cc916bb53e392071a5a85e68738724c3fedf3cf6` (`0.209.2`,
  `v0.209.2-6-gcc916bb53`). Live mode correctly failed on HEAD/describe/version
  and changed `cmd/server/main.go`; the Holm files underlying the source-truth
  findings were unchanged from the pinned commit.
- No Holm file, checkout state, service, database, or generated artifact was
  modified by this review.

## Passing checks

- `git diff --check c06f98f..d941db5`
- `npm run test:holm-non-http-parity` — 4/4 focused tests and 47-entry offline
  map check passed
- `node scripts/check-holm-non-http-parity.mjs --check-pinned --holm-root
  ~/Projects/holmhq/holm/master` — passed
- `npm run test:source` — 231/231 passed
- `npm run ci` — passed, including reproducibility, declarations, dist/examples,
  coverage, licenses, size, and installed package smoke
- package size remained `297073` raw / `226805` minified / `58616` gzip bytes
- `git status --short --untracked-files=all` was clean before this review
  artifact was written

## Expected failing check

`--check-live` failed because the moving read-only Holm checkout no longer
matches the pinned S4 commit. That is the intended live-drift behavior, not a
product test failure. Pinned-object verification remained green.

## Verdict

**NEEDS FIXES**

Checkpoint disposition: `P1=0`, `P2=4`, `P3=1`.

Do not accept or resolve S4/Issue `#019` at `d941db5`. Correct the map and
checker within the existing mapping-only boundary, rerun focused/full and fresh
pinned authority validation, then obtain a fresh independent S4 re-review.
Public WebSocket, Sobek, capability, action/schema, release, deployment, and
cross-repository implementation remain outside scope.
