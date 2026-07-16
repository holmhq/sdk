---
issue: 016
type: code-rereview
verdict: approved_with_p2
reviewed_commit: 699ef68368cdafc160eeb67c94320f7a4fabe617
prior_review: ../032_a2r_integrated_sdk_remediation_rereview/INDEX.md
fix_commit: 69095cb9ce4e4edf8a09917fcc10500721b1ee3e
p1: 0
p2: 1
p3: 9
reviewer: claude-independent
date: 2026-07-16
---

# Independent rereview 2 — Issue 016 integrated SDK remediation (S03-S05 + coverage fix)

## Scope

Fresh owner-present independent integrated rereview covering:

- S03 `a962301` capability/extension ownership
- S04 `ca5e895` credential-safe diagnostics/cache identity
- S05 `af846d7` response correlation/provenance
- Coverage fixes `a1ac154` (ANSI) and `69095cb` (TAP), closing Review `#031` P2-1 / Review `#032` rejection

Method: full CI gate execution in four reporter modes, line-level review of the
coverage fix, and three independent adversarial verification passes (one per
slice) instructed to refute the specific claims approved by Review `#031`,
adjudicated against the authoritative contract (Review `#024`, plan `002_S04`).

Reviewer independence: this session authored none of the reviewed commits; the
prior reviewer lineage (`codex-independent`) was unavailable per the exhausted
unattended retry budget recorded in `koder/STATE.md`.

## Base and preconditions

- `git rev-parse HEAD` => `699ef68368cdafc160eeb67c94320f7a4fabe617`.
- `git diff 69095cb..HEAD -- . ':(exclude)koder'` is empty: the product tree at
  HEAD is byte-identical to fix commit `69095cb`.
