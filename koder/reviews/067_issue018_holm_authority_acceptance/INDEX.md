---
status: accepted
priority: P1
created: 2026-07-20
review_kind: holm_authority_acceptance
issue: 018
sdk_head: 6fca6cadf7a8c0bfbe62b92505a760a312d65eba
holm_head: 9fbc0b418674d39dfa6f6b98dd2a73155ff9c523
verdict: ACCEPT
p1: 0
p2: 0
p3: 0
reviewer: codex
harnex_session: cx-cr-067
---

# Review: Issue 018 Holm Authority Acceptance

## Scope

This is a fresh read-only Holm-authority acceptance review for the uncommitted
Issue 018 multipart fallback MIME remediation in the SDK.

Reviewed surfaces were bounded to the brief:

- SDK `koder/docs/HOLM_SOURCE_MAP.md`
- SDK `koder/issues/018_web_upload_fallback_mime/INDEX.md`
- SDK current Issue 018 diff as one surface
- SDK `src/web/upload-service.ts` upload paths
- Holm `internal/runtime/handler.go` multipart and handoff construction
- Holm `internal/uploads/http.go` create, chunk, and complete upload handlers
- Holm `internal/uploads/service.go` session and completed MIME fields
- Holm `internal/runtime/handler_test.go` multipart and handoff assertions
- SDK Review `koder/reviews/066_issue018_web_upload_fallback_mime/INDEX.md`

No SDK product code, tests, dist output, Issue 018 artifact, Review 066 artifact,
Holm source, Zyt source, remote state, tests, builds, installs, smokes, deploys,
pushes, tags, or releases were modified or run by this reviewer.

## Preflight

- SDK working tree: `main`, upstream drift `0 0`, head
  `6fca6cadf7a8c0bfbe62b92505a760a312d65eba`.
- SDK dirty paths before this artifact were limited to Issue 018 source, tests,
  generated outputs, Issue 018, and Review 066:
  `src/web/upload-service.ts`, `test/source/web/upload-service.test.ts`,
  `test/dist/index.test.mjs`, `dist/web/upload-service.js`,
  `dist/web/upload-service.js.map`, `dist/manifest.json`,
  `dist/size-report.json`, `koder/issues/018_web_upload_fallback_mime/INDEX.md`,
  and `koder/reviews/066_issue018_web_upload_fallback_mime/INDEX.md`.
- Holm working tree head:
  `9fbc0b418674d39dfa6f6b98dd2a73155ff9c523`.
- Holm relevant source status for `internal/runtime/handler.go`,
  `internal/uploads/http.go`, `internal/uploads/service.go`, and
  `internal/runtime/handler_test.go` was clean.
- Holm had unrelated `.harnex` dirt outside the reviewed source boundary; it was
  not edited, staged, restored, or investigated.
- Relevant Holm path diff from prior pinned
  `4d84c6b285c43a4bb97974179fff2fc7ccbf05d9` to current head produced no stat
  output for the reviewed paths, so the upload/runtime authority behavior
  reviewed here is unchanged from that prior pin.

## Exact Authority Evidence

### Direct multipart fallback

Holm `internal/runtime/handler.go` parses runtime multipart requests by calling
`r.ParseMultipartForm`, extracting ordinary form fields, then calling
`parseMultipartFiles`.

In `parseMultipartFiles`, Holm reads each multipart file part, takes
`fh.Header.Get("Content-Type")`, defaults only an absent content type to
`application/octet-stream`, stores the temporary bytes with that content type,
and constructs the runtime `FileUpload` with:

- `Name` from the multipart filename
- `Type` from the part `Content-Type` after the empty fallback
- `Size` from the bytes read
- `TempRef` from temporary upload storage

Holm tests cover this boundary: multipart file tests create a part with
`Content-Type: image/png` and assert `request.files.photo.type`/the runtime file
type remains `image/png`.

### Resumable upload

Holm `internal/uploads/http.go` accepts `mime_type` in the create-session JSON
payload and passes it to `CreateSessionRequest.MimeType`. Chunk upload reads raw
bytes from the request body with the session chunk-size limit; it does not derive
the final MIME from the chunk request `Content-Type`.

