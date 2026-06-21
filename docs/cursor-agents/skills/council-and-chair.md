---
tags: [cursor-agent, council, smite2app]
vault-zone: cursor-agent
last_reviewed: 2026-06-10
---

# Council & chair — product verdicts

**Council** decides *what* to build; **Cursor agents** decide *how* to implement (read [[00 Read first]] first).

## Vault

- Index: `Vault/3-Resources/Council/Council Index`
- Personalities, sessions, verdicts synced from `docs/council/`

## When to convene

- Cross-cutting product or architecture bets
- Conflicting goals in TASKS/GOALS
- User explicitly opens panel or runs `npm run council:go`

## Chair flow (sequential)

1. Panel topic → `docs/council/ui/pending-convene.json`
2. `npm run council:go` — Nala → London → Fasa one at a time
3. Verdict exported to vault sessions + RAG

## Rules

- `.cursor/rules/council.mdc` — chair protocol
- `.cursor/rules/stress-test.mdc` + `docs/council/identities/_shared-stress-test.md` — all members + Chair
- Do not parallelize member replies in production flow
- Council billing = Cursor Task subagents

## RAG context

`docs/council/council.config.json` → `ragPaths` at prepare time. Expand paths for more repo context; not live folder browse.

## Related

- [[smite2app-architecture]]
- Vault: [[../Cursor agents Index|Cursor agents]] vs Council Index — separate purposes
