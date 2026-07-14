---
title: Issue 005 Upload Seam Migration Ledger
status: implemented
queue: 001_a2_core_foundation
entry: S12
source_commit: 11ceae0d88e9c800eb77916e3244fbd231ad81bb
updated: 2026-07-14
---

# Issue 005 Upload Seam Migration Ledger

Scope: secret-safe conformance ledger for the upload behavior adopted in S12.
Holm source is read-only and pinned to commit
`11ceae0d88e9c800eb77916e3244fbd231ad81bb`.

## Source evidence

- `packages/holm-sdk/client.js` defines the current upload seam:
  resumable session probe at `/api/uploads`, chunk `PUT`, status `GET`,
  complete `POST`, acknowledged progress, abort propagation, legacy multipart
  fallback, and final `__holm_uploads` handoff.
- `packages/holm-sdk/types.js` documents `UploadOptions.onProgress` as
  server-acknowledged `{ loaded, total, percent }` progress and `signal` abort.
- `packages/holm-sdk/test.js` covers bearer auth on uploads, resumable progress
  with resume, abort, unavailable fallback, and custom-adapter passthrough.

## Classification

| Behavior | Classification | SDK S12 proof |
| --- | --- | --- |
| Resumable session/chunk/status/complete flow | adopted: resumable upload sessions | `test/source/transport/upload.test.ts` exercises session creation, chunk resume, completion handoff, and finalization. |
| Server-acknowledged progress | adopted: acknowledged upload progress | Source test asserts `loaded` and `percent` from acknowledged offsets, not local optimistic byte writes. |
| Abort signal propagation | adopted: abort maps to typed cancellation | Source test cancels during chunk upload and expects `CancelledError` without completion. |
| Binary upload body handling | redesigned: structural binary source seam | Core transport uses `UploadSource`/`UploadChunk` with byte counts and no DOM/Node ambient types; web and Node helpers adapt structurally. |
| Diagnostics for upload data | redesigned: secret-safe upload diagnostics | Redacted diagnostics include path, field names, file metadata, and byte counts only; field values and binary payload bytes are omitted. |
| DOM and XMLHttpRequest progress | redesigned: DOM and XMLHttpRequest progress stays adapter-owned | `src/web/upload.ts` exposes structural blob helpers; core never references `Blob`, `FormData`, `XMLHttpRequest`, or native `AbortSignal` types. |
| Custom adapter passthrough | adopted as adapter seam | `ResumableUploadAdapter.finalize` owns final handoff transport, preserving runtime-specific form/body choices outside core. |
| Legacy multipart fallback | deferred to runtime adapters | The core seam reports `upload_unavailable`; web/app wrappers can choose multipart fallback in later app/admin migration slices. |
| App/admin wrapper route migration | deferred: app/admin wrapper route migration | Issue `#007`/`#008` own route wrappers such as member pictures, deploy upload, link import, and app upload helpers. |

## Safety notes

- No bearer tokens, cookies, request bodies, file contents, private payloads, or
  full Holm source excerpts are recorded here.
- Existing Holm `packages/holm-sdk` remains live and unmodified.
- npm publication, release tags, deploys, and Issue `#007+` work remain outside
  S12.
