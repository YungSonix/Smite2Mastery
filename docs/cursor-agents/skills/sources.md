---
tags: [cursor-agent, context-anchor]
vault-zone: cursor-agent
last_reviewed: 2026-06-10
---

# Upstream sources — knowledge index

Curated distillations live in this folder. **Do not clone full upstream repos** into Willow.

| Skill | Upstream repo | License | Willow file |
|-------|---------------|---------|-------------|
| [[karpathy]] | [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | MIT | All code discipline |
| [[open-design]] | [nexu-io/open-design](https://github.com/nexu-io/open-design) | MIT | Token layers → `tokens.ts` |
| [[voltagent-design-md]] | [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | MIT | DESIGN.md structure |
| | [google-labs-code/design.md](https://github.com/google-labs-code/design.md) | Apache-2.0 | YAML + section spec |
| [[tailwind-thinking-for-rn]] | [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) | MIT | RN composition mental model |
| [[smite2-design]] | Hand-authored | — | `docs/SMITE2_DESIGN.md` |
| [[stress-test]] | User-defined | — | `.cursor/rules/stress-test.mdc` |
| [[stop-slop]] | [atanu80/Stopslopskill](https://github.com/atanu80/Stopslopskill) | MIT | `stop-slop/` full mirror |
| [[marketing-skills]] | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | MIT | `marketing/` 44 skills + `product-marketing.md` |
| [[uiux-pro-max]] | [yuanfu8899/uiuxskillProMax](https://github.com/yuanfu8899/uiuxskillProMax) | — | `uiux-pro-max/` style + palette indexes |

Refresh all three: `npm run skills:import`

## Smite 2 Companion

Distilled skills live in **`docs/cursor-agents/skills/`** (git) and mirror to **`Vault/3-Resources/Cursor agents/skills/`** on `npm run vault:sync`. Agents read via **`.cursor/rules/agent-knowledge.mdc`**.

## Refresh workflow

1. Review upstream README/SKILL changes (manual or `npm run vault:knowledge:refresh` if added)
2. Update skill note in `docs/cursor-agents/skills/`
3. `npm run vault:sync` → vault mirror
4. Bump `last_reviewed` in frontmatter

## Related Willow docs (not upstream)

- `docs/UI_UX.md` — 16 UX principles
- `src/shared/theme/tokens.ts` — live tokens
- `.cursor/rules/agent-knowledge.mdc` — always-on read order
