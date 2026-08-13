---
updated_at: "13 Aug 2026 | 11:55 PM IST"
state: READY_FOR_EXECUTION
active_window: "Issue #019 S1 — Holm v0.207 route-registry ingestion and drift gate"
active_issue: "019"
orchestration_mode: "direct; strict TDD; serial main"
stop_gate: "commit S1, update Issue #019 and STATE, then /close before S2"
---

# Koder State

## Current

- The owner activated [Issue `#019`](issues/019_holm_route_registry_refresh/INDEX.md)
  to replace the SDK's frozen Holm route-authority link with consumption of
  Holm's released `holm.route-registry.v1` export.
- Local signed Holm is `v0.207.0`; `holm api routes --format json` reports exact
  release commit `d66628674232b01e8c95d5b86617bc660d61410f` and `261` routes
  (`151` admin/operator, `93` app-facing, `17` system/public).
- The existing SDK admin ledger remains pinned to Holm commit `3d229a41`, with
  `189` route/method contracts and `216` generated methods. All `189/189`
  contracts still exist in the new export; `21` admin/operator rows are not yet
  classified by the SDK.
- SDK `main` is clean and synchronized. No queue, blind run, release, or
  publication is active.
- `@zyt` is irrelevant to this work and remains pinned to Holm `v0.206.0` for
  its census soak. Do not contact or mutate it from the SDK refresh.

## Next session — S1 only

1. Open this SDK repository and read only Issue `#019` plus the source/tests it
   names.
2. Execute S1 with strict RED → GREEN → refactor: checked-in `v0.207.0` route
   snapshot, fail-closed validator, deterministic write/offline-check/live-check
   tool, focused tests, and CI wiring.
3. Do not change public SDK source, generated admin methods, `dist/`, route
   dispositions, package version, or release state.
4. Run focused proof and full `npm run ci`; commit S1 and update Issue `#019`.
5. `/close` immediately after the clean S1 handoff. Reopen fresh for S2 route
   dispositions; do not roll directly into the 21-route policy audit.

## Later

- **S2:** classify the complete Holm registry delta against the SDK, beginning
  with the 21 unclassified admin/operator rows.
- **S3:** implement only reviewed stable parity additions under strict TDD and
  regenerate tracked package artifacts.
- **S4:** map non-HTTP parity separately: authenticated WebSocket protocol,
  Sobek `holm.*` namespaces, Node capabilities, and action/schema authority.
- Any npm publication, SDK release, deploy, Holm edit, or production mutation
  requires separate explicit owner approval.

## Prior stable baseline

- `@holmhq/sdk@0.2.1` is the current public immutable release.
- Full release validation was green before this activation: source/dist tests,
  reproducibility, package smoke, coverage, licenses, and size gates.
- Medialab adoption and the unrelated Holm `#550` runtime-pool research track
  remain historical context, not dependencies of Issue `#019`.