- Pre-review tree clean; tree remained clean after all validation runs.
- Runtime: Node.js v24.8.0 (same major as Review `#032`'s failing environment).
- `package.json` remains `"private": true`.

## P2-1 disposition (from Reviews #031/#032)

### P2-1 resolved

`scripts/coverage.mjs` now strips either reporter prefix (`ℹ ` spec / `# ` TAP)
after ANSI stripping (`stripCoveragePrefix`, `scripts/coverage.mjs:125-130`).
An unrecognized reporter fails loudly at the `all files` row check rather than
passing silently — correct gate failure mode. Statements and changed-reachable
metrics derive from raw V8 coverage JSON and are reporter-independent by
construction; `check-coverage-summary.mjs` revalidates thresholds from JSON.

Gate evidence, all exit 0 with identical metrics
(statements 98.34 / lines 99.15 / functions 99.30 / branches 96.46 /
changed_reachable 100.00; 139/139 source tests):

1. `npm run ci`
2. `FORCE_COLOR=1 npm run ci` (the exact Review `#032` failing gate)
3. `NODE_OPTIONS='--test-reporter=tap' npm run test:coverage`
4. `FORCE_COLOR=1 NODE_OPTIONS='--test-reporter=tap' npm run test:coverage`

## Adversarial verification of S03-S05

### S03 capability/extension ownership — all claims confirmed

- `CapabilityView` is frozen and mutator-free; updater unreachable via closure
  or reflection (`src/core/capabilities.ts:59-64,148-155`).
- `createCapabilityRuntimeUpdater`/`CapabilityRuntimeUpdater` absent from every
  barrel, every dist barrel/declaration, and blocked by the `package.json`
  exports map (no `./core/*` wildcard).
- Extension offers forced to `origin: "extension"`, exact lowercase `sdk.`
  prefix, no base-offer replacement, duplicate rollback
  (`src/core/capabilities.ts:195-199,257-287`; `src/core/extensions.ts:513`).
- Invocation seam: no caller field on `ExtensionInvokeRequest`; cancellation
  scope overwrites extension-supplied signals
  (`src/core/create-holm.ts:176-206`).
- Snapshots/graphs deep-frozen; no by-reference leaks on the public surface.

### S04 credential-safe diagnostics/cache identity — confirmed per contract

The verifier challenged the "structural redaction" claim for unmarked
query/path tokens. Adjudication against Review `#024` P1-4: the authority
evidence explicitly endorses explicit secret references over name heuristics,
and plan `002_S04` implements exactly that model (explicit sensitivity markers;
auth-proof headers always marked at `src/transports/index.ts:433-445`; bodies
always redacted at `src/transports/sensitivity.ts:85-94`; header-name regex as
defense-in-depth). Partitioning by non-secret caller material is the plan's
stated acceptance criterion; cross-caller safety on transitions is owned by S02
epoch fencing. The unmarked-token scenario is caller responsibility under the
approved model and is recorded as P3 advisory, not a batch defect.

- Opaque keys confirmed: no raw material in cache keys
  (`src/core/cache-key.ts:16-51`); keys hash request identity, never headers.
- Hook/diagnostic emission paths confirmed redacted for marked and
  proof-supplied material; `toJSON` excludes `cause`; loader error messages
  stripped for non-HolmError throws.

### S05 response correlation/provenance — all claims confirmed

- Mismatched `requestId` fails closed with canonical `ProtocolError`
  (`src/core/correlation.ts:59-70`); per-request handles make cross-delivery
  impossible (`src/core/invoke.ts:72-89`).
- Duplicate/late explicitly branched; `finish()` idempotent; no double-settle
  (settled-guard in `src/core/cancellation.ts:158-186`).
- Terminal tracking FIFO-bounded at 1024 with eviction
  (`src/core/correlation.ts:101-107`); cleared on dispose.
- Malformed wire responses keep canonical `ProtocolError`; no payload leak in
  serialized details.
- S02 caller-epoch fencing verified intact through S05 (token-identity fencing
  `src/state/query.ts:190-198,269-271`; partition + generation fencing in
  transport cache).

## Findings

### P2-2 (NEW, pre-existing, outside the reviewed batch): unbounded `keyGenerations` growth

- **Location:** `src/transports/cache.ts:150,320-326,376-382`
- **Introduced:** `02f0f63` (ancestor of S02 approval `5d0df5d`); untouched by
  `a962301`/`ca5e895`/`af846d7`/`a1ac154`/`69095cb`.
- **Behavior:** `removeCacheKey()` unconditionally advances a per-key
  generation counter — including for caller-supplied request keys never
  cached. Entries are pruned only by `clear()`; LRU eviction caps `entries`
  but never `keyGenerations`. No code path clears the cache on caller
  transition (isolation is by key partitioning), so a long-lived single-caller
  process (server/Sobek, operator daemon) grows the map monotonically with
  distinct invalidated keys.
- **Impact:** slow unbounded memory growth in exactly the long-lived surfaces
  the SDK targets. No correctness/security impact (fencing remains sound).
- **Why P2:** production-readiness defect for server surfaces; bounded,
  well-understood fix exists (drop generation when no in-flight/scheduled load
  references the key, or bound the map with the same fencing guarantees —
  ABA-safe because loads capture the current value at start).

### P3 advisories (no gate impact; recorded for follow-up)

1. S04: URL/query/path sensitivity is opt-in via markers; unmarked
   credential-bearing params (`?sig=`, `?token=`) reach hooks/diagnostics/error
   details (`src/transports/sensitivity.ts:47,67-74`). Per approved contract
   this is caller responsibility — add an explicit unmarked-token contract test
   and document the marker obligation; Issue `#007` signed-URL/magic-link
   helpers MUST mark URL-borne tokens sensitive at construction.
2. S04: header-name fallback regex misses `x-auth`/`x-signature`/`apikey`
   variants for manually attached headers; hook events lack the second
   key-pattern layer diagnostics have (`sensitivity.ts:107-109`).
3. S04: `createOpaqueTransportKey` hashes bodies with a non-cryptographic
   128-bit mix; low-entropy secrets brute-forceable from a logged key
   (`src/core/cache-key.ts:28-51`, `sensitivity.ts:39,96-105`).
4. S04: loader-thrown `HolmError` messages pass verbatim into background-error
   events; untested path (`src/core/errors.ts:89-116` via
   `src/transports/cache.ts:433-441`).
5. S04: `cache.test.ts:70` is titled "structurally protect…" but marks all
   material explicitly; the title overstates the tested property.
6. S03: `src/test/index.ts:148-153` test fixture returns live internal arrays
   behind `readonly` getters (test-only surface).
7. S03: `__proto__`/`constructor` permitted as extension namespace names;
   self-inflicted local prototype reparenting only, no ownership bypass
   (`src/core/extensions.ts:633-651`).
8. S05: requestId reuse within the 1024-entry terminal window fails closed
   (`runtime_request_duplicate`), blocking same-id idempotent retries by
   design; document.
9. S05: `response.requestId` compared un-normalized against the trimmed handle
   id; whitespace-padded adapter echoes are falsely rejected (fail-closed)
   (`src/core/correlation.ts:59,140-148`).

## Verdict

**APPROVED_WITH_P2** — counts: **P1=0, P2=1 (new, outside batch), P3=9**.

- The S03-S05 remediation batch plus coverage fix `69095cb` is clean: zero
  P1/P2 within the reviewed scope, Review `#032` P2-1 closed, all four CI gate
  modes green with reporter-invariant metrics.
- The Issue `#016` acceptance checkbox "one fresh independent SDK review
  reports no P1/P2 findings" cannot be checked while P2-2 stands. P2-2 is
  small, isolated to `src/transports/cache.ts`, and does not reopen S03-S05.

## Required next action

1. Remediate P2-2 (bounded `keyGenerations`) with strict TDD plus its owned
   `dist/` artifacts; rerun all four CI gate modes.
2. Obtain a focused independent confirmation that P2-2 is closed (no full
   batch rereview required; S03-S05 findings are confirmed clean).
3. Then refresh live read-only Holm evidence at a named commit and request
   fresh Holm-authority A2 acceptance; close Issue `#016` after both gates.
4. Issue `#007` remains blocked until the A2 gate passes and the owner directs.
