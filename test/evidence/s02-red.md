# S02 red evidence

- `npm run test:types` exited `2` after adding preview/reserved support-label assertions and before implementation.
  - Short failure: `Module '"../../src/bridge/index.js"' has no exported member 'bridgeRuntimeSupport'.`
  - Short failure: `Module '"../../src/sobek/index.js"' has no exported member 'sobekRuntimeSupport'.`
- `npm run test:examples` exited `1` after adding docs/example support-label assertions and before docs updates.
  - Short failure: `Examples README must label preview/reserved imports honestly; missing @holmhq/sdk/node.`
