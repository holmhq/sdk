# S03 red evidence

Before S03 added reproducibility, license, size, coverage, and CI scripts, the
expected gates failed because the package scripts did not exist:

- `npm run ci` exited `1`.
  - Short failure: `Missing script: "ci"`.
- `npm run check:repro` exited `1`.
  - Short failure: `Missing script: "check:repro"`.
- `npm run check:licenses` exited `1`.
  - Short failure: `Missing script: "check:licenses"`.
- `npm run size` exited `1`.
  - Short failure: `Missing script: "size"`.

This establishes the failing repro/diff, license, size, and coverage/CI
expectations before the S03 implementation turned them green.
