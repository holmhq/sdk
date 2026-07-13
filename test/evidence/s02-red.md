# S02 red evidence

- `npm run test:declarations` exited `2` before generated declarations existed.
  - Short failure: `Cannot find module '@holmhq/sdk' or its corresponding type declarations.`
- `npm run test:dist` exited `1` before generated ESM existed.
  - Short failure: `ERR_MODULE_NOT_FOUND ... /dist/index.js`.
