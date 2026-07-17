# S06 red-test evidence

Command: `npm run test:examples`

Outcome: failed before implementation as expected with exit 1. The new local
integrity/offline gate rejected the existing docs because they did not yet use
the required immutable Git SHA or reviewed tag wording, before the vendored
BFBB fixture and tamper checks were implemented.
