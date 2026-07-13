---
title: SDK Cross-repository Project Registry
updated: 2026-07-13
---

# Project Registry

`koder/projects/` tracks repositories that own, consume, constrain, or distribute
SDK contracts. It is named **projects**, not `dependencies`, because several
relationships are authorities, extraction sources, consumers, or adjacent
distribution systems rather than package/runtime dependencies.

Each numbered folder is a stable project card:

```text
koder/projects/NNN_name/INDEX.md
```

Numbers are registry identities, not priority or dependency order. A card should
stay compact and record:

- role and relationship to this SDK;
- canonical local path and remote;
- normal branch and a last-verified commit;
- contract surfaces relevant to the SDK;
- read/write policy for agents in this repo;
- drift or integration checkpoints.

Project cards route agents to source. They do not duplicate another repository's
`STATE.md`, issues, or implementation history. Verify live Git/source whenever a
card is older than the fact being relied upon.

## Registry

| ID | Project | Role | Write policy from SDK work |
| ---: | --- | --- | --- |
| `001` | [Holm](001_holm/INDEX.md) | Runtime/protocol/action-state authority | Read-only unless explicitly approved |
| `002` | [SDK](002_sdk/INDEX.md) | Current repository and portable client implementation | Primary write target |
| `003` | [Sobek](003_sobek/INDEX.md) | Embedded JS engine underlying Holm server/Sobek behavior | Read-only; file/coordinate engine work separately |
| `004` | [CDN](004_cdn/INDEX.md) | Adjacent first-party browser-library distribution project | Read-only; SDK ships from its own repo |

Add a card when a repository gains a durable SDK relationship. Do not add every
repo that is merely mentioned in research.
