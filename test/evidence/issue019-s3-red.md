# Issue 019 S3 RED evidence

Date: 2026-08-16

## Public source and type contracts absent

Commands:

```text
npm run test:source -- "admin retention methods"
npm run test:types
```

Both commands failed before implementation. TypeScript reported that
`AdminDBRetentionStatus` and `AdminDBRetentionReport` were not exported,
`system.dbRetentionStatus` and `system.dbRetentionRun` did not exist, the raw
invoke union rejected `system.dbRetentionRun`, and `AdminMethodDescriptor` had
no body policy. These failures prove the accepted methods, response types, and
fail-before-runtime dry-run request guard were absent.

A later type refinement reran `npm run test:types` after adding a low-level
`admin.invoke("system.dbRetentionRun", ...)` negative fixture. It failed with an
unused `@ts-expect-error`, proving the generic invoke signature still exposed a
retention body even though the generated method did not. The implementation
then narrowed both public call paths.

## S3 disposition promotion absent

Command:

```text
npm run test:holm-route-dispositions
```

Expected RED result: exit `1`, with 3 focused failures. The live composition
still resolved `185 current / 2 s3-candidate / 74 none`, had no
`sdk#019/S3` promotions, and did not enforce promoted contract authority. The
S3 tests require exactly the two accepted stable retention identities to move
to current while the other 19 admin-delta rows remain deferred.

## Tracked declarations and ESM absent

Commands:

```text
npm run test:dist
npm run test:declarations
```

`test:dist` failed because the tracked ESM admin namespace had no
`dbRetentionStatus()` function. Declaration-consumer compilation failed because
the tracked package exported neither retention response type nor generated
method. This proves generated JavaScript/declarations must be regenerated in the
same S3 implementation rather than passing from source alone.
