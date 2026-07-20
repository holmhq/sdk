# Capability matrix

This matrix describes `@holmhq/sdk` `0.2.0`, not Holm's entire platform. A
stable lower-level primitive does not imply that every higher-level product
surface is shipped.

Legend: **stable** is covered by the `0.1.x` compatibility promise; **preview**
is shipped and tested but may change; **reserved** is a contract/probe only;
**unavailable** means do not build production expectations around it.

## Runtime and surface matrix

| Capability | Web / BFBB | Node / CLI | Sobek / server | Test | Desktop / mobile |
| --- | --- | --- | --- | --- | --- |
| Core capability/lifecycle contracts | stable | stable core | stable core | stable | reserved lower contract |
| Caller identity and partitioning | stable browser session | preview operator/service | preview injected caller | stable deterministic callers | reserved surface-specific caller |
| App HTTP and auth | stable through `createWebApp()` | lower adapter only; no stable convenience app | lower adapter only; preview | stable through fakes | unavailable |
| Transport requests and responses | stable | preview adapter | preview adapter | stable | reserved service slot |
| Query, mutation, and derived resources | stable | stable runtime-neutral API | stable runtime-neutral API | stable | usable only when a future adapter exists |
| Upload composition | stable | preview | unavailable | stable seams | unavailable |
| BFBB vendored ESM | stable | not applicable | not applicable | integrity-tested | possible future consumer |
| Diagnostics, errors, cancellation | stable | stable core | stable core | stable | reserved lower contract |

## Product capability status

| Product capability | Status | What `0.2.0` provides |
| --- | --- | --- |
| Web app client | stable | Typed auth, HTTP, links, pagination, uploads, surfaces, cache invalidation, and `createWebApp()`. |
| Framework-neutral state | stable | Immutable snapshots, subscriptions, query/mutation/derived resources, history, and reconcile hooks. |
| Vanilla UI | stable example | Direct subscription example plus the production Sokoban pilot. |
| React UI | stable example | A typed `useSyncExternalStore` adapter over the same model; this is an example, not a framework package. |
| Admin client | preview | `createAdminClient()`, 216 generated typed methods over 189 audited route/method contracts, explicit operator caller gating, command/upload/binary seams, and deterministic drift checks. The legacy Holm package remains live. |
| Generated actions/CLI | unavailable | Holm does not yet expose the stable registry needed for generated action helpers. |
| Realtime transport | unavailable | A public reconcile seam exists, but no authenticated production subscription transport ships here. |
| Collaboration/CRDT | unavailable | No oplog/provider package and no mandatory CRDT engine. |
| Framework bindings | unavailable | No `@holmhq/sdk/react`, Angular, Svelte, or Vue package; frameworks can adapt the stable Resource contract. |
| Production desktop/mobile | unavailable | Bridge exports are reserved mailbox mocks, not native runtimes. |
| Arbitrary SSR | unavailable | Sobek is a bounded preview adapter, not a promise that arbitrary framework servers run on Holm. |

## Choosing an entry point

- Start web apps with `@holmhq/sdk/web`.
- Add `@holmhq/sdk/state` when UI state should follow server data through
  immutable snapshots.
- Use `@holmhq/sdk/test` for deterministic adapter and lifecycle tests.
- Import `core`, `transports`, or `app` directly when building a custom runtime
  composition.
- Adopt `node` or `sobek` only when preview churn is acceptable.
- Do not use `bridge` as evidence of production desktop/mobile support.

Stable, preview, reserved, and unavailable claims are also machine-checked in
the release documentation gate.
