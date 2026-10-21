---
name: Holm
status: active
role: runtime-protocol-authority
updated: 2026-10-21
public_docs: https://holmhq.com/llms-full.txt
reviewed_version: 0.208.0
write_policy: explicit-approval-only
---

# Project 001: Holm

Holm owns runtime, protocol, authentication, storage and authorization semantics.
`@holmhq/sdk` consumes the public HTTP contracts without creating server truth.

## Contributor verification

- Use [Holm public documentation](https://holmhq.com/llms-full.txt) and versioned
  HTTP behaviour, supported by deterministic SDK fixtures.
- This repository is public. Never record Holm source paths, Holm commit IDs or
  Go identifiers. Holm maintainers keep the internal source map privately.
- Request a maintainer conformance verdict for uncertain behaviour; do not read
  private source or infer support from a version number.
- Existing Holm SDK/state packages remain live until a separately approved cutover.
- Missing runtime capabilities require a separately authorized Holm decision,
  not a client simulation of production support.

## Historical checkpoint

Evidence `#009` records the reviewed non-HTTP boundary around Holm `0.208.0`.
It does not promise production WebSocket, direct Sobek, action discovery or
native-runtime support in this SDK. Internal manifests and source hashes have
been removed from the public tree; maintainers retain verification privately.
