---
status: resolved
priority: P1
created: 2026-07-20
updated: 2026-07-21
resolved: 2026-07-21
tags: web, upload, multipart, mime, fallback, medialab
type: bug
issue_kind: slice
context: Dogfooding @holmhq/sdk@0.2.0 in active Medialab proved that the web multipart fallback changes a declared image/jpeg file to application/octet-stream.
---

# Issue 018: Preserve MIME type in web multipart upload fallback

## Problem

A real-package Medialab migration smoke forced `createWebUploadService()` from
resumable upload into its supported multipart fallback. The input used
`createWebUploadFile({ type: "image/jpeg", ... })`, but the resulting multipart
`File.type` was `application/octet-stream`.

The resumable chunk path deliberately slices blobs as
`application/octet-stream`. The fallback currently reuses that chunk blob as
the multipart file part, so it loses the normalized public `UploadFile.type`.
This is externally visible and can alter application storage and downstream API
behavior. Medialab's `/api/edit` path uses `request.files.file.type` when
storing the reference and selecting the downstream image content type.

## Authority evidence

- SDK release reproduced: public `@holmhq/sdk@0.2.0`.
- SDK source: `src/web/upload-service.ts` multipart fallback and
  `src/web/upload.ts` chunk slicing.
- Fresh accepted Holm authority: `9fbc0b418674d39dfa6f6b98dd2a73155ff9c523`
  in Review `#067`; relevant upload/runtime paths were unchanged from the
  initial `4d84c6b285c43a4bb97974179fff2fc7ccbf05d9` reproduction baseline.
- Holm `internal/runtime/handler.go` derives runtime `FileUpload.Type` from the
  multipart part's `Content-Type`, defaulting to `application/octet-stream`
  only when absent.
- Holm's resumable handoff separately carries the declared descriptor type;
  this issue changes no Holm protocol and requires no Holm edit.

## Required behavior

- Resumable chunk request bodies remain `application/octet-stream`.
- Multipart fallback file parts use the normalized `UploadFile.type`.
- Filename, bytes, fields, progress, cancellation, auth, and fallback status
  behavior remain unchanged.
- Browser structural blob validation remains fail-closed.

## Acceptance criteria

- [x] A source test fails on current code by observing `text/plain` input become
      `application/octet-stream` in the multipart fallback.
- [x] The fallback multipart `File.type` equals the declared file type.
- [x] Existing resumable chunk tests still prove octet-stream chunks.
- [x] Generated ESM passes an equivalent dist smoke.
- [x] Affected JavaScript, maps, manifest, and size report are regenerated;
      public declarations are unchanged because the fix is internal.
- [x] Targeted tests, full `npm run ci`, reproducibility, package, size, and
      `npm run release:check` pass.
- [x] Independent Review `#066` approves with `P1=0 P2=0 P3=0`.
- [x] The Medialab fixed-generated-artifact upload fallback smoke passes before
      any release or deployment decision.
- [x] Fresh read-only Holm Review `#067` accepts with `P1=0 P2=0 P3=0`.

## Resolved outcome

- Multipart fallback now retags only the complete Blob file part with the
  normalized `UploadFile.type`; bytes, name, fields, progress, cancellation,
  auth, origin checks, and fallback control flow are unchanged.
- Resumable chunks remain `application/octet-stream`, while resumable session
  and handoff MIME continue to use the declared file type.
- Full validation passes with 230 source tests, 25 dist tests, 267 reproducible
  artifacts, package smoke over 290 files (`213123` packed / `1300444`
  unpacked bytes), and `100.00` changed-reachable coverage. Normal release
  check plus FORCE_COLOR, TAP, and TAP+color CI are green; aggregate branch
  coverage remained above gate at `95.29`–`95.31`.
- Size remains green at `296327` raw / `226159` minified / `58504` gzip bytes.
- No package version, release, publication, tag, push, or deployment occurred.
  Medialab must wait for a separately approved new SDK release before replacing
  its public `0.2.0` dependency in production.

## Boundaries

- Do not edit Holm or Medialab backend behavior.
- Do not weaken upload preflight, origin, caller, auth, or cancellation checks.
- Do not publish, tag, push, release, or deploy without explicit owner approval.
