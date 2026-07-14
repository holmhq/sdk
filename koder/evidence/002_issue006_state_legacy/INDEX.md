---
title: Issue 006 holm-state Disposition Ledger
status: implemented
queue: 001_a2_core_foundation
entry: S16
source_commit: 11ceae0d88e9c800eb77916e3244fbd231ad81bb
updated: 2026-07-14
---

# Issue 006 holm-state Disposition Ledger

Scope: compact migration disposition for the existing Holm `packages/holm-state`
experiment. Holm source remains read-only and pinned to commit
`11ceae0d88e9c800eb77916e3244fbd231ad81bb`.

## Source evidence

- `packages/holm-state/src/remote.js` informs query/mutation resource lifecycle,
  cache/write-back risks, and transport coupling to redesign.
- `packages/holm-state/src/channel.js` informs future realtime extension state,
  but channel events remain ephemeral and non-authoritative.
- `packages/holm-state/src/guard.js` informs auth-resource and navigation UX
  needs; redirects stay outside universal core.
- `packages/holm-state/src/route.js` informs optional web/navigation state only.
- `packages/holm-state/src/{track.js,debug.js}` informs compact diagnostics and
  history seams without production devtools coupling.
- `packages/holm-state/src/signals.js` and tests inventory `ref`, `computed`,
  `watch`, and `effect` behavior as framework-backed signal evidence.

## Classification

| Primitive | Classification | SDK S16 disposition |
| --- | --- | --- |
| `remote()` | redesigned | Replaced by typed query and mutation resources under canonical `@holmhq/sdk/state`; no string-path magic, global config, admin-client coupling, or implicit write-back. |
| `channel()` | extension-owned | Future realtime extension may expose ephemeral channel state; S16 only adds a public-capability-gated invalidate/reconcile hook and does not claim private, presence, collaboration, or durable replay support. |
| `guard()` | deferred | Rebuild from auth resources plus optional web/framework navigation in later app/framework slices; redirects do not belong in universal core. |
| `route()` | deferred | Web/navigation adapter concern, not universal server state. |
| `track()` | adopted | Compact resource history records revision/phase/stale/error-code metadata without payload retention. |
| `debug` | redesigned | Diagnostics are sink-based and secret-redacted; no global debug state or devtools runtime is required by core. |
| `ref` | excluded | Core does not reproduce framework-like mutable signals. |
| `computed` | redesigned | Replaced by framework-neutral derived resources built from resource snapshots/subscriptions. |
| `watch` | excluded | Use `Resource.subscribe()` and optional framework bindings rather than a signal runtime. |
| `effect` | excluded | Side effects stay in caller/framework code; core resources expose immutable snapshots and subscriptions only. |

## S16 proof paths

- `src/state/derived.ts` implements derived resources without Vue/React/Angular/
  Svelte runtime dependencies.
- `src/state/diagnostics.ts` implements compact history/diagnostics seams.
- `src/state/reconcile.ts` implements a non-durable public realtime
  invalidate/reconcile hook boundary.
- `test/source/state/derived.test.ts` covers derived dependencies/disposal,
  history redaction, and realtime capability gating.
- `test/source/state/legacy-ledger.test.ts` keeps this ledger executable.

## Safety notes

- Existing Holm `packages/holm-state` remains live and unmodified.
- No resources subpath alias is introduced; `@holmhq/sdk/state` remains
  canonical.
- No private realtime, presence, collaboration, app/admin migration, BFBB final
  distribution, npm publication, release tag, deploy, or cross-repository edit is
  claimed by S16.