Holm `internal/uploads/service.go` stores `Session.MimeType` from the create
request, defaulting only an empty session MIME to `application/octet-stream`.
Completed uploads expose `MimeType` on `CompletedUpload`. Runtime handoff then
parses `__holm_uploads` descriptors in `internal/runtime/handler.go` and builds
`FileUpload.Type` from descriptor `type`, validating the temp ref, size, app,
and member ownership where the temp store is available.

Holm tests cover this handoff boundary: handoff descriptors with
`"type":"image/png"` and `"type":"text/plain"` become runtime files with those
types.

## SDK Mapping Evidence

The SDK remediation preserves the existing resumable behavior:

- `createSession` still sends `mime_type: file.type`.
- `uploadChunk` still sends the chunk body with
  `contentType: "application/octet-stream"`.
- The multipart fallback still validates Blob-backed web upload bodies before
  fallback and still sends the same fields, path, filename, bytes, progress, and
  cancellation shape.

The only reviewed behavioral change is in the multipart fallback. It obtains the
full file slice, structurally validates the Blob-backed body through the
existing `webChunkBlob` guard, then appends a Blob produced by
`blob.slice(0, blob.size, file.type)`.

That retags the browser multipart part to the normalized public `UploadFile.type`
without changing bytes, filename, field name, request path, auth, cancellation,
or fallback control flow.

## Semantic Mapping Table

| Path | SDK sends | Holm authority derives | Acceptance |
| --- | --- | --- | --- |
| Multipart fallback file part | Blob bytes from the full file slice, filename, and Blob `type` retagged to `UploadFile.type` | `request.files.<field>.type` from the multipart part `Content-Type`, empty only defaulting to octet-stream | Correct; fallback now maps SDK declared type to Holm runtime file descriptor type |
| Resumable create | `name`, `mime_type: file.type`, `size_bytes`, `purpose` | `Session.MimeType` from create payload, empty only defaulting to octet-stream | Correct; declared type remains the session/completion authority |
| Resumable chunk | Blob chunk body with `Content-Type: application/octet-stream` | Raw chunk bytes only; final completed MIME is not derived from chunk request header | Correct; chunk octet-stream behavior remains unchanged |
| Runtime handoff | `__holm_uploads` completion descriptors | `FileUpload.Type` from descriptor `type` after temp ref, size, app, and member checks | Correct; resumable and fallback align at `FileUpload.Type` |

## Findings

### P1

None.

### P2

None.

### P3

None.

## Security Boundary

This SDK change does not claim MIME validation, content sniffing, authorization,
or trust in file bytes. It only preserves the caller-declared, SDK-normalized
MIME string at the transport boundary that Holm already exposes as runtime file
metadata.

Holm continues to own authorization, upload-size limits, temporary storage,
member/app checks, temp-ref validation, and runtime descriptor construction. The
SDK change does not weaken those checks and does not require the runtime to trust
the multipart MIME beyond its existing metadata semantics.

## Review-Only Evidence Versus Implementation Evidence

Commands run by this reviewer were observational only: `git rev-parse`,
`git status`, `git rev-list`, bounded file reads, bounded `rg` source searches,
and the narrow Holm relevant-path diff from `4d84c6b...` to current head.

The implementation and Review 066 record prior test/build/smoke evidence, but
this reviewer did not rerun or extend those gates.

## No-Holm-Edit Conclusion

No Holm change and no protocol version change are required. Current live Holm
already defines the necessary authority:

- direct multipart `FileUpload.Type` comes from the part `Content-Type`;
- resumable MIME comes from create-session/completion/handoff metadata;
- chunk request bodies may remain `application/octet-stream`.

Retagging only the full multipart fallback Blob to `UploadFile.type` is the
correct SDK-side mapping.

## Verdict

ACCEPT. The Issue 018 remediation conforms to current live Holm upload/runtime
authority at `9fbc0b418674d39dfa6f6b98dd2a73155ff9c523`. Fallback and resumable
paths are now semantically aligned at Holm's runtime file descriptor boundary,
with P1=0, P2=0, and P3=0.
