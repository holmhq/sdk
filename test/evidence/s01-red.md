# S01 red evidence

Captured before adding `src/core/index.ts`.

- `npm run typecheck:core` exited `2` with `TS2307: Cannot find module '../../src/core/index.js'` from `test/types/core-ambient-boundary.test.ts`.
- `npm run test:source` exited `1` with `TS2307: Cannot find module '../../../src/core/index.js'` from `test/source/core/index.test.ts`.

Dev dependency license rationale: `typescript` is Apache-2.0 and `@types/node` plus `undici-types` are MIT; all are MIT-compatible local development dependencies. `package.json` remains private and unpublished.
