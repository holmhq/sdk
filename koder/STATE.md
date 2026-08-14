---
updated_at: "15 Aug 2026 | 12:43 AM IST"
state: REVIEW_READY
active_window: "Issue #019 S1 checkpoint — Holm v0.207 route-registry ingestion"
active_issue: "019"
orchestration_mode: "direct; serial main; no queue"
stop_gate: "fresh-session review of S1 commit de5530a and read-only Holm live check before activating S2"
---

# Koder State

## Current

- Issue [`#019`](issues/019_holm_route_registry_refresh/INDEX.md) S1 is complete
  in commit `de5530a`; S2 was not started.
- The SDK now checks in the canonical 261-row `holm.route-registry.v1` success
  envelope from signed Holm `v0.207.0`, exact release commit
  `d66628674232b01e8c95d5b86617bc660d61410f` and SHA-256
  `4cd21d8e6f288e2c0d9cfe6ec17a96b71072bf152e52407435c3d0f1c25cdba1`.
- `scripts/refresh-holm-route-registry.mjs` provides deterministic argv-safe
  write, network-free offline check, and explicit live-drift modes. Normal CI
  runs only the offline check.
- Holm's authoritative row identity is
  `method + path + source_group + lane`. The snapshot preserves both valid
  `POST /api/spaces/{space}/keys` lanes; auth scope, surface class, and stability
  remain non-identity attributes.
- Strict RED and composite-identity refinement RED are recorded. Focused tests
  pass 18/18, source tests pass 230/230, full `npm run ci` is green, and the
  explicit live check matches signed Holm `v0.207.0` byte-for-byte.
- No public SDK source, generated admin API, `dist/`, route disposition, package
  version, release state, Holm source, or Medialab state changed.
- No queue, blind run, release, publication, deployment, or cross-repository
  write is active.

## Next session — review checkpoint only

1. Open this SDK repository and review commit `de5530a`, especially fail-closed
   validation, composite identity use, offline CI isolation, and drift output.
2. Re-run the offline gate and a fresh read-only live check against signed Holm:
   `node scripts/refresh-holm-route-registry.mjs --check` and
   `node scripts/refresh-holm-route-registry.mjs --check-live --holm-bin "$(command -v holm)"`.
3. If the S1 checkpoint is accepted, explicitly activate S2 in a fresh session.
   Do not mix review remediation with the 21-route policy audit.

## Later

- **S2:** classify the complete registry delta, beginning with the 21 currently
  unclassified admin/operator rows; do not generate methods from existence.
- **S3:** implement only reviewed stable parity additions under strict TDD and
  regenerate all affected tracked package artifacts.
- **S4:** map non-HTTP parity separately: authenticated WebSockets, Sobek
  `holm.*` namespaces, Node capabilities, and action/schema authority.
- npm publication, SDK release, deployment, Holm edits, and Medialab writes
  require separate explicit owner approval.

## Stable baseline

- `@holmhq/sdk@0.2.1` remains the current public immutable release.
- The existing admin ledger remains at Holm `3d229a41`: 189 route/method
  contracts, 216 generated methods, and 21 new admin/operator rows awaiting S2.
