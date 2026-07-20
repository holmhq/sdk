---
status: approved
priority: P1
created: 2026-07-20
review_kind: independent_sdk_review
issue: 018
sdk_head: 6fca6cadf7a8c0bfbe62b92505a760a312d65eba
holm_authority: 4d84c6b285c43a4bb97974179fff2fc7ccbf05d9
verdict: APPROVE
p1: 0
p2: 0
p3: 0
reviewer: codex
harnex_session: cx-cr-066
---

# Review: Issue 018 Web Upload Fallback MIME

## Scope

Independent review of the uncommitted Issue 018 remediation for
`createWebUploadService()` multipart fallback MIME preservation.

Reviewed surfaces were limited to the brief's bounded scope:

- `koder/issues/018_web_upload_fallback_mime/INDEX.md`
- current git diff for the changed source, generated ESM, tests, and manifest
- `src/web/upload-service.ts`
- `test/source/web/upload-service.test.ts`
- `test/dist/index.test.mjs`
- `dist/web/upload-service.js`
- affected `dist/manifest.json` entries
- Holm `internal/runtime/handler.go` multipart file parsing at the pinned
  authority commit
- `src/web/upload.ts` chunk slicing behavior

I did not run tests, builds, installs, package smokes, release checks, or any
deployment/publish/tag/push action. I did not inspect Zyt, Medialab source,
source maps, full generated reports, node_modules, secrets, or unrelated source.

## Evidence Reviewed

Preflight matched the requested review boundary:

- working directory: `/home/glasscube/Projects/holmhq/sdk`
- branch: `main`
- upstream drift: `0 0`
- dirty/untracked SDK paths were scoped to Issue 018:
  `src/web/upload-service.ts`, `test/source/web/upload-service.test.ts`,
  `test/dist/index.test.mjs`, `dist/web/upload-service.js`,
  `dist/web/upload-service.js.map`, `dist/manifest.json`,
  `dist/size-report.json`, and
  `koder/issues/018_web_upload_fallback_mime/INDEX.md`

The code change is narrowly targeted. The fallback path still validates web
upload files before attempting resumable upload, still falls back only when
`composeResumableUpload()` throws `UploadError` with `upload_unavailable`, and
still sends the same multipart fields, progress events, cancellation checks, and
final request shape. The only behavioral change is the multipart fallback file
part: after obtaining the full file slice, it converts the already Blob-backed
body into a new Blob with `blob.slice(0, blob.size, file.type)` before appending
it to `FormData`.

`src/web/upload.ts` still slices all web upload chunks with
`"application/octet-stream"`, so resumable chunk request bodies remain
octet-stream. `src/web/upload-service.ts` still sends chunk uploads with
`contentType: "application/octet-stream"`.

The source fallback test now observes the public multipart result by reading the
submitted `FormData` file and asserting filename, size, progress, fallback
request order, and `fileType: "text/plain"`. The generated ESM test forces the
same 404 resumable-unavailable fallback and asserts the generated artifact
uploads a `photo.jpg` Blob/File with `type === "image/jpeg"` and size `4`.

The generated ESM implementation matches the source behavior: the fallback uses
`webMultipartFileBlob(chunk.body, file.type)`, and that helper delegates to the
same Blob structural guard before retagging with `slice(0, blob.size, type)`.
The affected manifest entries for `dist/web/upload-service.js` and its map were
updated. No declaration output is expected for this internal helper-only change.

## Findings

### P1

None.

### P2

None.

### P3

None.

## Authority Check

Pinned Holm authority
`4d84c6b285c43a4bb97974179fff2fc7ccbf05d9` reads multipart file type from each
part's `Content-Type` header, defaults only an absent header to
`application/octet-stream`, stores bytes with that content type, and exposes
`FileUpload.Type` from the same value.

The local Holm checkout had advanced to
`9fbc0b418674d39dfa6f6b98dd2a73155ff9c523` during this review. I checked the
same `parseMultipartFiles` block there as well; the content-type behavior
relevant to this review is unchanged. No Holm edit is required.

## Gate Evidence

I did not rerun implementation gates. The brief records the following prior
evidence, which I treated as existing gate evidence rather than commands run by
this reviewer:

- source red test exposed fallback `text/plain` becoming
  `application/octet-stream`
- generated-dist red test exposed fallback `image/jpeg` becoming
  `application/octet-stream`
- targeted source and dist tests passed after the fix
- fixed generated SDK x Medialab fallback smoke produced `upload.jpg`,
  `image/jpeg`, `4` bytes, with fields intact
- full `npm run ci` passed with 230 source tests and 25 dist tests
- package smoke and size checks passed with the metrics recorded in the brief
- live Holm authority was verified read-only at the pinned commit

Review-local validation after writing this artifact:

- `test -f koder/reviews/066_issue018_web_upload_fallback_mime/INDEX.md`: pass
- `grep -Eq '^status: (approved|changes_requested)$' ...`: pass
- `grep -q 'P1' ...`: pass
- `git status --short --untracked-files=all`: pass, with only prior Issue 018
  dirty paths plus this review artifact
- `git diff --check`: pass

## Verdict

APPROVE. The remediation restores the normalized declared MIME type for the
supported multipart fallback while preserving exact file bytes, filename,
fields, progress, cancellation, auth/request behavior, fallback semantics, and
resumable chunk octet-stream behavior. It is consistent with the pinned Holm
multipart runtime authority and has no unresolved P1, P2, or P3 findings.
