# S05 red-test evidence

Command: `npm run test:source -- --test-name-pattern=bridge`

Outcome: failed before implementation as expected. TypeScript could not resolve `../../../src/bridge/index.js` from `test/source/bridge/bridge.test.ts`, proving the new reserved bridge API and mock/mailbox contracts were not implemented yet.
