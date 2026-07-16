---
status: resolved
priority: P1
created: 2026-07-13
updated: 2026-07-17
tags: runtimes, surfaces, web, cli, sobek, desktop, mobile
parent: 001
depends_on: [004, 005]
source_paths:
  - koder/proposals/001_universal_app_runtime/INDEX.md
  - koder/issues/486_universal_app_runtime_extraction_map/INDEX.md
  - /home/glasscube/Projects/holmhq/holm/master:koder/issues/534_contract_first_holm_apps/INDEX.md@55cd8213af9878f63432586a8a58c093b3aaa47a
type: design
issue_kind: track
context: Prove one capability core can cross several runtime boundaries without pretending future native shells already exist.
resolved: 2026-07-17
resolved_commit: f06d1c0ef8fd1fd2e1225ab4c60759d58a7a9c22
---

# Issue 009: Runtime and Surface Adapter Contracts

## Problem

Web HTTP is only one way a Holm operation may execute. CLI/Node may use remote
HTTP or a local process, server/Sobek may call an injected runtime, and future
native shells may use mailboxes. The SDK must support these without one giant
platform switch or unsafe shared mutable objects.

## Authority and compatibility boundary

- Approved SDK architecture decisions `D001`-`D015` remain binding, especially
  explicit runtime adapters, per-call caller context, copied `WireValue`
  boundaries, typed unsupported behavior, isolated package subpaths, and
  tracked generated artifacts.
- Live Holm authority for this issue is Holm Issue `#534` at commit
  `55cd8213af9878f63432586a8a58c093b3aaa47a` (`v0.185.0`), read via the
  read-only checkout `/home/glasscube/Projects/holmhq/holm/master`.
- Holm Issue `#534` supersedes `#486`: GET/POST routes from `api/main.js` are
  Holm's canonical app wire contract. Named operations and SDK convenience
  methods describe or adapt those routes; they do not define a competing app
  protocol.
- SDK `OperationRequest` remains an internal adapter envelope for capability,
  caller, serialization, cancellation, and lifecycle conformance. Production
  app invocation through HTTP, CLI projection, generated tools, and any local
  dispatcher must preserve Holm's canonical request/caller/validation/response
  and stable error semantics.
- In-process/Sobek optimization is allowed only as a semantics-preserving
  injected-runtime adapter. It must not require deployed server code to call
  itself over HTTP and must not bypass Holm authorization, approval,
  idempotency, validation, stable errors, or copied boundary rules.

## Scope

Implement and conformance-test:

- common runtime-adapter conformance plus a deterministic in-memory/test
  adapter;
- reconciliation of the already-shipped web Fetch adapter with common
  conformance and the `#534` GET/POST compatibility boundary, without
  rewriting Issue `#007`;
- Node/CLI adapter over fetch/token and explicitly injected environment and
  secure-store services;
- server/Sobek authoring/test adapter contract that wraps injected capabilities
  without making deployed server code call itself over HTTP;
- explicit caller/capability envelope propagation;
- serializable request/action/state messages and binary values;
- desktop mailbox and mobile native-bridge TypeScript interfaces plus mocks,
  clearly marked reserved/unsupported in production;
- lifecycle, connectivity, secure-storage, deep-link/navigation, and background
  capability slots without requiring every runtime to implement all slots.

## Acceptance Criteria

- [x] One conformance suite runs against web, Node/CLI, and in-memory adapters.
- [x] Server/Sobek contract is tested with an injected fake runtime and has no
      HTTP self-call requirement.
- [x] Desktop/mobile mocks prove message/snapshot boundaries and capability
      negotiation but cannot be mistaken for production runtimes.
- [x] Caller context differs safely across web member, CLI token/operator, and
      injected server contexts.
- [x] Missing runtime services produce typed unsupported-capability errors.
- [x] No adapter shares mutable resource objects across a native/mailbox
      boundary.
- [x] Core remains free of DOM/Node types; adapters own ambient APIs.
- [x] Bundle entry points do not pull all runtime implementations implicitly.
- [x] Public source changes own affected generated JavaScript, declarations,
      source maps, package smoke checks, reproducibility checks, and size gate
      evidence in the same logical implementation.
- [x] Final closeout includes read-only Holm-authority acceptance against Issue
      `#534` at a named commit and one independent SDK review reporting zero
      P1/P2 findings.

## Slice Ledger

| Slice | Status | Ref | Queue | Closure gate |
| --- | --- | --- | --- | --- |
| S01 adapter conformance + in-memory runtime | done | `koder/plans/003_S01_adapter_conformance_in_memory/INDEX.md` | q004 | Common conformance is red/green over in-memory and web fixture seams |
| S02 web runtime conformance reconciliation | done | `koder/plans/003_S02_web_runtime_conformance/INDEX.md` | q004 | Existing web adapter passes conformance without regressing Issue `#007` |
| S03 Node/CLI runtime services | done | `koder/plans/003_S03_node_cli_runtime_services/INDEX.md` | q004 | Node/CLI fetch/token/env/secure-store adapter passes conformance |
| S04 Sobek injected runtime contract | done | `koder/plans/003_S04_sobek_injected_runtime/INDEX.md` | q004 | Injected fake proves no HTTP self-call and preserves Holm semantics |
| S05 bridge mocks and service slots | done | `koder/plans/003_S05_bridge_mocks_service_slots/INDEX.md` | q004 | Desktop/mobile reserved mocks copy boundaries and fail closed in production |
| S06 package integration and authority gate | done | `koder/plans/003_S06_exports_dist_authority_gate/INDEX.md` | q004 | Exports/declarations/dist/examples/full validation, Holm acceptance, review green |

## Closeout Evidence

- S05 bridge mocks landed in `dc024bc` and were fixed in `c201804`; fresh
  rereview `q004-c03-e05-rereview-a01` approved `P1=0 P2=0 P3=0` after
  `koder/reviews/045_q004_s05_entry_review/INDEX.md` was resolved.
- S06 package/full-gate integration landed in product commit
  `f06d1c0ef8fd1fd2e1225ab4c60759d58a7a9c22` with normal, FORCE_COLOR, TAP,
  and TAP+color CI green and identical metrics `statements=98.01 lines=98.90
  functions=98.58 branches=95.50 changed_reachable=100.00`; clean build,
  `check:repro`, declarations, dist smoke, examples, license, size, and Holm
  smoke gate were green.
- Integrated SDK Review `#046`
  (`koder/reviews/046_issue009_integrated_sdk_review/INDEX.md`) approved the
  Issue `#009` product range with `P1=0 P2=0 P3=0` at review commit `e3deedf`.
- Fresh read-only Holm authority Review `#048`
  (`koder/reviews/048_issue009_holm_authority_acceptance/INDEX.md`) accepted
  the adapter boundary with `P1=0 P2=0 P3=0` against Holm
  `fb34d6b768f15f9bc596e0b82430e5c678fd2088` (`v0.185.0`).

## Non-Goals

- Building Holm desktop/mobile shells.
- Mobile offline database sync.
- Opening GUI windows from remote CLI operations.
- Defining surface UI rendering.
- Implementing Holm Issue `#534`, action discovery, generated CLI, Default
  Projection, Issue `#010`, or any production desktop/mobile runtime.
- Treating SDK `OperationRequest` as a public Holm app protocol or a second
  execution system beside canonical GET/POST routes.
