---
tags: [cursor-agent, context-anchor, smite2app]
vault-zone: cursor-agent
---

# 00 — Read first (mandatory order)

Every **implementation** session — read in this order before writing code.

## 1. Session context

| If `Vault/` exists | If no vault (fresh clone) |
|--------------------|---------------------------|
| [[../Cursor agents Index\|Cursor agents Index]] | `docs/cursor-agents/index.md` |
| `Vault/decisions-log.md` | `Vault/decisions-log.md` (skip if missing) |
| `BUGS.md` → `TASKS.md` → `GOALS.md` | Same repo root files |

## 2. Communication (all sessions)

→ [[stress-test|Stress-test]] — challenge before affirm; no glazing (`.cursor/rules/stress-test.mdc`)

## 3. Thinking (all code)

→ [[karpathy|Karpathy guidelines]]

## 4. UI / forms / modals / copy

→ [[smite2-design|SMITE2 DESIGN.md]] (repo: `docs/SMITE2_DESIGN.md`)  
→ [[open-design|Open Design token layers]]  
→ `GOALS.md` → UI consistency  
→ `app/data.jsx` — `kitAbilityTooltipCard` tokens  
→ [[reuse-ui-patterns|Reuse UI patterns]] — **grep repo before new dropdown/modal/tooltip**  
→ [[uiux-pro-max|UI/UX Pro Max]] — style/color reference only; does not override SMITE2 DESIGN

## 5. New visual patterns

→ [[voltagent-design-md|DESIGN.md spec structure]]  
→ [[tailwind-thinking-for-rn|Tailwind thinking for RN]] (composition, not CSS framework)

## 6. Prose & marketing (when relevant)

→ [[stop-slop|Stop Slop]] — user-facing copy  
→ [[marketing-skills|Marketing skills]] — `marketing/` folder (44 local skills) + `product-marketing.md`

## 7. Architecture & council

→ [[smite2app-architecture|Smite 2 app architecture]]  
→ [[council-and-chair|Council & chair]] (product verdicts; members use stress-test lens)

## 8. Plan mode or multi-step work

→ `.cursor/rules/plan.mdc` in the repo

## 9. After significant tasks

- Session note → `sessions/[date]-[task].md` (`#session-log`)
- Update `context-snapshot.md` if decisions affect future sessions

> [!vault-cursor-agent] Rules
> Cursor always applies `.cursor/rules/agent-knowledge.mdc` + `stress-test.mdc` + `smite2app-project.mdc` + `agent-workflow.mdc`. This note is the vault mirror.
